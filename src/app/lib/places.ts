import { supabase } from "./supabase";
import { mapPlaceRow, type PlaceRow } from "./types";
import type { Place } from "../components/data";

async function fetchAllPlaces(): Promise<Place[]> {
  // Supabase caps responses at 1000 rows — page through so a city-wide
  // catalog (3000+ places) isn't silently truncated.
  const PAGE = 1000;
  const rows: PlaceRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("places")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as PlaceRow[]));
    if (!data || data.length < PAGE) break;
  }
  return rows.map(mapPlaceRow);
}

// The full catalog is several MB and every screen asks for it on mount —
// share one in-flight/recent fetch instead of re-downloading per screen.
const PLACES_CACHE_TTL_MS = 5 * 60 * 1000;
let placesCache: { promise: Promise<Place[]>; at: number } | null = null;

export function invalidatePlacesCache(): void {
  placesCache = null;
}

export async function getPlaces(): Promise<Place[]> {
  if (placesCache && Date.now() - placesCache.at < PLACES_CACHE_TTL_MS) {
    return placesCache.promise;
  }
  const promise = fetchAllPlaces();
  placesCache = { promise, at: Date.now() };
  promise.catch(() => { placesCache = null; }); // never cache a failure
  return promise;
}

// "جديد في الرياض" — places our Google sync first discovered in the last
// ~30 days, rated 4.0★+, newest first. NOTE: created_at is when the sync
// first inserted the row (Google's API has no "date added to Maps"), so on
// a freshly-synced catalog every row shares one date; this becomes a true
// "recently discovered" feed as later monthly syncs add new places.
export async function getNewInRiyadh(limit = 15): Promise<Place[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .gte("created_at", since)
    .gte("google_rating", 4)
    .not("image", "eq", "")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  // Sort by newest DAY first, then best-rated within a day. On the initial
  // bulk sync everything shares one day, so this shows the top-rated recent
  // places city-wide (not just the last district inserted); later monthly
  // syncs give genuinely-new discoveries a newer day, so they lead.
  const rows = data as (PlaceRow & { created_at: string })[];
  rows.sort((a, b) => {
    const da = a.created_at.slice(0, 10), db = b.created_at.slice(0, 10);
    if (da !== db) return da < db ? 1 : -1;                       // newest day first
    if ((b.google_rating ?? 0) !== (a.google_rating ?? 0))
      return (b.google_rating ?? 0) - (a.google_rating ?? 0);     // then best rating
    return (b.google_review_count ?? 0) - (a.google_review_count ?? 0); // then most-reviewed (avoids thin 5.0s)
  });
  return rows.slice(0, limit).map(mapPlaceRow);
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const { data, error } = await supabase.from("places").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapPlaceRow(data as PlaceRow) : null;
}

export async function updatePlace(id: string, patch: Partial<{
  name: string; description: string; address: string; opening_hours: string;
  order_link: string | null; booking_link: string | null; images: string[]; image: string;
  district: string; type: "كافيه" | "مطعم"; is_verified: boolean;
  // curation fields
  category: string; is_new: boolean;
  is_work_friendly: boolean; is_family_friendly: boolean;
  is_kids_friendly: boolean; has_outdoor_seating: boolean; has_parking: boolean;
}>): Promise<void> {
  const { error } = await supabase.from("places").update(patch).eq("id", id);
  if (error) throw error;
  invalidatePlacesCache();
}

export async function getSavedCountForPlace(placeId: string): Promise<number> {
  const { count, error } = await supabase.from("saved_places").select("*", { count: "exact", head: true }).eq("place_id", placeId);
  if (error) throw error;
  return count ?? 0;
}

export async function getRecentReviewCount(placeId: string, sinceIso: string): Promise<number> {
  const { count, error } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("place_id", placeId)
    .gte("created_at", sinceIso);
  if (error) throw error;
  return count ?? 0;
}

export async function createPlace(input: {
  name: string; type: "كافيه" | "مطعم"; district: string; address: string;
  description: string; image: string; latitude: number; longitude: number;
}): Promise<Place> {
  const { data, error } = await supabase
    .from("places")
    .insert({
      name: input.name, type: input.type, district: input.district, address: input.address,
      description: input.description, image: input.image, images: input.image ? [input.image] : [],
      latitude: input.latitude, longitude: input.longitude,
    })
    .select()
    .single();
  if (error) throw error;
  invalidatePlacesCache();
  return mapPlaceRow(data as PlaceRow);
}

export async function deletePlace(id: string): Promise<void> {
  const { error } = await supabase.from("places").delete().eq("id", id);
  if (error) throw error;
  invalidatePlacesCache();
}
