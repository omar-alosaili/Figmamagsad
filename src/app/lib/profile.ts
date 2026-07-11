import { supabase } from "./supabase";
import type { Profile } from "./types";

export type ProfileEdit = Partial<Pick<Profile,
  "name" | "bio" | "avatar_url" | "notification_opt_in" | "username" |
  "location" | "instagram" | "x_handle" | "tiktok" | "snapchat" | "website" |
  "personalization_opt_in"
>>;

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles").select("*").ilike("username", username).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(userId: string, patch: ProfileEdit): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

// True if the username is free (case-insensitive), ignoring the caller's own.
export async function isUsernameAvailable(username: string, selfId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles").select("id").ilike("username", username);
  if (error) throw error;
  return data.every(row => row.id === selfId);
}

// User search for the Explore "Users" tab: by name, username, or bio.
export async function searchProfiles(query: string, excludeId: string | null, limit = 20): Promise<Profile[]> {
  const q = query.trim().replace(/[,()"\\]/g, " ").trim();
  let req = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(limit);
  if (excludeId) req = req.neq("id", excludeId);
  if (q) req = req.or(`name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`);
  const { data, error } = await req;
  if (error) throw error;
  return data as Profile[];
}

export async function getSuggestedUsers(excludeUserId: string, limit = 5): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles").select("*").neq("id", excludeUserId)
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data as Profile[];
}

// Private: RLS only returns follow rows involving the caller, so this is
// accurate for your own profile and for admins, and near-zero (hidden)
// for anyone else — which is the intended privacy behavior.
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

export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_follows").select("follower_id")
    .eq("follower_id", followerId).eq("followee_id", followeeId).maybeSingle();
  if (error) throw error;
  return !!data;
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
