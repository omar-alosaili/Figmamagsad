import { supabase } from "./supabase";
import { mapReviewRow, type Review, type ReviewRow } from "./types";

const REVIEW_COLS = "id, user_id, rating, comment, photos, created_at, profiles(name, avatar_url)";

// First-party review photos: capped and size-limited at the UI, stored in
// the public user-photos bucket under the uploader's uid folder (RLS).
export const MAX_REVIEW_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function uploadReviewPhoto(userId: string, file: File): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) throw new Error("photo_too_large");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("user-photos").upload(path, file, {
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("user-photos").getPublicUrl(path);
  return data.publicUrl;
}

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
export async function addReview(input: { placeId: string; userId: string; rating: number; comment: string; photos?: string[] }): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .upsert(
      { place_id: input.placeId, user_id: input.userId, rating: input.rating, comment: input.comment, photos: (input.photos ?? []).slice(0, MAX_REVIEW_PHOTOS) },
      { onConflict: "place_id,user_id" },
    )
    .select(REVIEW_COLS)
    .single();
  if (error) throw error;
  return mapReviewRow(data as unknown as ReviewRow);
}
