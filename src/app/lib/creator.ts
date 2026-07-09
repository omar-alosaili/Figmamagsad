import { supabase } from "./supabase";

// Platform keeps 20% of every sale; creators earn the rest.
export const CREATOR_SHARE = 0.8;

export type CreatorSale = {
  id: string;
  listId: string;
  listTitle: string;
  buyerName: string;
  amount: number;
  purchasedAt: string;
};

export type PayoutRequest = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "rejected";
  createdAt: string;
};

type SaleRow = {
  id: string;
  amount: number;
  purchased_at: string;
  list_id: string;
  lists: { title: string; user_id: string };
  profiles: { name: string } | null;
};

export async function getCreatorSales(creatorId: string): Promise<CreatorSale[]> {
  const { data, error } = await supabase
    .from("list_purchases")
    .select("id, amount, purchased_at, list_id, lists!inner(title, user_id), profiles!list_purchases_buyer_id_fkey(name)")
    .eq("lists.user_id", creatorId)
    .eq("status", "paid")
    .order("purchased_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as SaleRow[]).map(row => ({
    id: row.id,
    listId: row.list_id,
    listTitle: row.lists.title,
    buyerName: row.profiles?.name || "مستخدم",
    amount: Number(row.amount),
    purchasedAt: row.purchased_at,
  }));
}

export async function getMyPayouts(creatorId: string): Promise<PayoutRequest[]> {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("id, amount, status, created_at")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(row => ({
    id: row.id as string,
    amount: Number(row.amount),
    status: row.status as PayoutRequest["status"],
    createdAt: row.created_at as string,
  }));
}

export async function requestPayout(creatorId: string, amount: number): Promise<void> {
  const { error } = await supabase
    .from("payout_requests")
    .insert({ creator_id: creatorId, amount });
  if (error) throw error;
}
