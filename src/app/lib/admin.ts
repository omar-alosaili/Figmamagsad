import { supabase } from "./supabase";
import { formatArabicRelativeTime } from "./types";

export type AuditAction =
  | "verify_approve" | "verify_reject" | "report_resolve" | "report_dismiss"
  | "place_create" | "place_update" | "place_delete";

export type VerificationRequest = {
  id: string;
  placeId: string;
  placeName: string;
  ownerName: string;
  status: "pending" | "approved" | "rejected";
  date: string;
};

export type Report = {
  id: string;
  placeId: string | null;
  reviewId: string | null;
  placeName: string | null;
  reporterName: string;
  reason: string;
  date: string;
};

export type AuditLogEntry = {
  id: string;
  actorName: string;
  action: AuditAction;
  targetTable: string;
  targetId: string | null;
  detail: string | null;
  time: string;
};

export async function getOverviewStats(): Promise<{ places: number; users: number; pendingVerifications: number; openReports: number }> {
  const [{ count: places }, { count: users }, { count: pendingVerifications }, { count: openReports }] = await Promise.all([
    supabase.from("places").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);
  return { places: places ?? 0, users: users ?? 0, pendingVerifications: pendingVerifications ?? 0, openReports: openReports ?? 0 };
}

export async function getVerificationRequests(): Promise<VerificationRequest[]> {
  const { data, error } = await supabase
    .from("verification_requests")
    .select("id, place_id, status, created_at, places(name), profiles!verification_requests_requested_by_fkey(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as { id: string; place_id: string; status: "pending"; created_at: string; places: { name: string } | null; profiles: { name: string } | null }[]).map(row => ({
    id: row.id,
    placeId: row.place_id,
    placeName: row.places?.name ?? "مكان محذوف",
    ownerName: row.profiles?.name || "غير معروف",
    status: row.status,
    date: formatArabicRelativeTime(row.created_at),
  }));
}

export async function reviewVerificationRequest(id: string, placeId: string, status: "approved" | "rejected", actorId: string): Promise<void> {
  const { error } = await supabase
    .from("verification_requests")
    .update({ status, reviewed_by: actorId, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logAdminAction(actorId, status === "approved" ? "verify_approve" : "verify_reject", "verification_requests", id);
}

export async function getReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, place_id, review_id, reason, created_at, places(name), profiles!reports_reporter_id_fkey(name)")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as { id: string; place_id: string | null; review_id: string | null; reason: string; created_at: string; places: { name: string } | null; profiles: { name: string } | null }[]).map(row => ({
    id: row.id,
    placeId: row.place_id,
    reviewId: row.review_id,
    placeName: row.places?.name ?? null,
    reporterName: row.profiles?.name || "مستخدم",
    reason: row.reason,
    date: formatArabicRelativeTime(row.created_at),
  }));
}

export async function resolveReport(id: string, status: "resolved" | "dismissed", actorId: string): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_by: actorId, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logAdminAction(actorId, status === "resolved" ? "report_resolve" : "report_dismiss", "reports", id);
}

export async function deleteReportedReview(reviewId: string): Promise<void> {
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) throw error;
}

export async function getAuditLog(limit = 20): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, target_table, target_id, detail, created_at, profiles(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as { id: string; action: AuditAction; target_table: string; target_id: string | null; detail: string | null; created_at: string; profiles: { name: string } | null }[]).map(row => ({
    id: row.id,
    actorName: row.profiles?.name || "مشرف",
    action: row.action,
    targetTable: row.target_table,
    targetId: row.target_id,
    detail: row.detail,
    time: formatArabicRelativeTime(row.created_at),
  }));
}

export async function logAdminAction(actorId: string, action: AuditAction, targetTable: string, targetId: string | null, detail?: string): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({ actor_id: actorId, action, target_table: targetTable, target_id: targetId, detail: detail ?? null });
  if (error) throw error;
}
