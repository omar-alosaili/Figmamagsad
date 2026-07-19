-- Phase 1 of the location-data strategy.
-- 1) Enrichment fields the new Place Details pipeline fetches (website/
--    phone are quality signals: thin auto-created listings rarely have
--    them). Feeds the +10 score component reserved in the Phase-0 model.
alter table places add column if not exists website text;
alter table places add column if not exists phone text;

-- 2) One OPEN place-report per user per place — repeat taps update
--    nothing instead of stacking duplicates.
create unique index if not exists reports_one_open_per_user_place
  on public.reports (place_id, reporter_id)
  where status = 'open' and place_id is not null;

-- 3) Auto-demotion: when two DIFFERENT users have open reports against a
--    published place, demote it to search_only (out of discovery) until
--    an admin reviews. Flag marks it for the sync's priority refresh.
create or replace function public.demote_reported_place()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.place_id is not null then
    if (select count(distinct reporter_id) from public.reports
         where place_id = new.place_id and status = 'open') >= 2 then
      update public.places
         set status = 'search_only',
             quality_flags = (
               select array_agg(distinct f) from unnest(quality_flags || array['user_reported']) as f
             )
       where id = new.place_id and status = 'published';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_reports_demote on public.reports;
create trigger trg_reports_demote after insert on public.reports
  for each row execute function public.demote_reported_place();
