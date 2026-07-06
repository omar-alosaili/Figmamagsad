import { supabase } from "./supabase";
import { mapReviewRow, type Review, type ReviewRow } from "./types";

export async function getReviewsForPlace(placeId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, profiles(name, avatar_url)")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ReviewRow[]).map(mapReviewRow);
}

export async function addReview(input: { placeId: string; userId: string; rating: number; comment: string }): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({ place_id: input.placeId, user_id: input.userId, rating: input.rating, comment: input.comment })
    .select("id, rating, comment, created_at, profiles(name, avatar_url)")
    .single();
  if (error) throw error;
  return mapReviewRow(data as unknown as ReviewRow);
}
