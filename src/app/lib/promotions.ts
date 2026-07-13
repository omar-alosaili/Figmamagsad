import { supabase } from "./supabase";
import { logAdminAction } from "./admin";

export type PromotionPlacement = "home_new" | "home_suggested" | "home_featured";
export type PromotionStatus = "pending" | "active" | "paused" | "rejected";

// Labels for every placement value, including the two legacy sections kept
// only so historical rows still render a name in the admin history.
export const PLACEMENT_LABELS: Record<PromotionPlacement, string> = {
  home_featured: "وين مقصدك اليوم؟ ⭐",
  home_new: "جديد في الرياض ✨",
  home_suggested: "مقترح لك 💡",
};

// The only placement offered for NEW promotions. "جديد في الرياض" and
// "مقترح لك" are now derived automatically from the catalog, so promoting
// into them does nothing — the featured hero is the one curated slot.
export const SELECTABLE_PLACEMENTS: PromotionPlacement[] = ["home_featured"];

export type Promotion = {
  id: string;
  placeId: string;
  requestedBy: string | null;
  status: PromotionStatus;
  placement: PromotionPlacement;
  priority: number;
  targetDistrict: string | null;
  startsAt: string;
  endsAt: string | null;
  note: string;
  createdAt: string;
};

type PromotionRow = {
  id: string;
  place_id: string;
  requested_by: string | null;
  status: PromotionStatus;
  placement: PromotionPlacement;
  priority: number;
  target_district: string | null;
  starts_at: string;
  ends_at: string | null;
  note: string;
  created_at: string;
};

function mapRow(r: PromotionRow): Promotion {
  return {
    id: r.id,
    placeId: r.place_id,
    requestedBy: r.requested_by,
    status: r.status,
    placement: r.placement,
    priority: r.priority,
    targetDistrict: r.target_district,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    note: r.note ?? "", // omitted from the user-facing select
    createdAt: r.created_at,
  };
}

// Columns safe to expose to end users — deliberately excludes `note`,
// which is the owner's private pitch / internal admin note.
const PUBLIC_COLS = "id, place_id, requested_by, status, placement, priority, target_district, starts_at, ends_at, created_at";

// ---------- User-facing ----------

// Live promotions for a placement, admin priority first. RLS already
// restricts non-owners/non-admins to active in-window rows, but the
// filters are repeated here so owners/admins get the same view.
export async function getActivePromotions(placement: PromotionPlacement): Promise<Promotion[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("promotions")
    .select(PUBLIC_COLS)
    .eq("placement", placement)
    .eq("status", "active")
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data as PromotionRow[]).map(mapRow);
}

// ---------- Owner-facing ----------

export async function getMyPromotions(placeId: string): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PromotionRow[]).map(mapRow);
}

export async function requestPromotion(input: {
  placeId: string;
  ownerId: string;
  placement: PromotionPlacement;
  note: string;
}): Promise<void> {
  const { error } = await supabase.from("promotions").insert({
    place_id: input.placeId,
    requested_by: input.ownerId,
    placement: input.placement,
    note: input.note.trim(),
    status: "pending",
  });
  if (error) throw error;
}

export async function withdrawPromotionRequest(promotionId: string): Promise<void> {
  const { error } = await supabase.from("promotions").delete().eq("id", promotionId).eq("status", "pending");
  if (error) throw error;
}

// ---------- Admin ----------

export type AdminPromotion = Promotion & { placeName: string; requesterName: string | null };

type AdminPromotionRow = PromotionRow & {
  places: { name: string } | null;
  profiles: { name: string } | null;
};

export async function getPromotionsForAdmin(): Promise<AdminPromotion[]> {
  const sel = "*, places(name), profiles!promotions_requested_by_fkey(name)";
  const map = (rows: unknown[]) => (rows as AdminPromotionRow[]).map(r => ({
    ...mapRow(r),
    placeName: r.places?.name ?? "مكان محذوف",
    requesterName: r.profiles?.name ?? null,
  }));
  // Pending requests are the queue that must never be silently truncated,
  // so fetch them unbounded; page only the (larger) settled history.
  const [pendingRes, settledRes] = await Promise.all([
    supabase.from("promotions").select(sel).eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("promotions").select(sel).neq("status", "pending").order("created_at", { ascending: false }).limit(200),
  ]);
  if (pendingRes.error) throw pendingRes.error;
  if (settledRes.error) throw settledRes.error;
  return [...map(pendingRes.data), ...map(settledRes.data)];
}

export type PromotionConfig = {
  status?: PromotionStatus;
  placement?: PromotionPlacement;
  priority?: number;
  targetDistrict?: string | null;
  startsAt?: string;
  endsAt?: string | null;
};

export async function updatePromotion(
  adminId: string,
  promotionId: string,
  config: PromotionConfig,
  detail: string,
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (config.status !== undefined) patch.status = config.status;
  if (config.placement !== undefined) patch.placement = config.placement;
  if (config.priority !== undefined) patch.priority = config.priority;
  if (config.targetDistrict !== undefined) patch.target_district = config.targetDistrict;
  if (config.startsAt !== undefined) patch.starts_at = config.startsAt;
  if (config.endsAt !== undefined) patch.ends_at = config.endsAt;
  const { error } = await supabase.from("promotions").update(patch).eq("id", promotionId);
  if (error) throw error;
  await logAdminAction(adminId, "promotion_update", "promotions", promotionId, detail);
}

// Admin publishes a place directly into a discovery section (no owner
// request involved) — immediately active.
export async function createAdminPromotion(
  adminId: string,
  input: { placeId: string; placeName: string; placement: PromotionPlacement; priority?: number; targetDistrict?: string | null; endsAt?: string | null },
): Promise<void> {
  const { error } = await supabase.from("promotions").insert({
    place_id: input.placeId,
    requested_by: null,
    status: "active",
    placement: input.placement,
    priority: input.priority ?? 0,
    target_district: input.targetDistrict ?? null,
    ends_at: input.endsAt ?? null,
  });
  if (error) throw error;
  await logAdminAction(adminId, "promotion_update", "promotions", null, `نشر «${input.placeName}» في ${PLACEMENT_LABELS[input.placement]}`);
}

export async function deletePromotion(adminId: string, promotionId: string, detail: string): Promise<void> {
  const { error } = await supabase.from("promotions").delete().eq("id", promotionId);
  if (error) throw error;
  await logAdminAction(adminId, "promotion_update", "promotions", promotionId, detail);
}
