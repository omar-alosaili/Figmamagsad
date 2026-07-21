// TS port of the sync's quality model (scripts/sync-google-places.mjs) —
// used when an admin APPLIES an approved Google update so the score stays
// consistent without waiting for the next scan. Keep the two in sync.
export const COMPUTED_QUALITY_FLAGS = new Set([
  "perfect_rating_low_sample", "low_reviews", "no_photos", "no_hours", "residential_name",
]);

const RESIDENTIAL_RE = /(فيلا|منزل|بيت |ديوانية|استراحة|مجلس |شاليه|مزرعة)/;

export function computeQualityScore(input: {
  name: string;
  googleRating: number | null;
  googleReviewCount: number | null;
  photoCount: number;
  hasHours: boolean;
  hasContact: boolean;
  existingFlags: string[];
}): { score: number; flags: string[] } {
  const reviews = input.googleReviewCount ?? 0;
  const rating = input.googleRating;

  let score = 0;
  score += reviews >= 100 ? 25 : reviews >= 25 ? 20 : reviews >= 5 ? 10 : 0;
  if (rating != null) {
    if (rating === 5 && reviews < 20) score += 0;
    else if (rating >= 3.8 && rating <= 4.9 && reviews >= 25) score += 15;
    else if (rating >= 3.3) score += 8;
  }
  score += input.photoCount >= 3 ? 15 : input.photoCount >= 1 ? 10 : 0;
  score += input.hasHours ? 10 : 0;
  score += input.hasContact ? 10 : 0;
  score += 10; // geographic fit
  score += 15; // category

  const computed: string[] = [];
  if (rating === 5 && reviews < 20) computed.push("perfect_rating_low_sample");
  if (reviews < 10) computed.push("low_reviews");
  if (input.photoCount === 0) computed.push("no_photos");
  if (!input.hasHours) computed.push("no_hours");
  if (RESIDENTIAL_RE.test(input.name)) computed.push("residential_name");

  // Preserve externally-set flags (user_reported, …)
  const external = input.existingFlags.filter(f => !COMPUTED_QUALITY_FLAGS.has(f));
  return { score, flags: [...new Set([...computed, ...external])] };
}
