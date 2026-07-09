import { supabase } from "./supabase";
import { mapListRow, type ListRow } from "./types";
import type { List } from "../components/data";

type ListRowWithPlaces = ListRow & { list_places: { place_id: string }[] };

export async function getPublicLists(): Promise<List[]> {
  const { data, error } = await supabase
    .from("lists")
    .select("*, list_places(place_id)")
    .eq("is_public", true)
    .order("followers", { ascending: false });
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
  const { data, error } = await supabase
    .from("lists")
    .select("*, list_places!inner(place_id)")
    .eq("list_places.place_id", placeId)
    .eq("is_public", true);
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
export async function beginListPurchase(listId: string): Promise<{ url: string; purchaseId: string }> {
  const { data, error } = await supabase.functions.invoke("create-payment", {
    body: { listId, returnUrl: window.location.origin },
  });
  if (error) throw error;
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
