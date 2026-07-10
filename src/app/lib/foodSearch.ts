import { supabase } from "./supabase";
import { getPlaces } from "./places";
import { getFollowingIds } from "./profile";
import type { Place } from "../components/data";
import { FEATURES } from "./features";

// ============================================================
// Food discovery: rank places for a dish query ("أفضل كوكيز في
// الرياض") from Magsad-first signals — user reviews mentioning the
// dish (followed users and creators weigh more), public lists whose
// title/description mention it, saves as popularity, and the place's
// own name/tags — enriched by Google rating data as a quality prior.
// ============================================================

export type FoodSource = "توصيات مقصد" | "قوائم مقصد" | "بيانات قوقل";

export type FoodResult = {
  place: Place;
  term: string;                 // the dish term that matched
  score: number;                // 1..99 display score
  recommenders: number;         // distinct Magsad users recommending
  comments: { author: string; text: string; rating: number }[];
  reasons: string[];            // "why this place"
  sources: FoodSource[];
};

// --- Arabic-aware normalization -----------------------------------

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "") // diacritics + tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[,()"\\%]/g, " ") // PostgREST or()/ilike syntax chars
    .trim();
}

// Filler words stripped from queries: "أفضل كوكيز في الرياض" → "كوكيز"
const FILLER = new Set([
  "افضل", "احسن", "احلي", "اطيب", "الذ", "اجمل", "best", "top", "good",
  "في", "من", "الرياض", "رياض", "بالرياض", "مكان", "اماكن", "محل", "محلات",
]);

// Dish synonym groups — Arabic and English variants search as one.
const SYNONYMS: string[][] = [
  ["كوكيز", "كوكي", "cookie", "cookies"],
  ["بيتزا", "pizza"],
  ["برجر", "برقر", "همبرجر", "burger", "burgers"],
  ["قهوه", "قهوة", "كوفي", "coffee", "اسبريسو", "espresso"],
  ["ماتشا", "matcha"],
  ["كنافه", "كنافة", "kunafa", "knafeh", "kunafah"],
  ["تشيزكيك", "cheesecake", "تشيز كيك"],
  ["كرواسون", "كرسون", "croissant"],
  ["سوشي", "sushi"],
  ["شاورما", "shawarma"],
  ["دونات", "دوناتس", "donut", "donuts", "doughnut"],
  ["ايس كريم", "آيس كريم", "بوظه", "جيلاتو", "ice cream", "gelato"],
  ["فطور", "فطار", "breakfast"],
  ["كيك", "cake"],
  ["شوكولاته", "شوكولاتة", "شوكلت", "chocolate"],
  ["باستا", "معكرونه", "pasta"],
  ["ستيك", "steak"],
  ["مندي", "mandi"],
  ["كبسه", "كبسة", "kabsa"],
  ["وافل", "waffle"],
  ["بان كيك", "بانكيك", "pancake"],
  ["مشويات", "مشاوي", "grill", "bbq"],
];

// Extract the dish term from a free query and expand its variants.
export function expandFoodQuery(raw: string): { term: string; variants: string[] } {
  const words = normalize(raw).split(/\s+/).filter(w => w && !FILLER.has(w));
  const cleaned = words.join(" ");
  if (!cleaned) return { term: "", variants: [] };
  for (const group of SYNONYMS) {
    const normGroup = group.map(normalize);
    if (normGroup.some(g => cleaned.includes(g) || g.includes(cleaned))) {
      return { term: group[0], variants: [...new Set([...normGroup, cleaned])] };
    }
  }
  return { term: cleaned, variants: [cleaned] };
}

// --- Signal weights ------------------------------------------------

const W_REVIEW_FOLLOWED = 2.0; // a followed user's recommendation
const W_REVIEW_CREATOR = 1.5;  // a creator/influencer
const W_REVIEW_USER = 1.0;     // any Magsad user
const W_LIST = 0.6;            // place appears in a matching list
const W_NAME = 1.0;            // dish in the place's own name
const W_TAG = 0.5;             // dish in tags/category/description
const W_SAVE = 0.15;           // log-scaled saves (popularity)

type Candidate = {
  place: Place;
  reviewSignal: number;
  recommenders: Set<string>;
  comments: { author: string; text: string; rating: number }[];
  listTitles: string[];
  nameMatch: boolean;
  tagMatch: boolean;
  saves: number;
};

