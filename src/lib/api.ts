import { projectId, publicAnonKey } from "/utils/supabase/info";
import { createClient } from "@supabase/supabase-js";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-33b6a600`;
const headers = (token?: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token ?? publicAnonKey}`,
});

// ─── Supabase Auth client ───
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
);

// ─── Auth ───
export async function register(email: string, password: string, name: string, mobile?: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password, name, mobile }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Registration failed");
  return data;
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ─── Places ───
export async function getPlaces() {
  const res = await fetch(`${BASE}/places`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.places ?? [];
}

export async function searchPlaces(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/places/search?${qs}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.places ?? [];
}

export async function getPlace(id: string) {
  const res = await fetch(`${BASE}/places/${id}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.place;
}

export async function trackView(placeId: string) {
  await fetch(`${BASE}/places/${placeId}/view`, { method: "POST", headers: headers() });
}

// ─── Saved Places ───
export async function toggleSave(placeId: string, token: string) {
  const res = await fetch(`${BASE}/places/${placeId}/save`, {
    method: "POST",
    headers: headers(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.saved as boolean;
}

export async function getSavedPlaces(userId: string) {
  const res = await fetch(`${BASE}/users/${userId}/saved`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.placeIds as string[];
}

// ─── Lists ───
export async function createList(title: string, description: string, isPublic: boolean, token: string) {
  const res = await fetch(`${BASE}/lists`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ title, description, isPublic }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.list;
}

export async function getUserLists(userId: string) {
  const res = await fetch(`${BASE}/users/${userId}/lists`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.lists ?? [];
}

export async function getPublicLists() {
  const res = await fetch(`${BASE}/lists/public`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.lists ?? [];
}

export async function addPlaceToList(listId: string, placeId: string, token: string) {
  const res = await fetch(`${BASE}/lists/${listId}/places`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ placeId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.list;
}

// ─── Reviews ───
export async function addReview(placeId: string, rating: number, comment: string, token: string) {
  const res = await fetch(`${BASE}/reviews`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ placeId, rating, comment }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.review;
}

export async function getReviews(placeId: string) {
  const res = await fetch(`${BASE}/places/${placeId}/reviews`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.reviews ?? [];
}

// ─── Offers ───
export async function getOffers() {
  const res = await fetch(`${BASE}/offers`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.offers ?? [];
}

export async function createOffer(offer: Record<string, string>, token: string) {
  const res = await fetch(`${BASE}/offers`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(offer),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.offer;
}

// ─── Business dashboard ───
export async function getBusinessDashboard(placeId: string, token: string) {
  const res = await fetch(`${BASE}/business/dashboard?placeId=${placeId}`, {
    headers: headers(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// ─── Seed initial data ───
export async function seedData() {
  const res = await fetch(`${BASE}/admin/seed`, { method: "POST", headers: headers() });
  return res.json();
}
