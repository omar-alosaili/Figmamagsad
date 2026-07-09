import { supabase } from "./supabase";
import { mapListRow, type ListRow } from "./types";
import type { List } from "../components/data";
import { FEATURES } from "./features";

type ListRowWithPlaces = ListRow & { list_places: { place_id: string }[] };

export async function getPublicLists(): Promise<List[]> {
  let q = supabase
    .from("lists")
    .select("*, list_places(place_id)")
    .eq("is_public", true)
    .order("followers", { ascending: false });
  // Paid lists are hidden from every public surface while the feature is off
  if (!FEATURES.paidLists) q = q.eq("is_paid", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ListRowWithPlaces[]).map(row => mapListRow(row, row.list_places.map(lp => lp.place_id)));
}

export async function getListById(id: string): Promise<List | null> {
  const { data, error } = await supabase
    .from("lists")
    .select("*, list_places(place_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as ListRowWithPlaces;
  return mapListRow(row, row.list_places.map(lp => lp.place_id));
}

export async function getListsContainingPlace(placeId: string): Promise<List[]> {
  let q = supabase
    .from("lists")
    .select("*, list_places!inner(place_id)")
    .eq("list_places.place_id", placeId)
    .eq("is_public", true);
  if (!FEATURES.paidLists) q = q.eq("is_paid", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ListRowWithPlaces[]).map(row => mapListRow(row, [placeId]));
}

export async function getMyLists(userId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from("lists")
    .select("*, list_places(place_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ListRowWithPlaces[]).map(row => mapListRow(row, row.list_places.map(lp => lp.place_id)));
}

export async function createListInDb(input: {
  userId: string; title: string; description: string; isPublic: boolean; coverImage: string;
  isPaid?: boolean; price?: number | null;
}): Promise<List> {
  const { data, error } = await supabase
    .from("lists")
    .insert({
      user_id: input.userId, title: input.title, description: input.description,
      is_public: input.isPublic, cover_image: input.coverImage,
      is_paid: input.isPaid ?? false, price: input.isPaid ? input.price : null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapListRow(data as ListRow, []);
}

export async function getPurchasedListIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("list_purchases")
    .select("list_id")
    .eq("buyer_id", userId)
    .eq("status", "paid");
  if (error) throw error;
  return new Set(data.map(row => row.list_id as string));
}

// Phase 2: purchases run through Moyasar via Edge Functions. The client
// only receives a hosted-checkout URL; confirm verifies server-side.
// Until the Moyasar account exists (company registration pending), the
// function returns 503 "payment provider not configured" and we fall
// back to the Phase 1 mock purchase — which stops working (and stops
// being needed) once migration 0005 is applied alongside the real keys.
export async function beginListPurchase(
  listId: string,
  buyerId: string,
  amount: number,
): Promise<{ url: string; purchaseId: string } | { mock: true }> {
  const { data, error } = await supabase.functions.invoke("create-payment", {
    body: { listId, returnUrl: window.location.origin },
  });
  if (error) {
    // On non-2xx, invoke() hides the response body inside error.context
    let status: number | undefined;
    let body: { error?: string } | null = null;
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      status = ctx.status;
      try { body = await ctx.json(); } catch { /* not json */ }
    }
    if (status === 503 || body?.error === "payment provider not configured") {
      console.warn("Moyasar not configured — using Phase 1 mock purchase");
      const { error: insErr } = await supabase
        .from("list_purchases")
        .insert({ list_id: listId, buyer_id: buyerId, amount, status: "paid" });
      if (insErr) throw insErr;
      return { mock: true };
    }
    throw new Error(body?.error ?? error.message ?? String(error));
  }
  if (data?.error) throw new Error(data.error);
  return data as { url: string; purchaseId: string };
}

export async function confirmListPurchase(purchaseId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("confirm-payment", {
    body: { purchaseId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data as { status: string }).status;
}

export async function deleteList(listId: string): Promise<void> {
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) throw error;
}

export async function addPlaceToList(listId: string, placeId: string): Promise<void> {
  const { error } = await supabase.from("list_places").insert({ list_id: listId, place_id: placeId });
  if (error) throw error;
}

export async function toggleListLike(listId: string, userId: string, currentlyLiked: boolean): Promise<void> {
  if (currentlyLiked) {
    const { error } = await supabase.from("list_likes").delete().eq("list_id", listId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("list_likes").insert({ list_id: listId, user_id: userId });
    if (error) throw error;
  }
}

export async function toggleListFollow(listId: string, userId: string, currentlyFollowing: boolean): Promise<void> {
  if (currentlyFollowing) {
    const { error } = await supabase.from("list_follows").delete().eq("list_id", listId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("list_follows").insert({ list_id: listId, user_id: userId });
    if (error) throw error;
  }
}

export async function getLikedListIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("list_likes").select("list_id").eq("user_id", userId);
  if (error) throw error;
  return new Set(data.map(row => row.list_id as string));
}

export async function getFollowedListIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("list_follows").select("list_id").eq("user_id", userId);
  if (error) throw error;
  return new Set(data.map(row => row.list_id as string));
}
