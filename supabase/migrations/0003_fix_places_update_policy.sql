-- ============================================================
-- Fix places_business_update_own policy.
--
-- The old WITH CHECK tried to stop owners from flipping their own
-- is_verified flag via a correlated subquery:
--   is_verified = (select is_verified from public.places where id = places.id)
-- but inside the subquery `places.id` binds to the subquery's own scan
-- (i.e. `where id = id`), returning every row — so any owner UPDATE
-- failed with "more than one row returned by a subquery used as an
-- expression" as soon as the table had more than one row.
--
-- Postgres RLS has no OLD/NEW, so guard is_verified with a trigger
-- instead and keep the policy simple.
-- ============================================================

drop policy "places_business_update_own" on public.places;
create policy "places_business_update_own" on public.places
  for update using (public.owns_place(id))
  with check (public.owns_place(id));

create function public.prevent_owner_verify_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only admins may change is_verified. auth.uid() is null for
  -- service-role jobs (e.g. the Google sync), which stay unrestricted.
  if new.is_verified is distinct from old.is_verified
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'only admins can change is_verified';
  end if;
  return new;
end $$;

create trigger trg_prevent_owner_verify_change
  before update on public.places
  for each row execute function public.prevent_owner_verify_change();
