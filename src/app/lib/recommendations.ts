import { supabase } from "./supabase";
import type { Place } from "../components/data";
import type { Promotion } from "./promotions";

// ============================================================
// Ranking for the discovery sections. Two optional, permission-gated
// signals sit ON TOP of the admin-configured priority order:
//
// - Personalization: uses the viewer's onboarding interests and the
//   districts of their saved places. In-app data only, and disabled
//   entirely when profiles.personalization_opt_in is false.
// - Location: distance sort using the browser geolocation API, ONLY
//   after the user explicitly taps "الأقرب لي" (the permission prompt
//   is the consent). Coordinates never leave the device — all math
//   is client-side and nothing is stored.
// ============================================================

export type PromotedPlace = { promotion: Promotion; place: Place };

export async function getViewerInterests(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("user_interests").select("interest_id").eq("user_id", userId);
  if (error) throw error;
  return new Set(data.map(r => r.interest_id as string));
}

// Districts the viewer saved places in — a cheap affinity signal.
export async function getViewerSavedDistricts(userId: string, places: Place[]): Promise<Set<string>> {
  const { data, error } = await supabase.from("saved_places").select("place_id").eq("user_id", userId);
  if (error) throw error;
  const byId = new Map(places.map(p => [p.id, p]));
  const districts = new Set<string>();
  for (const row of data) {
    const p = byId.get(row.place_id as string);
    if (p?.district) districts.add(p.district);
  }
  return districts;
}

// How well a place matches the viewer's onboarding interests.
export function interestMatchScore(place: Place, interests: Set<string>): number {
  let score = 0;
  if (interests.has("coffee") && place.type === "كافيه") score += 1;
  if (interests.has("family") && place.isFamilyFriendly) score += 1;
  if (interests.has("kids") && place.isKidsFriendly) score += 1;
  if (interests.has("work") && place.isWorkFriendly) score += 1;
  if (interests.has("outdoor") && place.hasOutdoorSeating) score += 1;
  // match the same "فطور" heuristic the Home tag filter uses
  if (interests.has("breakfast") && (place.category.includes("فطور") || place.tags.some(t => t.includes("فطور")))) score += 1;
  if (interests.has("new") && place.isNew) score += 1;
  return score;
}

// Whether an admin's target_district applies to this viewer: a targeted
// promotion is "relevant" when the viewer shows affinity to that district
// (has saved places there). Untargeted promotions are relevant to all.
function targetRelevant(entry: PromotedPlace, savedDistricts: Set<string>): boolean {
  const t = entry.promotion.targetDistrict;
  return t == null || savedDistricts.has(t);
}

// Personalized ordering for "مقترح لك": admin priority leads, then
// district targeting relevance, then interest match, then saved-district
// affinity, then rating.
export function rankSuggested(
  entries: PromotedPlace[],
  interests: Set<string>,
  savedDistricts: Set<string>,
): PromotedPlace[] {
  return [...entries].sort((a, b) => {
    const pa = a.promotion.priority - b.promotion.priority;
    if (pa !== 0) return -pa;
    const ta = Number(targetRelevant(a, savedDistricts)) - Number(targetRelevant(b, savedDistricts));
    if (ta !== 0) return -ta;
    const ia = interestMatchScore(a.place, interests) - interestMatchScore(b.place, interests);
    if (ia !== 0) return -ia;
    const da = Number(savedDistricts.has(a.place.district)) - Number(savedDistricts.has(b.place.district));
    if (da !== 0) return -da;
    return (b.place.googleRating ?? 0) - (a.place.googleRating ?? 0);
  });
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Nearest-first ordering once the user granted location. Pure distance
// so the "الأقرب لي" label is honest — a closer place never ranks below
// a farther one. (District targeting is applied in the default order via
// rankSuggested, not here.)
// Same nearest-first sort, for a plain Place[] (the "جديد في الرياض" list).
export function rankPlacesByDistance(places: Place[], userLat: number, userLng: number): Place[] {
  return [...places]
    .map(p => ({ p, dist: haversineKm(userLat, userLng, p.latitude, p.longitude) }))
    .sort((a, b) => a.dist - b.dist)
    .map(x => x.p);
}

export function rankByDistance(entries: PromotedPlace[], userLat: number, userLng: number): PromotedPlace[] {
  return [...entries]
    .map(e => ({ e, dist: haversineKm(userLat, userLng, e.place.latitude, e.place.longitude) }))
    .sort((a, b) => a.dist - b.dist)
    .map(x => x.e);
}

// One-shot geolocation with the browser's own permission prompt as
// the consent step. Never persisted, never sent to the server.
export function requestUserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("unsupported")); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  });
}
