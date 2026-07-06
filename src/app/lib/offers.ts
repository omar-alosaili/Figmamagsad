import { supabase } from "./supabase";
import { mapOfferRow, type OfferRow } from "./types";
import type { Offer } from "../components/data";

export async function getActiveOffers(): Promise<Offer[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("is_active", true)
    .gte("end_date", today)
    .order("end_date", { ascending: true });
  if (error) throw error;
  return (data as OfferRow[]).map(mapOfferRow);
}

export type OfferWithStatus = Offer & { isActive: boolean };

export async function getOffersForPlace(placeId: string): Promise<OfferWithStatus[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as (OfferRow & { is_active: boolean })[]).map(row => ({ ...mapOfferRow(row), isActive: row.is_active }));
}

export async function createOffer(input: {
  placeId: string; createdBy: string; title: string; description: string;
  discount?: string; startDate?: string; endDate: string;
}): Promise<void> {
  const { error } = await supabase.from("offers").insert({
    place_id: input.placeId,
    created_by: input.createdBy,
    title: input.title,
    description: input.description,
    discount: input.discount ?? null,
    start_date: input.startDate ?? null,
    end_date: input.endDate,
  });
  if (error) throw error;
}

export async function updateOffer(id: string, patch: Partial<{ title: string; description: string; discount: string | null; end_date: string }>): Promise<void> {
  const { error } = await supabase.from("offers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deactivateOffer(id: string): Promise<void> {
  const { error } = await supabase.from("offers").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}
