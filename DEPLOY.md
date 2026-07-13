# Magsad — Environment & Deploy

**Single environment: production.** (The separate `magsad-dev` Supabase
project was deleted 2026-07-13 — local development runs against prod.)

| | Value |
|---|---|
| Live site | https://magsad.app (Vercel, auto-deploys on push to `main`) |
| Repo | `omar-alosaili/magsad_prd` |
| Supabase | `magsad-prod` (`euijhnqatqueynygjoul`), Mumbai `ap-south-1` |
| Auth | Phone OTP via **Twilio Verify** (real SMS, KSA-capable) |

Applied to Supabase: migrations `0001–0013` (**0005 stays unapplied** until
Moyasar goes live), `create-payment` / `confirm-payment` edge functions, and
the public `place-photos` storage bucket.

## Local development

```
corepack pnpm dev        # port 5173 — talks to the LIVE prod database
corepack pnpm build      # production build (what Vercel runs)
```

`.env.local` holds the public client config (Supabase URL + anon key, Google
Maps key). The same values are also baked into the source as fallbacks
(`src/app/lib/supabase.ts`, `ExplorePage.tsx`), so the app works even with no
env file. All of these are safe-public: the anon key is guarded by RLS, the
Maps key by its HTTP-referrer allowlist.

> ⚠️ There is no staging database anymore — anything you do while testing
> locally (saves, reviews, admin actions) hits the real magsad.app data.

Secrets (never client-side): `.env.prod.local` (gitignored) has the service
role key, Google Places server key, and the Supabase Management API token —
used only by sync/admin scripts.

## Hosting — Vercel

`vercel.json` (committed) pins the Vite framework, `dist` output, an SPA
fallback rewrite, and cache/security headers. Push to `main` → auto-deploy.
Deep links use `?p=`/`?u=`/`?list=` query params.

The Google Maps key referrer allowlist covers `magsad.app/*`,
`*.magsad.app/*`, `*.vercel.app/*`, `localhost:5173/*`.

## Catalog sync

- **Scheduled:** `.github/workflows/sync-google-places.yml` runs monthly
  (1st, 03:00 UTC) against prod using the `PROD_*` repo secrets. This is what
  keeps "جديد في الرياض" fresh — new places it discovers get a recent
  `created_at`.
- **Manual:** `node scripts/run-prod-sync.mjs` (loads `.env.prod.local`).

## Remaining launch chores (user-owned)

1. **Rotate the Twilio Auth Token** (was displayed once in a private session
   log) — regenerate in Twilio, update in Supabase → Auth → Phone provider.
2. **Upgrade Supabase to Pro** — free tier pauses after ~1 week idle and has
   no daily backups.
3. **Privacy policy + terms** — the app collects phone numbers and (opt-in)
   location.
4. **Google Cloud billing budget alert** — the Maps browser key is public.
