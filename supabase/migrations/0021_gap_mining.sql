-- Gap mining (Phase 3): fsq_places rows not yet in the catalog are
-- discovery LEADS. gap_checked_at marks a lead as processed so tranches
-- never re-search the same venue.
alter table public.fsq_places add column if not exists gap_checked_at timestamptz;
alter table public.fsq_places add column if not exists gap_result text; -- linked | proposed | skipped | no_match
create index if not exists fsq_places_gap_idx
  on public.fsq_places (date_refreshed desc)
  where date_closed is null and gap_checked_at is null;
