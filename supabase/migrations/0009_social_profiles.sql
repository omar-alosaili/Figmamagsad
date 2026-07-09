-- ============================================================
-- Social profiles: unique usernames, social links, location, and
-- private follow counts. (username column already existed, unused.)
-- ============================================================

alter table public.profiles
  add column if not exists location text,
  add column if not exists instagram text,
  add column if not exists x_handle text,
  add column if not exists tiktok text,
  add column if not exists snapchat text,
  add column if not exists website text;

-- Case-insensitive uniqueness + fast prefix search on username.
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- Follower/following counts are private (owner + admin only). Reading
-- follow rows is limited to relationships the caller is part of, so
-- nobody can count another user's followers. The app still gets:
--   - "who I follow" (follower_id = me) for the feed and follow states
--   - "who follows me" (followee_id = me) for my own counts
-- Admins can read everything for moderation.
drop policy if exists "user_follows_select_all" on public.user_follows;
drop policy if exists "user_follows_select_involved_or_admin" on public.user_follows;
create policy "user_follows_select_involved_or_admin" on public.user_follows
  for select using (
    follower_id = auth.uid() or followee_id = auth.uid() or public.is_admin()
  );
