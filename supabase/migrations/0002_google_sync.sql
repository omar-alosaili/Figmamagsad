-- ============================================================
-- Magsad — Google Places sync support
-- Adds columns to track Google-sourced base facts separately
-- from manually curated editorial fields.
-- ============================================================

alter table public.places
  add column source text not null default 'manual' check (source in ('manual', 'google')),
  add column google_place_id text unique,
  add column google_synced_at timestamptz,
  add column google_rating numeric(2,1),
  add column google_review_count integer;

create index idx_places_google_place_id on public.places(google_place_id);
