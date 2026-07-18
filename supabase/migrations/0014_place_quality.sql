-- Place quality scoring & lifecycle status (Phase 0 of the location-data
-- strategy). Score 0-100 computed from stored signals; status gates what
-- each app surface may show:
--   published   -> everywhere (search + discovery + promotions)
--   search_only -> findable in search/map, never surfaced in discovery
--   quarantined -> admin review queue only
--   retired     -> hidden everywhere (closed/duplicate); row kept so the
--                  google_place_id blocks re-ingesting the same listing
alter table places add column if not exists quality_score integer not null default 0;
alter table places add column if not exists quality_flags text[] not null default '{}';
alter table places add column if not exists status text not null default 'published'
  check (status in ('published', 'search_only', 'quarantined', 'retired'));
-- Normalized chain identity (دانكن vs دانكن دونتس vs Dunkin') — never
-- rewrites the display name.
alter table places add column if not exists brand text;

create index if not exists places_status_idx on places (status);
create index if not exists places_quality_idx on places (quality_score desc);
