# Magsad — Environments & Production Deploy

The **same codebase** runs both environments; they differ only by env vars.
No code fork.

| | Supabase project | Region | Notes |
|---|---|---|---|
| **dev** | `magsad-dev` (`eldpjxkgbkxtrhcougwd`) | Singapore | day-to-day work |
| **prod** | `magsad-prod` (`euijhnqatqueynygjoul`) | Mumbai | real users |

Both share: migrations `0001–0012` (0005 stays **unapplied** until Moyasar
goes live), the `create-payment` / `confirm-payment` edge functions, and a
public `place-photos` storage bucket.

## Hosting — Vercel

`vercel.json` (committed) pins the Vite framework, `dist` output, an SPA
fallback rewrite, and cache/security headers. To deploy:

1. **vercel.com → Add New → Project → Import** `omar-alosaili/Figmamagsad`.
   Vercel auto-detects the config; build = `pnpm build` (corepack picks up the
   pinned pnpm from `packageManager`).
2. **Project Settings → Environment Variables** (Production scope):
   ```
   VITE_SUPABASE_URL=https://euijhnqatqueynygjoul.supabase.co
   VITE_SUPABASE_ANON_KEY=<prod anon key — Supabase dashboard › Settings › API>
   VITE_GOOGLE_MAPS_API_KEY=<prod-domain-restricted key — see below>
   ```
   (The anon key is safe to expose — it's public by design; RLS protects the
   data. Verified: anon can read the 3,152-place catalog, anon writes are 401.)
3. **Deploy.** You get a `*.vercel.app` URL (or attach a custom domain).
4. **Post-deploy, add your Vercel/custom domain to:**
   - the **Google Maps key** HTTP-referrer allowlist (else the map mock-falls-back)
   - **Supabase (magsad-prod) → Authentication → URL Configuration → Site URL**

Local prod values live in `.env.production.local` (gitignored). A local prod
build (`corepack pnpm build`) inlines them into static `dist/` — verified the
prod Supabase URL is baked in and no dev URL leaks. The app is a plain SPA;
deep links use `?p=`/`?u=`/`?list=` query params.

## Manual steps before real launch (not automatable from code)

1. **Phone auth (Twilio) on prod.** The prod project has *no* auth provider yet
   — nobody can log in until you configure it. Supabase dashboard (magsad-prod)
   › Authentication › Providers › Phone → enable, paste your Twilio Account SID /
   Messaging Service SID / Auth Token. Use a **funded, non-trial** Twilio account
   for real SMS. (The dev test-number `512345678`/`123456` does **not** carry over.)
2. **First admin.** Log into prod with your real phone once auth works, then run
   an `update profiles set role='admin' where id='<your uid>'` (or ask here and
   I'll grant it). A fresh prod starts with zero users.
3. **Google Maps key.** Create a key restricted to your **production domain**
   (HTTP referrer) + the *Maps JavaScript API*, and set `VITE_GOOGLE_MAPS_API_KEY`.
   Without it the Explore map falls back to the styled mock map.
4. **Upgrade prod to Supabase Pro.** Free tier pauses after ~1 week idle and has
   no daily backups — upgrade in the dashboard before launch.
5. **Privacy policy + terms.** You collect phone numbers + (opt-in) location;
   expected in KSA and by Twilio.

## Re-syncing the prod catalog

```
node scripts/run-prod-sync.mjs   # loads .env.prod.local, runs the Google sync against prod
```

The monthly GitHub Actions sync currently targets **dev**; point its secrets at
prod (or add a second job) when you want prod on the automated schedule.
