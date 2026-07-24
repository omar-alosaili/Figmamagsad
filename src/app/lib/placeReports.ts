import { supabase } from "./supabase";

export const PLACE_REPORT_REASONS = [
  { id: "closed", label: "المكان مغلق نهائياً" },
  { id: "not_real", label: "ليس مكاناً حقيقياً (منزل/فيلا)" },
  { id: "wrong_info", label: "معلومات خاطئة" },
  { id: "duplicate", label: "مكان مكرر" },
] as const;

export type PlaceReportReason = (typeof PLACE_REPORT_REASONS)[number]["id"];

// One open report per user per place (unique index). A second report from
// the same user resolves as "already"; a second user's report auto-demotes
// the place out of discovery via the DB trigger.
export async function submitPlaceReport(
  placeId: string,
  reporterId: string,
  reason: PlaceReportReason,
): Promise<"submitted" | "already"> {
  const { error } = await supabase
    .from("reports")
    .insert({ place_id: placeId, reporter_id: reporterId, reason });
  if (error) {
    if (error.code === "23505") return "already";
    throw error;
  }
  return "submitted";
}

export const REVIEW_REPORT_REASONS = [
  { id: "offensive", label: "محتوى مسيء أو غير لائق" },
  { id: "spam", label: "إعلان أو محتوى مكرر (سبام)" },
  { id: "inappropriate_photo", label: "صورة غير لائقة" },
  { id: "unrelated", label: "لا يخص هذا المكان" },
] as const;

export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number]["id"];

// Same reports table, review_id path. One open report per user per review
// (unique index in migration 0022) — a duplicate resolves as "already".
export async function submitReviewReport(
  reviewId: string,
  reporterId: string,
  reason: ReviewReportReason,
): Promise<"submitted" | "already"> {
  const { error } = await supabase
    .from("reports")
    .insert({ review_id: reviewId, reporter_id: reporterId, reason });
  if (error) {
    if (error.code === "23505") return "already";
    throw error;
  }
  return "submitted";
}

// Admin re-publishes a reported place: resolve its open reports and drop
// the user_reported flag — otherwise the place stays in the review queue
// forever and a single new report re-demotes it.
export async function clearPlaceReports(placeId: string, actorId: string): Promise<void> {
  const { error: repErr } = await supabase
    .from("reports")
    .update({ status: "resolved", resolved_by: actorId, resolved_at: new Date().toISOString() })
    .eq("place_id", placeId)
    .eq("status", "open");
  if (repErr) throw repErr;
  const { data, error: readErr } = await supabase.from("places").select("quality_flags").eq("id", placeId).single();
  if (readErr) throw readErr;
  const flags = ((data?.quality_flags ?? []) as string[]).filter(f => f !== "user_reported");
  const { error: flagErr } = await supabase.from("places").update({ quality_flags: flags }).eq("id", placeId);
  if (flagErr) throw flagErr;
}
