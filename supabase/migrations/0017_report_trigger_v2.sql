-- Phase 1.1 (part 2) — report-trigger fixes:
--   - flag ANY reported place (search_only rows were invisible to the
--     admin review queue),
--   - demote only published ones,
--   - leave an audit_log row so mass demotion is visible to admins.
create or replace function public.demote_reported_place()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.place_id is not null then
    if (select count(distinct reporter_id) from public.reports
         where place_id = new.place_id and status = 'open') >= 2 then
      update public.places
         set quality_flags = (
               select array_agg(distinct f) from unnest(quality_flags || array['user_reported']) as f
             ),
             status = case when status = 'published' then 'search_only' else status end
       where id = new.place_id;
      insert into public.audit_log (actor_id, action, target_table, target_id, detail)
      values (new.reporter_id, 'place_auto_demoted', 'places', new.place_id,
              'تخفيض تلقائي بعد بلاغين من مستخدمين مختلفين');
    end if;
  end if;
  return new;
end $$;
