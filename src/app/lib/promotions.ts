import { supabase } from "./supabase";
import { logAdminAction } from "./admin";

export type PromotionPlacement = "home_new" | "home_suggested";
export type PromotionStatus = "pending" | "active" | "paused" | "rejected";

export const PLACEMENT_LABELS: Record<PromotionPlacement, string> = {
  home_new: "جديد في الرياض ✨",
  home_suggested: "مقترح لك 💡",
};

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
    note: r.note,
    createdAt: r.created_at,
  };
}

// ---------- User-facing ----------

// Live promotions for a placement, admin priority first. RLS already
// restricts non-owners/non-admins to active in-window rows, but the
// filters are repeated here so owners/admins get the same view.
export async function getActivePromotions(placement: PromotionPlacement): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("placement", placement)
    .eq("status", "active")
    .lte("starts_at", new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
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
  const { data, error } = await supabase
    .from("promotions")
    .select("*, places(name), profiles!promotions_requested_by_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as unknown as AdminPromotionRow[]).map(r => ({
    ...mapRow(r),
    placeName: r.places?.name ?? "مكان محذوف",
    requesterName: r.profiles?.name ?? null,
  }));
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
