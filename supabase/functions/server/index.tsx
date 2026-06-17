import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

const getAnonSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

// helper: get user from bearer token
async function getUser(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  const { data: { user } } = await getAnonSupabase().auth.getUser(token);
  return user;
}

/* ─────────────────────────────────────────
   HEALTH
───────────────────────────────────────── */
app.get("/make-server-33b6a600/health", (c) => c.json({ status: "ok" }));

/* ─────────────────────────────────────────
   AUTH
───────────────────────────────────────── */

// POST /auth/register
app.post("/make-server-33b6a600/auth/register", async (c) => {
  try {
    const { email, password, name, mobile } = await c.req.json();
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, mobile },
      email_confirm: true,
    });
    if (error) return c.json({ error: `Registration error: ${error.message}` }, 400);

    // store profile in kv
    await kv.set(`user:${data.user.id}:profile`, {
      id: data.user.id,
      name,
      email,
      mobile,
      bio: "",
      avatar: "",
      createdAt: new Date().toISOString(),
    });

    return c.json({ user: data.user });
  } catch (e) {
    return c.json({ error: `Unexpected error during registration: ${e}` }, 500);
  }
});

// POST /auth/login
app.post("/make-server-33b6a600/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const supabase = getAnonSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return c.json({ error: `Login error: ${error.message}` }, 401);
    return c.json({ session: data.session, user: data.user });
  } catch (e) {
    return c.json({ error: `Unexpected error during login: ${e}` }, 500);
  }
});

/* ─────────────────────────────────────────
   USERS
───────────────────────────────────────── */

// GET /users/:id
app.get("/make-server-33b6a600/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const profile = await kv.get(`user:${id}:profile`);
    if (!profile) return c.json({ error: "User not found" }, 404);
    return c.json({ user: profile });
  } catch (e) {
    return c.json({ error: `Error fetching user: ${e}` }, 500);
  }
});

// PUT /users/:id
app.put("/make-server-33b6a600/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user || user.id !== id) return c.json({ error: "Unauthorized" }, 401);

    const updates = await c.req.json();
    const existing = await kv.get(`user:${id}:profile`) as Record<string, unknown> ?? {};
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`user:${id}:profile`, updated);
    return c.json({ user: updated });
  } catch (e) {
    return c.json({ error: `Error updating user: ${e}` }, 500);
  }
});

/* ─────────────────────────────────────────
   PLACES
───────────────────────────────────────── */

// GET /places — list with optional filters
app.get("/make-server-33b6a600/places", async (c) => {
  try {
    const all = await kv.getByPrefix("place:");
    const places = all.filter((p: unknown) => p && typeof p === "object" && (p as Record<string,unknown>).id);
    return c.json({ places });
  } catch (e) {
    return c.json({ error: `Error fetching places: ${e}` }, 500);
  }
});

// GET /places/search
app.get("/make-server-33b6a600/places/search", async (c) => {
  try {
    const q = c.req.query("q") ?? "";
    const district = c.req.query("district") ?? "";
    const type = c.req.query("type") ?? "";
    const isOpen = c.req.query("isOpen");
    const isWorkFriendly = c.req.query("isWorkFriendly");
    const isFamilyFriendly = c.req.query("isFamilyFriendly");

    const all = await kv.getByPrefix("place:");
    let places = all.filter((p: unknown) => p && typeof p === "object" && (p as Record<string,unknown>).id) as Record<string,unknown>[];

    if (q) places = places.filter(p => String(p.name ?? "").includes(q) || String(p.district ?? "").includes(q));
    if (district) places = places.filter(p => p.district === district);
    if (type) places = places.filter(p => p.type === type);
    if (isOpen === "true") places = places.filter(p => p.isOpen);
    if (isWorkFriendly === "true") places = places.filter(p => p.isWorkFriendly);
    if (isFamilyFriendly === "true") places = places.filter(p => p.isFamilyFriendly);

    return c.json({ places });
  } catch (e) {
    return c.json({ error: `Error searching places: ${e}` }, 500);
  }
});

// GET /places/:id
app.get("/make-server-33b6a600/places/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const place = await kv.get(`place:${id}`);
    if (!place) return c.json({ error: "Place not found" }, 404);
    return c.json({ place });
  } catch (e) {
    return c.json({ error: `Error fetching place: ${e}` }, 500);
  }
});

// POST /places — admin only
app.post("/make-server-33b6a600/places", async (c) => {
  try {
    const data = await c.req.json();
    const id = `p_${Date.now()}`;
    const place = { ...data, id, createdAt: new Date().toISOString(), savedCount: 0, reviewCount: 0, rating: 0 };
    await kv.set(`place:${id}`, place);
    return c.json({ place }, 201);
  } catch (e) {
    return c.json({ error: `Error creating place: ${e}` }, 500);
  }
});

