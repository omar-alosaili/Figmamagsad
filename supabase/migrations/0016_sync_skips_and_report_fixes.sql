-- Phase 1.1 — fixes from the adversarial review of Phase 1.

-- 1) Gate-skipped discoveries left no row, so every monthly run re-billed
--    a Place Details call for the same junk ids. Remember skips; re-check
--    only after 90 days (a thin place may mature).
create table if not exists public.sync_skips (
  google_place_id text primary key,
  reason text not null,
  last_seen timestamptz not null default now()
);
alter table public.sync_skips enable row level security;
-- service-role only: no policies.

-- 2) New audit action for trigger-driven demotions (kept visible to admins).
--    NOTE: added in its own transaction before the function that uses it.
alter type audit_action add value if not exists 'place_auto_demoted';
