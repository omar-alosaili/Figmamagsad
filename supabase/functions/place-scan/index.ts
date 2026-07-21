// On-demand Google Places scan for the admin "Google Maps Updates" panel.
// PROPOSES changes into place_updates — never writes to places directly.
// The client calls repeatedly with a cursor to walk the catalog in batches
// (edge functions have execution-time limits), then once with
// { finalize: true } to run duplicate detection.
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

const REFRESH_MASK = [
  "id", "displayName", "formattedAddress", "location", "businessStatus",
  "rating", "userRatingCount", "regularOpeningHours", "websiteUri", "nationalPhoneNumber",
].join(",");

const BATCH_CAP = 150;

function mapHours(place: Record<string, unknown>): string {
  const lines = (place.regularOpeningHours as { weekdayDescriptions?: string[] } | undefined)?.weekdayDescriptions;
  return Array.isArray(lines) && lines.length ? lines.join("\n") : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!googleKey) return json({ error: "scan not configured" }, 503);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Caller must be an authenticated ADMIN.
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", userData.user.id).single();
    if (profile?.role !== "admin") return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const cursor = Math.max(0, Number(body.cursor) || 0);
    const batchSize = Math.min(BATCH_CAP, Math.max(1, Number(body.batchSize) || BATCH_CAP));
    const scanRunId = String(body.scanRunId ?? crypto.randomUUID()).slice(0, 64);

    // Stage a proposal, replacing any still-pending one for the same
    // (google_place_id, change_type).
    async function propose(row: {
      google_place_id: string; place_id: string | null; change_type: string;
      current_values: unknown; proposed_values: unknown; diff_fields: string[];
    }) {
      const { data: existing } = await admin
        .from("place_updates").select("id")
        .eq("google_place_id", row.google_place_id)
        .eq("change_type", row.change_type)
        .eq("status", "pending")
        .maybeSingle();
      if (existing) {
        await admin.from("place_updates").update({
          current_values: row.current_values, proposed_values: row.proposed_values,
          diff_fields: row.diff_fields, scan_run_id: scanRunId, scanned_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await admin.from("place_updates").insert({ ...row, scan_run_id: scanRunId });
      }
    }

    // ---- finalize: duplicate detection over the whole catalog ----
    if (body.finalize === true) {
      const all: { id: string; google_place_id: string; name: string; latitude: number; longitude: number; google_review_count: number | null; status: string }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await admin
          .from("places").select("id, google_place_id, name, latitude, longitude, google_review_count, status")
          .neq("status", "retired").not("google_place_id", "is", null)
          .order("id").range(from, from + 999);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      let dupes = 0;
      const norm = (s: string) => s.toLowerCase().replace(/[^0-9a-z؀-ۿ]/g, "");
      const byName = new Map<string, typeof all>();
      for (const p of all) {
        const k = norm(p.name);
        if (!byName.has(k)) byName.set(k, []);
        byName.get(k)!.push(p);
      }
      for (const group of byName.values()) {
        if (group.length < 2) continue;
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const a = group[i], b = group[j];
            const d2 = ((a.latitude - b.latitude) * 111000) ** 2 + ((a.longitude - b.longitude) * 98000) ** 2;
            if (d2 < 150 ** 2) {
              const loser = (a.google_review_count ?? 0) <= (b.google_review_count ?? 0) ? a : b;
              const keeper = loser === a ? b : a;
              await propose({
                google_place_id: loser.google_place_id, place_id: loser.id, change_type: "duplicate",
                current_values: { name: loser.name, reviews: loser.google_review_count },
                proposed_values: { action: "retire_duplicate", keep_place_id: keeper.id, keep_name: keeper.name, keep_reviews: keeper.google_review_count },
                diff_fields: ["duplicate"],
              });
              dupes++;
            }
          }
        }
      }
      return json({ done: true, duplicatesProposed: dupes });
    }

    // ---- batch refresh-diff ----
    const { count } = await admin.from("places").select("id", { count: "exact", head: true })
      .neq("status", "retired").not("google_place_id", "is", null);
    const total = count ?? 0;

    const { data: batch, error: batchErr } = await admin
      .from("places")
      .select("id, google_place_id, name, address, opening_hours, website, phone, latitude, longitude, google_rating, google_review_count, status")
      .neq("status", "retired").not("google_place_id", "is", null)
      .order("id").range(cursor, cursor + batchSize - 1);
    if (batchErr) throw batchErr;

    let apiCalls = 0, changes = 0;
    for (const row of batch ?? []) {
      const res = await fetch(`https://places.googleapis.com/v1/places/${row.google_place_id}?languageCode=ar&regionCode=SA`, {
        headers: { "X-Goog-Api-Key": googleKey, "X-Goog-FieldMask": REFRESH_MASK },
      });
      apiCalls++;
      if (res.status === 404) {
        await propose({
          google_place_id: row.google_place_id, place_id: row.id, change_type: "closed",
          current_values: { status: row.status },
          proposed_values: { status: "retired", reason: "place_id_obsolete" },
          diff_fields: ["status"],
        });
        changes++;
        continue;
      }
      if (!res.ok) continue;
      const g = await res.json();

      if (g.businessStatus === "CLOSED_PERMANENTLY" || g.businessStatus === "CLOSED_TEMPORARILY") {
        await propose({
          google_place_id: row.google_place_id, place_id: row.id, change_type: "closed",
          current_values: { status: row.status },
          proposed_values: { status: g.businessStatus === "CLOSED_PERMANENTLY" ? "retired" : "search_only", reason: g.businessStatus },
          diff_fields: ["status"],
        });
        changes++;
        continue;
      }

      const current: Record<string, unknown> = {};
      const proposed: Record<string, unknown> = {};
      const diff: string[] = [];
      const cmp = (field: string, cur: unknown, next: unknown) => {
        if ((cur ?? "") !== (next ?? "") && next !== undefined) { current[field] = cur; proposed[field] = next; diff.push(field); }
      };
      cmp("name", row.name, g.displayName?.text);
      cmp("address", row.address, g.formattedAddress);
      cmp("opening_hours", row.opening_hours, mapHours(g));
      cmp("website", row.website, g.websiteUri ?? null);
      cmp("phone", row.phone, g.nationalPhoneNumber ?? null);
      if (typeof g.rating === "number" && g.rating !== Number(row.google_rating)) {
        current.google_rating = row.google_rating; proposed.google_rating = g.rating; diff.push("google_rating");
      }
      if (typeof g.userRatingCount === "number" && g.userRatingCount !== row.google_review_count) {
        current.google_review_count = row.google_review_count; proposed.google_review_count = g.userRatingCount; diff.push("google_review_count");
      }
      const lat = g.location?.latitude, lng = g.location?.longitude;
      if (typeof lat === "number" && typeof lng === "number") {
        const moved = Math.sqrt(((lat - row.latitude) * 111000) ** 2 + ((lng - row.longitude) * 98000) ** 2);
        if (moved > 25) { current.location = { lat: row.latitude, lng: row.longitude }; proposed.location = { lat, lng }; diff.push("location"); }
      }

      if (diff.length) {
        const onlyRating = diff.every((f) => f === "google_rating" || f === "google_review_count");
        await propose({
          google_place_id: row.google_place_id, place_id: row.id,
          change_type: onlyRating ? "rating" : "info",
          current_values: current, proposed_values: proposed, diff_fields: diff,
        });
        changes++;
      }
    }

    const nextCursor = cursor + (batch?.length ?? 0);
    return json({
      done: nextCursor >= total || (batch?.length ?? 0) < batchSize,
      cursor: nextCursor, total, processed: batch?.length ?? 0, changes, apiCalls, scanRunId,
    });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