// PUT /places/:id
app.put("/make-server-33b6a600/places/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`place:${id}`) as Record<string,unknown> ?? {};
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`place:${id}`, updated);
    return c.json({ place: updated });
  } catch (e) {
    return c.json({ error: `Error updating place: ${e}` }, 500);
  }
});

/* ─────────────────────────────────────────
   SAVED PLACES
───────────────────────────────────────── */

// POST /places/:id/save
app.post("/make-server-33b6a600/places/:id/save", async (c) => {
  try {
    const placeId = c.req.param("id");
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const key = `saved:${user.id}:${placeId}`;
    const existing = await kv.get(key);
    if (existing) {
      await kv.del(key);
      return c.json({ saved: false });
    }
    await kv.set(key, { userId: user.id, placeId, savedAt: new Date().toISOString() });
    return c.json({ saved: true });
  } catch (e) {
    return c.json({ error: `Error saving place: ${e}` }, 500);
  }
});

// GET /users/:id/saved
app.get("/make-server-33b6a600/users/:id/saved", async (c) => {
  try {
    const userId = c.req.param("id");
    const saved = await kv.getByPrefix(`saved:${userId}:`);
    const placeIds = saved.map((s: unknown) => (s as Record<string,unknown>).placeId);
    return c.json({ placeIds });
  } catch (e) {
    return c.json({ error: `Error fetching saved places: ${e}` }, 500);
  }
});

/* ─────────────────────────────────────────
   LISTS
───────────────────────────────────────── */

// POST /lists
app.post("/make-server-33b6a600/lists", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { title, description, isPublic } = await c.req.json();
    const id = `list_${Date.now()}`;
    const list = { id, userId: user.id, title, description, isPublic, placeIds: [], likes: 0, followers: 0, createdAt: new Date().toISOString() };
    await kv.set(`list:${id}`, list);
    return c.json({ list }, 201);
  } catch (e) {
    return c.json({ error: `Error creating list: ${e}` }, 500);
  }
});

// GET /lists/:id
app.get("/make-server-33b6a600/lists/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const list = await kv.get(`list:${id}`);
    if (!list) return c.json({ error: "List not found" }, 404);
    return c.json({ list });
  } catch (e) {
    return c.json({ error: `Error fetching list: ${e}` }, 500);
  }
});

// GET /users/:id/lists
app.get("/make-server-33b6a600/users/:id/lists", async (c) => {
  try {
    const userId = c.req.param("id");
    const all = await kv.getByPrefix("list:");
    const lists = all.filter((l: unknown) => (l as Record<string,unknown>).userId === userId);
    return c.json({ lists });
  } catch (e) {
    return c.json({ error: `Error fetching user lists: ${e}` }, 500);
  }
});

// GET /lists/public — all public lists
app.get("/make-server-33b6a600/lists/public", async (c) => {
  try {
    const all = await kv.getByPrefix("list:");
    const lists = all.filter((l: unknown) => (l as Record<string,unknown>).isPublic);
    return c.json({ lists });
  } catch (e) {
    return c.json({ error: `Error fetching public lists: ${e}` }, 500);
  }
});

// POST /lists/:id/places — add place to list
app.post("/make-server-33b6a600/lists/:id/places", async (c) => {
  try {
    const listId = c.req.param("id");
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { placeId } = await c.req.json();
    const list = await kv.get(`list:${listId}`) as Record<string, unknown>;
    if (!list) return c.json({ error: "List not found" }, 404);
    if (list.userId !== user.id) return c.json({ error: "Unauthorized" }, 401);

    const placeIds = (list.placeIds as string[]) ?? [];
    if (!placeIds.includes(placeId)) placeIds.push(placeId);
    const updated = { ...list, placeIds, updatedAt: new Date().toISOString() };
    await kv.set(`list:${listId}`, updated);
    return c.json({ list: updated });
  } catch (e) {
    return c.json({ error: `Error adding place to list: ${e}` }, 500);
  }
});

// DELETE /lists/:id/places/:placeId
app.delete("/make-server-33b6a600/lists/:id/places/:placeId", async (c) => {
  try {
    const listId = c.req.param("id");
    const placeId = c.req.param("placeId");
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const list = await kv.get(`list:${listId}`) as Record<string, unknown>;
    if (!list) return c.json({ error: "List not found" }, 404);
    if (list.userId !== user.id) return c.json({ error: "Unauthorized" }, 401);

    const placeIds = ((list.placeIds as string[]) ?? []).filter((id: string) => id !== placeId);
    const updated = { ...list, placeIds, updatedAt: new Date().toISOString() };
    await kv.set(`list:${listId}`, updated);
    return c.json({ list: updated });
  } catch (e) {
    return c.json({ error: `Error removing place from list: ${e}` }, 500);
  }
});

