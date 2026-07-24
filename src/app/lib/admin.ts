import { supabase } from "./supabase";
import { formatArabicRelativeTime } from "./types";

export type AuditAction =
  | "verify_approve" | "verify_reject" | "report_resolve" | "report_dismiss"
  | "place_create" | "place_update" | "place_delete" | "payout_paid"
  | "user_update" | "broadcast_sent" | "promotion_update" | "place_auto_demoted"
  | "sync_approve" | "sync_reject";

export type AdminPayoutRequest = {
  id: string;
  creatorName: string;
  amount: number;
  status: "pending" | "paid" | "rejected";
  date: string;
};

export type VerificationRequest = {
  id: string;
  placeId: string;
  placeName: string;
  ownerName: string;
  status: "pending" | "approved" | "rejected";
  date: string;
};

export type ReportedReview = {
  comment: string;
  rating: number;
  photos: string[];
  authorName: string;
  placeName: string | null;
};

export type Report = {
  id: string;
  placeId: string | null;
  reviewId: string | null;
  placeName: string | null;
  reporterName: string;
  reason: string;
  date: string;
  // The reported review's content, so the admin can judge without leaving
  // the queue. null for place reports or if the review was already deleted.
  review: ReportedReview | null;
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
    .select("id, place_id, review_id, reason, created_at, places(name), profiles!reports_reporter_id_fkey(name), reviews(comment, rating, photos, profiles(name), places(name))")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  type ReviewJoin = { comment: string; rating: number; photos: string[] | null; profiles: { name: string } | null; places: { name: string } | null } | null;
  return (data as unknown as { id: string; place_id: string | null; review_id: string | null; reason: string; created_at: string; places: { name: string } | null; profiles: { name: string } | null; reviews: ReviewJoin }[]).map(row => ({
    id: row.id,
    placeId: row.place_id,
    reviewId: row.review_id,
    // Review reports have no place_id of their own — surface the reviewed place's name
    placeName: row.places?.name ?? row.reviews?.places?.name ?? null,
    reporterName: row.profiles?.name || "مستخدم",
    reason: row.reason,
    date: formatArabicRelativeTime(row.created_at),
    review: row.reviews
      ? {
          comment: row.reviews.comment,
          rating: row.reviews.rating,
          photos: row.reviews.photos ?? [],
          authorName: row.reviews.profiles?.name || "مستخدم",
          placeName: row.reviews.places?.name ?? null,
        }
      : null,
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
  // Grab the photo URLs first — after the row is gone there is no way to
  // find its files in the user-photos bucket.
  const { data: row } = await supabase.from("reviews").select("photos").eq("id", reviewId).maybeSingle();
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) throw error;
  const paths = ((row?.photos ?? []) as string[])
    .map(url => url.split("/user-photos/")[1])
    .filter((p): p is string => !!p)
    .map(p => decodeURIComponent(p.split("?")[0]));
  if (paths.length) {
    // Best-effort: the review (the user-facing harm) is already gone; a
    // failed storage cleanup just leaves an unreferenced file.
    await supabase.storage.from("user-photos").remove(paths).catch(() => {});
  }
}

export async function getAuditLog(limit = 20, offset = 0): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, target_table, target_id, detail, created_at, profiles(name)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
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

export async function getPayoutRequests(): Promise<AdminPayoutRequest[]> {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("id, amount, status, created_at, profiles!payout_requests_creator_id_fkey(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as { id: string; amount: number; status: AdminPayoutRequest["status"]; created_at: string; profiles: { name: string } | null }[]).map(row => ({
    id: row.id,
    creatorName: row.profiles?.name || "متميز",
    amount: Number(row.amount),
    status: row.status,
    date: formatArabicRelativeTime(row.created_at),
  }));
}

