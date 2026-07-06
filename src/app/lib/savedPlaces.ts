import { supabase } from "./supabase";

export async function getSavedPlaceIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("saved_places").select("place_id").eq("user_id", userId);
  if (error) throw error;
  return new Set(data.map(row => row.place_id as string));
}

export async function toggleSavedPlace(userId: string, placeId: string, currentlySaved: boolean): Promise<void> {
  if (currentlySaved) {
    const { error } = await supabase.from("saved_places").delete().eq("user_id", userId).eq("place_id", placeId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("saved_places").insert({ user_id: userId, place_id: placeId });
    if (error) throw error;
  }
}