/* ─────────────────────────────────────────
   REVIEWS
───────────────────────────────────────── */

// POST /reviews
app.post("/make-server-33b6a600/reviews", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { placeId, rating, comment } = await c.req.json();
    const id = `rev_${Date.now()}`;
    const review = { id, userId: user.id, placeId, rating, comment, createdAt: new Date().toISOString() };
    await kv.set(`review:${placeId}:${id}`, review);
    return c.json({ review }, 201);
  } catch (e) {
    return c.json({ error: `Error creating review: ${e}` }, 500);
  }
});

// GET /places/:id/reviews
app.get("/make-server-33b6a600/places/:id/reviews", async (c) => {
  try {
    const placeId = c.req.param("id");
    const reviews = await kv.getByPrefix(`review:${placeId}:`);
    return c.json({ reviews });
  } catch (e) {
    return c.json({ error: `Error fetching reviews: ${e}` }, 500);
  }
});

/* ─────────────────────────────────────────
   OFFERS
───────────────────────────────────────── */

// POST /offers — business owner
app.post("/make-server-33b6a600/offers", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { placeId, title, description, startDate, endDate, discount } = await c.req.json();
    const id = `offer_${Date.now()}`;
    const offer = { id, placeId, title, description, startDate, endDate, discount, status: "active", createdAt: new Date().toISOString() };
    await kv.set(`offer:${id}`, offer);
    return c.json({ offer }, 201);
  } catch (e) {
    return c.json({ error: `Error creating offer: ${e}` }, 500);
  }
});

// GET /offers
app.get("/make-server-33b6a600/offers", async (c) => {
  try {
    const all = await kv.getByPrefix("offer:");
    const offers = all.filter((o: unknown) => (o as Record<string,unknown>).status === "active");
    return c.json({ offers });
  } catch (e) {
    return c.json({ error: `Error fetching offers: ${e}` }, 500);
  }
});

/* ─────────────────────────────────────────
   BUSINESS — verification
───────────────────────────────────────── */

// POST /business/verify
app.post("/make-server-33b6a600/business/verify", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { placeId, documents } = await c.req.json();
    const reqId = `verif_${Date.now()}`;
    const request = { id: reqId, userId: user.id, placeId, documents, status: "pending", createdAt: new Date().toISOString() };
    await kv.set(`verification:${reqId}`, request);
    return c.json({ request }, 201);
  } catch (e) {
    return c.json({ error: `Error submitting verification: ${e}` }, 500);
  }
});

// GET /business/dashboard
app.get("/make-server-33b6a600/business/dashboard", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const placeId = c.req.query("placeId");
    if (!placeId) return c.json({ error: "placeId required" }, 400);

    const saved = await kv.getByPrefix("saved:");
    const savedCount = saved.filter((s: unknown) => (s as Record<string,unknown>).placeId === placeId).length;

    const lists = await kv.getByPrefix("list:");
    const inListsCount = lists.filter((l: unknown) => ((l as Record<string,unknown>).placeIds as string[] ?? []).includes(placeId)).length;

    const reviews = await kv.getByPrefix(`review:${placeId}:`);
    const viewKey = `views:${placeId}`;
    const viewData = await kv.get(viewKey) as Record<string,unknown> ?? { count: 0 };

    return c.json({
      savedCount,
      inListsCount,
      reviewCount: reviews.length,
      views: viewData.count ?? 0,
    });
  } catch (e) {
    return c.json({ error: `Error fetching dashboard: ${e}` }, 500);
  }
});

// POST /places/:id/view — track views
app.post("/make-server-33b6a600/places/:id/view", async (c) => {
  try {
    const placeId = c.req.param("id");
    const key = `views:${placeId}`;
    const current = await kv.get(key) as Record<string,unknown> ?? { count: 0 };
    await kv.set(key, { count: (current.count as number ?? 0) + 1 });
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: `Error tracking view: ${e}` }, 500);
  }
});

/* ─────────────────────────────────────────
   FOLLOWS
───────────────────────────────────────── */

// POST /follows/:userId
app.post("/make-server-33b6a600/follows/:userId", async (c) => {
  try {
    const followedId = c.req.param("userId");
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const key = `follow:${user.id}:${followedId}`;
    const existing = await kv.get(key);
    if (existing) {
      await kv.del(key);
      return c.json({ following: false });
    }
    await kv.set(key, { followerId: user.id, followedId, createdAt: new Date().toISOString() });
    return c.json({ following: true });
  } catch (e) {
    return c.json({ error: `Error following user: ${e}` }, 500);
  }
});

