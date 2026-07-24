-- Review reporting (moderation loop for reviews and their photos).
--
-- 1) Dedup: one OPEN report per user per review, mirroring the
--    place-report index from 0015. NULL review_ids (place reports)
--    never collide because NULLs are distinct in unique indexes.
create unique index if not exists reports_one_open_per_user_review
  on public.reports (review_id, reporter_id)
  where status = 'open' and review_id is not null;

-- 2) When an admin deletes a reported review, its photos in the
--    user-photos bucket must go too — the bucket only allowed owners to
--    delete their own files, which left admin deletions orphaning storage.
create policy "user_photos_delete_admin" on storage.objects
  for delete using (bucket_id = 'user-photos' and public.is_admin());
