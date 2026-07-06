import { supabase } from "./supabase";
import type { Profile } from "./types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "name" | "bio" | "avatar_url" | "notification_opt_in">>
): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function getSuggestedUsers(excludeUserId: string, limit = 5): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", excludeUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Profile[];
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("followee_id", userId),
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

export async function getFollowingIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("user_follows").select("followee_id").eq("follower_id", userId);
  if (error) throw error;
  return new Set(data.map(row => row.followee_id as string));
}

export async function toggleFollowUser(followerId: string, followeeId: string, currentlyFollowing: boolean): Promise<void> {
  if (currentlyFollowing) {
    const { error } = await supabase.from("user_follows").delete().eq("follower_id", followerId).eq("followee_id", followeeId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("user_follows").insert({ follower_id: followerId, followee_id: followeeId });
    if (error) throw error;
  }
}
