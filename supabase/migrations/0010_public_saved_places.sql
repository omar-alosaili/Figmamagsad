-- ============================================================
-- Saved places are now public: they appear on user profiles as part
-- of social discovery. Reads are open; only the owner may add/remove
-- their own saves.
-- ============================================================

drop policy "saved_places_own" on public.saved_places;

create policy "saved_places_select_all" on public.saved_places
  for select using (true);

create policy "saved_places_insert_own" on public.saved_places
  for insert with check (user_id = auth.uid());

create policy "saved_places_delete_own" on public.saved_places
  for delete using (user_id = auth.uid());
