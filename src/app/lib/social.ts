import { supabase } from "./supabase";
import { mapListRow, mapPlaceRow, type ListRow, type PlaceRow } from "./types";
import type { List, Place } from "../components/data";
import { FEATURES } from "./features";

type ListRowWithPlaces = ListRow & { list_places: { place_id: string }[] };

// A user's public lists (their curated recommendations). Paid lists are
// excluded while that feature is hidden.
export async function getPublicListsByUser(userId: string): Promise<List[]> {
  let q = supabase
    .from("lists")
    .select("*, list_places(place_id)")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (!FEATURES.paidLists) q = q.eq("is_paid", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ListRowWithPlaces[]).map(row => mapListRow(row, row.list_places.map(lp => lp.place_id)));
}

// A user's saved places (now public — part of profile discovery).
export async function getSavedPlacesByUser(userId: string, limit = 40): Promise<Place[]> {
  const { data, error } = await supabase
    .from("saved_places")
    .select("places(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as { places: PlaceRow | null }[])
    .filter(r => r.places)
    .map(r => mapPlaceRow(r.places!));
}

export type UserReview = {
  id: string;
  rating: number;
  comment: string;
  date: string;
  place: Place | null;
};

// A user's reviews with the reviewed place — their public "recommendations".
export async function getReviewsByUser(userId: string, limit = 20): Promise<UserReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, places(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as { id: string; rating: number; comment: string; created_at: string; places: PlaceRow | null }[]).map(r => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    date: r.created_at,
    place: r.places ? mapPlaceRow(r.places) : null,
  }));
}

// ---------- Follow feed ----------

export type FeedItem = {
  id: string;
  at: string;
  actorName: string;
  actorUsername: string | null;
  score?: number;
} & (
  | { kind: "list"; list: List }
  | { kind: "review"; review: UserReview }
);

// Relevance score in ~[0,1], blending three signals:
//   recency   — exponential time decay (keeps the feed fresh)
//   engagement — community validation (list followers/likes, place
//                popularity, and how strong the recommendation is)
//   quality   — the item actually carries content (places, a comment)
// Weights favor recency so the feed stays current, but a high-engagement
// item can still out-rank a slightly newer but weaker one.
const RECENCY_HALF_LIFE_DAYS = 5;

function scoreFeedItem(item: FeedItem, now: number): number {
  const ageDays = Math.max(0, (now - new Date(item.at).getTime()) / 86_400_000);
  const recency = Math.exp((-ageDays * Math.LN2) / RECENCY_HALF_LIFE_DAYS);

  let engagement = 0;
  let quality = 0;
  if (item.kind === "list") {
    // log-scaled so a few followers help but can't dominate
    engagement = Math.min(1, Math.log1p(item.list.followers * 2 + item.list.likes) / 4);
    quality = item.list.placeCount > 0 ? 1 : 0.2;
  } else {
    const p = item.review.place;
    const popularity = Math.min(1, Math.log1p(p?.googleReviewCount ?? 0) / 9); // ~8k reviews → 1
    const strength = Math.max(0, (item.review.rating - 3) / 2); // 5★ → 1, 3★ → 0
    engagement = Math.min(1, popularity * 0.6 + strength * 0.6);
    quality = item.review.comment?.trim() ? 1 : 0.35;
  }

  return recency * 0.5 + engagement * 0.35 + quality * 0.15;
}

// Recent public activity from the people the user follows: new public
// lists and reviews, ranked by relevance with a per-actor diversity
// penalty so one prolific creator can't flood the feed.
export async function getFollowFeed(userId: string, limit = 30): Promise<FeedItem[]> {
  const { data: follows, error: fErr } = await supabase
    .from("user_follows").select("followee_id").eq("follower_id", userId);
  if (fErr) throw fErr;
  const ids = follows.map(f => f.followee_id as string);
  if (!ids.length) return [];

  // Pull a wider candidate pool than we'll show, so ranking has room to reorder.
  const CANDIDATES = limit * 3;
  let listsQ = supabase
    .from("lists")
    .select("*, list_places(place_id), profiles!lists_user_id_fkey(name, username)")
    .in("user_id", ids)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(CANDIDATES);
  if (!FEATURES.paidLists) listsQ = listsQ.eq("is_paid", false);

  const [listsRes, reviewsRes] = await Promise.all([
    listsQ,
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, places(*), profiles(name, username)")
      .in("user_id", ids)
      .order("created_at", { ascending: false })
      .limit(CANDIDATES),
  ]);
  if (listsRes.error) throw listsRes.error;
  if (reviewsRes.error) throw reviewsRes.error;

  const listItems: FeedItem[] = (listsRes.data as unknown as (ListRowWithPlaces & { created_at: string; profiles: { name: string; username: string | null } | null })[])
    .map(row => ({
      kind: "list" as const,
      id: row.id,
      at: row.created_at,
      actorName: row.profiles?.name || "مستخدم",
      actorUsername: row.profiles?.username ?? null,
      list: mapListRow(row, row.list_places.map(lp => lp.place_id)),
    }))
    // An empty list is not a recommendation worth surfacing in the feed.
    .filter(item => item.list.placeCount > 0);

  const reviewItems: FeedItem[] = (reviewsRes.data as unknown as { id: string; rating: number; comment: string; created_at: string; places: PlaceRow | null; profiles: { name: string; username: string | null } | null }[])
    .filter(r => r.places)
    .map(r => ({
      kind: "review" as const,
      id: r.id,
      at: r.created_at,
      actorName: r.profiles?.name || "مستخدم",
      actorUsername: r.profiles?.username ?? null,
      review: { id: r.id, rating: r.rating, comment: r.comment, date: r.created_at, place: mapPlaceRow(r.places!) },
    }));

  const now = Date.now();
  const scored = [...listItems, ...reviewItems]
    .map(item => ({ item, base: scoreFeedItem(item, now) }))
    .sort((a, b) => b.base - a.base);

  // Diversity: each additional item from the same actor is penalized, so
  // the feed mixes voices instead of stacking one creator's uploads.
  const seenByActor = new Map<string, number>();
  const ranked = scored
    .map(({ item, base }) => {
      const key = item.actorUsername ?? item.actorName;
      const n = seenByActor.get(key) ?? 0;
      seenByActor.set(key, n + 1);
      const score = base * Math.pow(0.6, n); // 1, 0.6, 0.36, …
      return { ...item, score };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);

  return ranked;
}