export async function searchFood(rawQuery: string, viewerId: string | null): Promise<{ term: string; results: FoodResult[] }> {
  const { term, variants } = expandFoodQuery(rawQuery);
  if (!term) return { term: "", results: [] };

  const [places, following] = await Promise.all([
    getPlaces(),
    viewerId ? getFollowingIds(viewerId).catch(() => new Set<string>()) : Promise.resolve(new Set<string>()),
  ]);

  // Magsad reviews mentioning the dish (with author standing)
  const reviewOr = variants.map(v => `comment.ilike.%${v}%`).join(",");
  const listOr = variants.flatMap(v => [`title.ilike.%${v}%`, `description.ilike.%${v}%`]).join(",");
  let listsQ = supabase.from("lists").select("id, title, list_places(place_id)").eq("is_public", true).or(listOr);
  if (!FEATURES.paidLists) listsQ = listsQ.eq("is_paid", false);

  const [reviewsRes, listsRes] = await Promise.all([
    supabase.from("reviews").select("place_id, user_id, rating, comment, profiles(name, is_creator)").or(reviewOr),
    listsQ,
  ]);
  if (reviewsRes.error) throw reviewsRes.error;
  if (listsRes.error) throw listsRes.error;

  const byId = new Map(places.map(p => [p.id, p]));
  const candidates = new Map<string, Candidate>();
  const getCand = (placeId: string): Candidate | null => {
    const place = byId.get(placeId);
    if (!place) return null;
    let c = candidates.get(placeId);
    if (!c) {
      c = { place, reviewSignal: 0, recommenders: new Set(), comments: [], listTitles: [], nameMatch: false, tagMatch: false, saves: 0 };
      candidates.set(placeId, c);
    }
    return c;
  };

  // 1. Review signal — Magsad-first, weighted by who recommends
  for (const r of reviewsRes.data as unknown as { place_id: string; user_id: string; rating: number; comment: string; profiles: { name: string; is_creator: boolean } | null }[]) {
    if (r.rating < 3) continue; // a bad review is not a recommendation
    const c = getCand(r.place_id);
    if (!c) continue;
    const weight = following.has(r.user_id) ? W_REVIEW_FOLLOWED : r.profiles?.is_creator ? W_REVIEW_CREATOR : W_REVIEW_USER;
    const strength = (r.rating - 2.5) / 2.5; // 5★ → 1.0
    c.reviewSignal += weight * strength;
    c.recommenders.add(r.user_id);
    if (c.comments.length < 2 && r.comment?.trim()) {
      c.comments.push({ author: r.profiles?.name || "مستخدم", text: r.comment, rating: r.rating });
    }
  }

  // 2. List signal — dish-titled public lists recommend their places
  for (const l of listsRes.data as unknown as { id: string; title: string; list_places: { place_id: string }[] }[]) {
    for (const lp of l.list_places) {
      const c = getCand(lp.place_id);
      if (c && c.listTitles.length < 3) c.listTitles.push(l.title);
    }
  }

  // 3. Place-text signal — the place itself is about the dish
  for (const p of places) {
    const name = normalize(`${p.name} ${p.nameEn}`);
    const meta = normalize(`${p.category} ${p.tags.join(" ")} ${p.description}`);
    const nameHit = variants.some(v => name.includes(v));
    const tagHit = variants.some(v => meta.includes(v));
    if (nameHit || tagHit) {
      const c = getCand(p.id);
      if (c) { c.nameMatch = nameHit; c.tagMatch = tagHit; }
    }
  }

  if (!candidates.size) return { term, results: [] };

  // 4. Saves as popularity (public since migration 0010)
  const ids = [...candidates.keys()];
  const { data: saves } = await supabase.from("saved_places").select("place_id").in("place_id", ids);
  for (const s of (saves ?? []) as { place_id: string }[]) {
    const c = candidates.get(s.place_id);
    if (c) c.saves += 1;
  }

  // --- Score, enrich with the Google quality prior, rank ---
  const scored = [...candidates.values()].map(c => {
    const base =
      c.reviewSignal +
      Math.min(3, c.listTitles.length) * W_LIST +
      (c.nameMatch ? W_NAME : 0) +
      (c.tagMatch ? W_TAG : 0) +
      Math.log1p(c.saves) * W_SAVE;

    // Google prior: 0.55 (unknown) → 1.0 (highly rated, many reviews)
    const g = c.place.googleRating;
    const n = c.place.googleReviewCount ?? 0;
    const prior = g ? 0.55 + 0.45 * (g / 5) * Math.min(1, Math.log1p(n) / 8) : 0.55;

    return { c, raw: base * prior };
  }).sort((a, b) => b.raw - a.raw);

  const max = scored[0].raw;
  const results: FoodResult[] = scored.slice(0, 20).map(({ c, raw }) => {
    const reasons: string[] = [];
    const sources: FoodSource[] = [];
    if (c.recommenders.size > 0) {
      reasons.push(`أوصى به ${c.recommenders.size.toLocaleString("ar")} من مستخدمي مقصد`);
      sources.push("توصيات مقصد");
    }
    if (c.listTitles.length > 0) {
      reasons.push(`ورد في قائمة «${c.listTitles[0]}»`);
      sources.push("قوائم مقصد");
    }
    if (c.nameMatch) reasons.push("متخصص في هذا الصنف");
    if (c.place.googleRating && (c.place.googleReviewCount ?? 0) > 50) {
      reasons.push(`تقييم ${c.place.googleRating} من ${(c.place.googleReviewCount ?? 0).toLocaleString("ar")} مراجعة`);
      sources.push("بيانات قوقل");
    }
    return {
      place: c.place,
      term,
      score: Math.max(35, Math.round(99 * (raw / max))),
      recommenders: c.recommenders.size,
      comments: c.comments,
      reasons,
      sources,
    };
  });

  return { term, results };
}
