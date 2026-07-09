import { supabase } from "./supabase";
import { mapListRow, mapPlaceRow, type ListRow, type PlaceRow } from "./types";
import type { List, Place } from "../components/data";
import { FEATURES } from "./features";

type ListRowWithPlaces = ListRow & { list_places: { place_id: string }[] };

// A user's public lists (their curated recommendations). Paid lists are
// excluded while that feature is hidden.
export async function getPublicListsByUser(userId: string): Promise<List[]> {
  let q = supabase
    .from("lists")
    .select("*, list_places(place_id)")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (!FEATURES.paidLists) q = q.eq("is_paid", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ListRowWithPlaces[]).map(row => mapListRow(row, row.list_places.map(lp => lp.place_id)));
}

export type UserReview = {
  id: string;
  rating: number;
  comment: string;
  date: string;
  place: Place | null;
};

// A user's reviews with the reviewed place — their public "recommendations".
export async function getReviewsByUser(userId: string, limit = 20): Promise<UserReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, places(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as { id: string; rating: number; comment: string; created_at: string; places: PlaceRow | null }[]).map(r => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    date: r.created_at,
    place: r.places ? mapPlaceRow(r.places) : null,
  }));
}

// ---------- Follow feed ----------

export type FeedItem =
  | { kind: "list"; id: string; at: string; actorName: string; actorUsername: string | null; list: List }
  | { kind: "review"; id: string; at: string; actorName: string; actorUsername: string | null; review: UserReview };

// Recent public activity from the people the user follows: new public
// lists and new reviews, merged newest-first. Chronological for now;
// relevance ranking is a follow-on.
export async function getFollowFeed(userId: string, limit = 30): Promise<FeedItem[]> {
  const { data: follows, error: fErr } = await supabase
    .from("user_follows").select("followee_id").eq("follower_id", userId);
  if (fErr) throw fErr;
  const ids = follows.map(f => f.followee_id as string);
  if (!ids.length) return [];

  let listsQ = supabase
    .from("lists")
    .select("*, list_places(place_id), profiles!lists_user_id_fkey(name, username)")
    .in("user_id", ids)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!FEATURES.paidLists) listsQ = listsQ.eq("is_paid", false);

  const [listsRes, reviewsRes] = await Promise.all([
    listsQ,
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, places(*), profiles(name, username)")
      .in("user_id", ids)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  if (listsRes.error) throw listsRes.error;
  if (reviewsRes.error) throw reviewsRes.error;

  const listItems: FeedItem[] = (listsRes.data as unknown as (ListRowWithPlaces & { created_at: string; profiles: { name: string; username: string | null } | null })[])
    .map(row => ({
      kind: "list" as const,
      id: row.id,
      at: row.created_at,
      actorName: row.profiles?.name || "مستخدم",
      actorUsername: row.profiles?.username ?? null,
      list: mapListRow(row, row.list_places.map(lp => lp.place_id)),
    }));

  const reviewItems: FeedItem[] = (reviewsRes.data as unknown as { id: string; rating: number; comment: string; created_at: string; places: PlaceRow | null; profiles: { name: string; username: string | null } | null }[])
    .filter(r => r.places)
    .map(r => ({
      kind: "review" as const,
      id: r.id,
      at: r.created_at,
      actorName: r.profiles?.name || "مستخدم",
      actorUsername: r.profiles?.username ?? null,
      review: { id: r.id, rating: r.rating, comment: r.comment, date: r.created_at, place: mapPlaceRow(r.places!) },
    }));

  return [...listItems, ...reviewItems]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