/* ─────────────────────────────────────────
   SEED — initial places data
───────────────────────────────────────── */
app.post("/make-server-33b6a600/admin/seed", async (c) => {
  try {
    const places = [
      { id:"1", name:"ماتشا تايم", type:"كافيه", category:"مشروبات", district:"العليا", address:"طريق الملك فهد، العليا", image:"https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop", priceLevel:2, rating:4.8, reviewCount:234, isFamilyFriendly:true, isKidsFriendly:false, isWorkFriendly:true, hasOutdoorSeating:true, hasParking:true, openingHours:"٨ص – ١١م", isOpen:true, isNew:true, isVerified:true, description:"كافيه متخصص في الماتشا الياباني والمشروبات الصحية.", tags:["ماتشا","صحي","هادئ"], savedCount:0 },
      { id:"2", name:"بلو ووتر", type:"كافيه", category:"قهوة مختصة", district:"حي السفارات", address:"شارع الأمير سلطان", image:"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop", priceLevel:3, rating:4.9, reviewCount:512, isFamilyFriendly:true, isKidsFriendly:true, isWorkFriendly:true, hasOutdoorSeating:true, hasParking:true, openingHours:"٧ص – ١٢م", isOpen:true, isNew:false, isVerified:true, description:"من أفضل كافيهات القهوة المختصة في الرياض.", tags:["قهوة مختصة","فخم"], savedCount:0 },
      { id:"3", name:"مطعم نوره", type:"مطعم", category:"سعودي", district:"الملقا", address:"طريق أنس بن مالك", image:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop", priceLevel:2, rating:4.7, reviewCount:891, isFamilyFriendly:true, isKidsFriendly:true, isWorkFriendly:false, hasOutdoorSeating:false, hasParking:true, openingHours:"١ظ – ١١م", isOpen:true, isNew:false, isVerified:true, description:"مطعم سعودي أصيل يقدم أشهى المأكولات المحلية.", tags:["سعودي","عائلي"], savedCount:0 },
      { id:"4", name:"ذا روستري", type:"كافيه", category:"قهوة مختصة", district:"النخيل", address:"طريق الملك عبدالله", image:"https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop", priceLevel:2, rating:4.6, reviewCount:367, isFamilyFriendly:false, isKidsFriendly:false, isWorkFriendly:true, hasOutdoorSeating:false, hasParking:false, openingHours:"٩ص – ١٠م", isOpen:true, isNew:true, isVerified:true, description:"كافيه متخصص في تحميص القهوة.", tags:["قهوة","للعمل","جديد"], savedCount:0 },
      { id:"5", name:"جلسة", type:"كافيه", category:"كافيه", district:"الربوة", address:"شارع الوادي", image:"https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&h=600&fit=crop", priceLevel:1, rating:4.5, reviewCount:198, isFamilyFriendly:true, isKidsFriendly:true, isWorkFriendly:false, hasOutdoorSeating:true, hasParking:true, openingHours:"٤م – ١٢م", isOpen:false, isNew:false, isVerified:false, description:"كافيه دافئ بأجواء عائلية رائعة.", tags:["عائلي","خارجي"], savedCount:0 },
      { id:"6", name:"سحاب", type:"مطعم", category:"فطور وغداء", district:"الغدير", address:"طريق الدائري الشمالي", image:"https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&h=600&fit=crop", priceLevel:2, rating:4.8, reviewCount:445, isFamilyFriendly:true, isKidsFriendly:true, isWorkFriendly:false, hasOutdoorSeating:true, hasParking:true, openingHours:"٦ص – ٤م", isOpen:true, isNew:false, isVerified:true, description:"أفضل مكان للفطور في الرياض.", tags:["فطور","عائلي"], savedCount:0 },
      { id:"7", name:"هايد", type:"كافيه", category:"كافيه عصري", district:"العليا", address:"برج المملكة", image:"https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop", priceLevel:3, rating:4.7, reviewCount:623, isFamilyFriendly:false, isKidsFriendly:false, isWorkFriendly:true, hasOutdoorSeating:false, hasParking:true, openingHours:"٨ص – ١م", isOpen:true, isNew:false, isVerified:true, description:"كافيه فاخر في قلب العليا.", tags:["فاخر","للعمل"], savedCount:0 },
      { id:"8", name:"فيراندا", type:"مطعم", category:"متنوع", district:"الورود", address:"شارع العروبة", image:"https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=600&fit=crop", priceLevel:2, rating:4.6, reviewCount:312, isFamilyFriendly:true, isKidsFriendly:true, isWorkFriendly:false, hasOutdoorSeating:true, hasParking:true, openingHours:"١٢ظ – ١١م", isOpen:true, isNew:true, isVerified:false, description:"مطعم عصري بأجواء جميلة وجلسات خارجية.", tags:["عائلي","خارجي","جديد"], savedCount:0 },
    ];
    for (const p of places) await kv.set(`place:${p.id}`, p);
    return c.json({ seeded: places.length });
  } catch (e) {
    return c.json({ error: `Seed error: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);
