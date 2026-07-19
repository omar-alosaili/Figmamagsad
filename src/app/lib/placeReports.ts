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
