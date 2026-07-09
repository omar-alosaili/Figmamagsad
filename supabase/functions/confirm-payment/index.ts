// Verifies a purchase against Moyasar (server-side, secret key) and
// marks it paid. Called by the app after returning from the hosted
// checkout — the client never flips a purchase to paid itself.
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

    const { purchaseId } = await req.json();
    if (!purchaseId) return json({ error: "bad request" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);

    // The purchase must belong to the caller
    const { data: purchase } = await admin
      .from("list_purchases")
      .select("id, status, payment_ref, buyer_id")
      .eq("id", purchaseId)
      .eq("buyer_id", userData.user.id)
      .maybeSingle();
    if (!purchase) return json({ error: "purchase not found" }, 404);
    if (purchase.status === "paid") return json({ status: "paid" });
    if (!purchase.payment_ref) return json({ status: purchase.status });

    // Ask Moyasar for the truth
    const res = await fetch(`https://api.moyasar.com/v1/invoices/${purchase.payment_ref}`, {
      headers: { Authorization: "Basic " + btoa(moyasarKey + ":") },
    });
    if (!res.ok) {
      return json({ error: "moyasar: " + (await res.text()).slice(0, 200) }, 502);
    }
    const invoice = await res.json();

    if (invoice.status === "paid") {
      const { error: updErr } = await admin
        .from("list_purchases")
        .update({ status: "paid" })
        .eq("id", purchase.id);
      if (updErr) return json({ error: updErr.message }, 500);
      return json({ status: "paid" });
    }

    return json({ status: invoice.status });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
