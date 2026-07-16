import { supabase } from "./supabase";
import { mapReviewRow, type Review, type ReviewRow } from "./types";

const REVIEW_COLS = "id, user_id, rating, comment, created_at, profiles(name, avatar_url)";

export async function getReviewsForPlace(placeId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLS)
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ReviewRow[]).map(mapReviewRow);
}

// Upsert, not insert: reviews are unique per (place, user), so submitting
// again EDITS the existing review instead of dead-ending on the constraint.
// The rating-aggregate trigger fires on update too, keeping places.rating
// correct.
export async function addReview(input: { placeId: string; userId: string; rating: number; comment: string }): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .upsert(
      { place_id: input.placeId, user_id: input.userId, rating: input.rating, comment: input.comment },
      { onConflict: "place_id,user_id" },
    )
    .select(REVIEW_COLS)
    .single();
  if (error) throw error;
  return mapReviewRow(data as unknown as ReviewRow);
}
