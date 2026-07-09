// Creates a Moyasar hosted invoice for a paid list and a pending
// list_purchases row. The client is redirected to the returned URL to
// pay (mada / Apple Pay / cards); confirm-payment verifies the result
// server-side. Purchases are never trusted from the client.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const moyasarKey = Deno.env.get("MOYASAR_SECRET_KEY");
    if (!moyasarKey) return json({ error: "payment provider not configured" }, 503);

    const { listId, returnUrl } = await req.json();
    if (!listId || !/^https?:\/\//.test(returnUrl ?? "")) return json({ error: "bad request" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify the caller from their JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const buyerId = userData.user.id;

    // Validate the list is actually sellable to this user
    const { data: list } = await admin
      .from("lists")
      .select("id, title, price, is_paid, is_public, user_id")
      .eq("id", listId)
      .single();
    if (!list || !list.is_paid || !list.is_public || !list.price) {
      return json({ error: "list not purchasable" }, 400);
    }
    if (list.user_id === buyerId) return json({ error: "cannot buy own list" }, 400);

    // Reuse an existing pending purchase, refuse if already paid
    const { data: existing } = await admin
      .from("list_purchases")
      .select("id, status")
      .eq("list_id", listId)
      .eq("buyer_id", buyerId)
      .maybeSingle();
    if (existing?.status === "paid") return json({ error: "already purchased" }, 409);

    let purchaseId = existing?.id as string | undefined;
    if (!purchaseId) {
      const { data: created, error: insErr } = await admin
        .from("list_purchases")
        .insert({ list_id: listId, buyer_id: buyerId, amount: list.price, status: "pending" })
        .select("id")
        .single();
      if (insErr) return json({ error: insErr.message }, 500);
      purchaseId = created.id;
    }

    // Moyasar hosted invoice (amount in halalas)
    const res = await fetch("https://api.moyasar.com/v1/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(moyasarKey + ":"),
      },
      body: JSON.stringify({
        amount: Math.round(Number(list.price) * 100),
        currency: "SAR",
        description: `شراء قائمة: ${list.title}`,
        callback_url: `${returnUrl}?purchase_id=${purchaseId}`,
        metadata: { purchase_id: purchaseId, list_id: listId, buyer_id: buyerId },
      }),
    });
    if (!res.ok) {
      return json({ error: "moyasar: " + (await res.text()).slice(0, 200) }, 502);
    }
    const invoice = await res.json();

    await admin.from("list_purchases").update({ payment_ref: invoice.id }).eq("id", purchaseId);

    return json({ url: invoice.url, purchaseId });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