export async function markPayoutPaid(id: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from("payout_requests")
    .update({ status: "paid", paid_by: adminId, paid_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logAdminAction(adminId, "payout_paid", "payout_requests", id);
}

// ---------- User management ----------

export type AdminUser = {
  id: string;
  name: string;
  username: string | null;
  role: "user" | "business" | "admin";
  isCreator: boolean;
  ownedPlaceId: string | null;
  ownedPlaceName: string | null;
  date: string;
};

export async function searchUsers(query: string, limit = 20): Promise<AdminUser[]> {
  let q = supabase
    .from("profiles")
    .select("id, name, username, role, is_creator, owned_place_id, created_at, places!profiles_owned_place_fk(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  // Strip PostgREST or() syntax characters — a comma or paren in the
  // query otherwise breaks the filter ("failed to parse logic tree").
  const safe = query.trim().replace(/[,()"\\]/g, " ").trim();
  if (safe) q = q.or(`name.ilike.%${safe}%,username.ilike.%${safe}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as { id: string; name: string; username: string | null; role: AdminUser["role"]; is_creator: boolean; owned_place_id: string | null; created_at: string; places: { name: string } | null }[]).map(row => ({
    id: row.id,
    name: row.name || "بلا اسم",
    username: row.username,
    role: row.role,
    isCreator: row.is_creator,
    ownedPlaceId: row.owned_place_id,
    ownedPlaceName: row.places?.name ?? null,
    date: formatArabicRelativeTime(row.created_at),
  }));
}

export async function setUserCreator(userId: string, isCreator: boolean, adminId: string, userName: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ is_creator: isCreator }).eq("id", userId);
  if (error) throw error;
  await logAdminAction(adminId, "user_update", "profiles", userId, `${isCreator ? "منح" : "سحب"} صلاحية متميز · ${userName}`);
}

export async function setUserRole(userId: string, role: "user" | "admin", adminId: string, userName: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
  await logAdminAction(adminId, "user_update", "profiles", userId, `${role === "admin" ? "ترقية لمشرف" : "إزالة صلاحية المشرف"} · ${userName}`);
}

// Ownership lives in TWO columns that must stay in sync:
// profiles.owned_place_id drives the app UI, places.owner_id drives RLS.
export async function assignPlaceOwnership(
  userId: string,
  place: { id: string; name: string } | null,
  previousPlaceId: string | null,
  adminId: string,
  userName: string,
): Promise<void> {
  if (previousPlaceId) {
    const { error } = await supabase.from("places").update({ owner_id: null }).eq("id", previousPlaceId);
    if (error) throw error;
  }
  const { error: profErr } = await supabase.from("profiles").update({ owned_place_id: place?.id ?? null }).eq("id", userId);
  if (profErr) throw profErr;
  if (place) {
    const { error } = await supabase.from("places").update({ owner_id: userId }).eq("id", place.id);
    if (error) throw error;
  }
  await logAdminAction(
    adminId, "user_update", "profiles", userId,
    place ? `تعيين مالكاً لـ ${place.name} · ${userName}` : `إزالة ملكية المكان · ${userName}`,
  );
}

// ---------- Monetization ----------

export type MonetizationStats = {
  totalSales: number;
  grossRevenue: number;
  platformRevenue: number;
  pendingPayouts: number;
  creatorsCount: number;
  topLists: { title: string; sales: number; revenue: number }[];
};

const PLATFORM_FEE_RATE = 0.2;

export async function getMonetizationStats(): Promise<MonetizationStats> {
  const [salesRes, payoutsRes, creatorsRes] = await Promise.all([
    supabase.from("list_purchases").select("amount, lists(title)").eq("status", "paid"),
    supabase.from("payout_requests").select("amount").eq("status", "pending"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_creator", true),
  ]);
  if (salesRes.error) throw salesRes.error;
  if (payoutsRes.error) throw payoutsRes.error;

  const sales = salesRes.data as unknown as { amount: number; lists: { title: string } | null }[];
  const gross = sales.reduce((s, x) => s + Number(x.amount), 0);

  const byList = new Map<string, { title: string; sales: number; revenue: number }>();
  for (const s of sales) {
    const title = s.lists?.title ?? "قائمة محذوفة";
    const e = byList.get(title) ?? { title, sales: 0, revenue: 0 };
    e.sales += 1;
    e.revenue += Number(s.amount);
    byList.set(title, e);
  }

  return {
    totalSales: sales.length,
    grossRevenue: gross,
    platformRevenue: Math.round(gross * PLATFORM_FEE_RATE * 100) / 100,
    pendingPayouts: payoutsRes.data.reduce((s, p) => s + Number(p.amount), 0),
    creatorsCount: creatorsRes.count ?? 0,
    topLists: [...byList.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  };
}

// ---------- Broadcast notifications ----------

export type BroadcastSegment = "all" | "owners" | "creators";

// Inserts one notification per targeted user. Fine at the current scale;
// past a few thousand users this should move into an Edge Function.
export async function sendBroadcast(
  adminId: string,
  input: { title: string; body: string; segment: BroadcastSegment },
): Promise<number> {
  let q = supabase.from("profiles").select("id");
  if (input.segment === "owners") q = q.not("owned_place_id", "is", null);
  if (input.segment === "creators") q = q.eq("is_creator", true);
  const { data: targets, error: targetsErr } = await q;
  if (targetsErr) throw targetsErr;
  if (!targets.length) return 0;

  const rows = targets.map(t => ({
    user_id: t.id,
    type: "new" as const,
    title: input.title,
    body: input.body,
  }));
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) throw error;

  await logAdminAction(adminId, "broadcast_sent", "notifications", null, `${input.title} · ${rows.length} مستلم`);
  return rows.length;
}
