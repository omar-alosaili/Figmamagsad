-- ============================================================
-- Hardening for promotions (QA follow-ups to 0011).
--
-- 1. An owner's promotion REQUEST must not pre-set admin-only config
--    (priority / target_district / schedule). The insert policy now
--    forces those to defaults; only admins set them (via update or a
--    direct createAdminPromotion). Owners still choose the placement
--    (which section they're requesting) and write a pitch note.
-- 2. Prevent duplicate active promotions of the same place in the same
--    section.
-- ============================================================

drop policy "promotions_insert_owner_pending" on public.promotions;
create policy "promotions_insert_owner_pending" on public.promotions for insert with check (
  public.is_admin()
  or (
    requested_by = auth.uid()
    and public.owns_place(place_id)
    and status = 'pending'
    and priority = 0
    and target_district is null
    and ends_at is null
  )
);

-- One active promotion per (place, placement). Partial unique index so
-- rejected/paused history and multiple pending requests don't collide,
-- but two live entries in the same section can't coexist.
create unique index if not exists promotions_one_active_per_placement
  on public.promotions (place_id, placement)
  where status = 'active';
