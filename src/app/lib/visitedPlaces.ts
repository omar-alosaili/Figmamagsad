import { supabase } from "./supabase";
import { mapPlaceRow, type PlaceRow } from "./types";
import type { Place } from "../components/data";

export type VisitStatus = "visited" | "want_to_visit";

export async function getVisitStatus(userId: string, placeId: string): Promise<VisitStatus | null> {
  const { data, error } = await supabase
    .from("visited_places")
    .select("status")
    .eq("user_id", userId)
    .eq("place_id", placeId)
    .maybeSingle();
  if (error) throw error;
  return (data?.status as VisitStatus) ?? null;
}

export async function setVisitStatus(userId: string, placeId: string, status: VisitStatus | null): Promise<void> {
  if (status === null) {
    const { error } = await supabase.from("visited_places").delete().eq("user_id", userId).eq("place_id", placeId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("visited_places").upsert({ user_id: userId, place_id: placeId, status });
  if (error) throw error;
}

export async function getVisitedPlaces(userId: string, status: VisitStatus): Promise<Place[]> {
  const { data, error } = await supabase
    .from("visited_places")
    .select("places(*)")
    .eq("user_id", userId)
    .eq("status", status);
  if (error) throw error;
  return (data as unknown as { places: PlaceRow }[]).map(row => mapPlaceRow(row.places));
}
