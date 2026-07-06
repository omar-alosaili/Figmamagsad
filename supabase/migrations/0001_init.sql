-- ============================================================
-- Magsad — initial schema, triggers, RLS, storage
-- ============================================================

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";

-- 1. ENUMS
create type user_role as enum ('user', 'business', 'admin');
create type place_type as enum ('كافيه', 'مطعم');
create type visit_status as enum ('visited', 'want_to_visit');
create type verification_status as enum ('pending', 'approved', 'rejected');
create type report_status as enum ('open', 'resolved', 'dismissed');
create type notification_type as enum ('offer', 'follow', 'save', 'verify', 'new');
create type audit_action as enum ('verify_approve','verify_reject','report_resolve','report_dismiss','place_create','place_update','place_delete');

-- 2. PROFILES (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  username text unique,
  avatar_url text,
  bio text not null default '',
  role user_role not null default 'user',
  owned_place_id uuid,
  notification_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. PLACES
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text not null default '',
  type place_type not null,
  category text not null default '',
  district text not null default '',
  address text not null default '',
  image text not null default '',
  images text[] not null default '{}',
  price_level smallint not null default 2 check (price_level in (1,2,3)),
  rating numeric(2,1) not null default 0,
  review_count integer not null default 0,
  is_family_friendly boolean not null default false,
  is_kids_friendly boolean not null default false,
  is_work_friendly boolean not null default false,
  has_outdoor_seating boolean not null default false,
  has_parking boolean not null default false,
  opening_hours text not null default '',
  is_open boolean not null default true,
  is_new boolean not null default false,
  is_verified boolean not null default false,
  description text not null default '',
  tags text[] not null default '{}',
  order_link text,
  booking_link text,
  latitude double precision not null,
  longitude double precision not null,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_owned_place_fk
  foreign key (owned_place_id) references public.places(id) on delete set null;

-- 4. LISTS
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  is_public boolean not null default true,
  cover_image text not null default '',
  likes integer not null default 0,
  followers integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.list_places (
  list_id uuid not null references public.lists(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, place_id)
);

create table public.list_likes (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table public.list_follows (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

-- 5. OFFERS
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  title text not null,
  description text not null default '',
  discount text,
  start_date date,
  end_date date not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 6. REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);

-- 7. SAVED_PLACES / VISITED_PLACES
create table public.saved_places (
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table public.visited_places (
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  status visit_status not null,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

-- 8. USER_FOLLOWS
create table public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- 9. NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null default '',
  image text,
  related_place_id uuid references public.places(id) on delete set null,
  related_user_id uuid references public.profiles(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 10. VERIFICATION_REQUESTS
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status verification_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 11. REPORTS
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references public.places(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status report_status not null default 'open',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (place_id is not null or review_id is not null)
);

-- 12. USER_INTERESTS
create table public.user_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  interest_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, interest_id)
);

-- 13. AUDIT_LOG (admin activity feed)
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action audit_action not null,
  target_table text not null,
  target_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

-- 14. INDEXES
create index idx_places_district on public.places(district);
create index idx_places_type on public.places(type);
create index idx_places_owner on public.places(owner_id);
create index idx_lists_user on public.lists(user_id);
create index idx_list_places_place on public.list_places(place_id);
create index idx_offers_place on public.offers(place_id);
create index idx_offers_active_end on public.offers(is_active, end_date);
create index idx_reviews_place on public.reviews(place_id);
create index idx_saved_places_user on public.saved_places(user_id);
create index idx_visited_places_user on public.visited_places(user_id);
create index idx_notifications_user_unread on public.notifications(user_id, is_read);
create index idx_verification_status on public.verification_requests(status);
create index idx_reports_status on public.reports(status);
create index idx_audit_log_created on public.audit_log(created_at desc);

-- 15. TRIGGERS

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), coalesce(new.raw_user_meta_data->>'username', null));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.update_place_rating()
returns trigger as $$
declare target_place_id uuid;
begin
  target_place_id := coalesce(new.place_id, old.place_id);
  update public.places
  set rating = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where place_id = target_place_id), 0),
      review_count = (select count(*) from public.reviews where place_id = target_place_id),
      updated_at = now()
  where id = target_place_id;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_reviews_after_change
  after insert or update or delete on public.reviews
  for each row execute function public.update_place_rating();

create function public.update_list_likes()
returns trigger as $$
declare target_list_id uuid;
begin
  target_list_id := coalesce(new.list_id, old.list_id);
  update public.lists set likes = (select count(*) from public.list_likes where list_id = target_list_id) where id = target_list_id;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_list_likes_after_change
  after insert or delete on public.list_likes
  for each row execute function public.update_list_likes();

create function public.update_list_followers()
returns trigger as $$
declare target_list_id uuid;
begin
  target_list_id := coalesce(new.list_id, old.list_id);
  update public.lists set followers = (select count(*) from public.list_follows where list_id = target_list_id) where id = target_list_id;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_list_follows_after_change
  after insert or delete on public.list_follows
  for each row execute function public.update_list_followers();

create function public.touch_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger trg_places_touch before update on public.places for each row execute function public.touch_updated_at();
create trigger trg_lists_touch before update on public.lists for each row execute function public.touch_updated_at();

create function public.sync_place_verified()
returns trigger as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    update public.places set is_verified = true where id = new.place_id;
  elsif new.status = 'rejected' and (old.status is distinct from 'rejected') then
    update public.places set is_verified = false where id = new.place_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_verification_sync
  after update on public.verification_requests
  for each row execute function public.sync_place_verified();

-- ============================================================
-- 16. STORAGE (business place-photo upload)
-- ============================================================
insert into storage.buckets (id, name, public) values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;

create policy "place_photos_public_read" on storage.objects
  for select using (bucket_id = 'place-photos');

create policy "place_photos_owner_write" on storage.objects
  for insert with check (bucket_id = 'place-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "place_photos_owner_delete" on storage.objects
  for delete using (bucket_id = 'place-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 17. RLS HELPER FUNCTIONS
-- ============================================================
create function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create function public.owns_place(p_place_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.places where id = p_place_id and owner_id = auth.uid());
$$;

-- ============================================================
-- 18. ENABLE RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.lists enable row level security;
alter table public.list_places enable row level security;
alter table public.list_likes enable row level security;
alter table public.list_follows enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;
alter table public.saved_places enable row level security;
alter table public.visited_places enable row level security;
alter table public.user_follows enable row level security;
alter table public.notifications enable row level security;
alter table public.verification_requests enable row level security;
alter table public.reports enable row level security;
alter table public.user_interests enable row level security;
alter table public.audit_log enable row level security;

-- ============================================================
-- 19. RLS POLICIES
-- ============================================================

-- PROFILES
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles_admin_update_role" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- PLACES
create policy "places_select_all" on public.places for select using (true);
create policy "places_business_update_own" on public.places
  for update using (public.owns_place(id))
  with check (public.owns_place(id) and is_verified = (select is_verified from public.places where id = places.id));
create policy "places_admin_all" on public.places for all using (public.is_admin()) with check (public.is_admin());

-- LISTS
create policy "lists_select_public_or_own" on public.lists
  for select using (is_public = true or user_id = auth.uid() or public.is_admin());
create policy "lists_insert_own" on public.lists for insert with check (user_id = auth.uid());
create policy "lists_update_own" on public.lists for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "lists_delete_own" on public.lists for delete using (user_id = auth.uid() or public.is_admin());

-- LIST_PLACES
create policy "list_places_select" on public.list_places
  for select using (exists (select 1 from public.lists l where l.id = list_id and (l.is_public or l.user_id = auth.uid())));
create policy "list_places_modify_own_list" on public.list_places
  for all using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

-- LIST_LIKES / LIST_FOLLOWS
create policy "list_likes_select_all" on public.list_likes for select using (true);
create policy "list_likes_own" on public.list_likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "list_follows_select_all" on public.list_follows for select using (true);
create policy "list_follows_own" on public.list_follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- OFFERS
create policy "offers_select_all" on public.offers for select using (true);
create policy "offers_business_manage_own" on public.offers for all using (public.owns_place(place_id)) with check (public.owns_place(place_id));
create policy "offers_admin_all" on public.offers for all using (public.is_admin()) with check (public.is_admin());

-- REVIEWS
create policy "reviews_select_all" on public.reviews for select using (true);
create policy "reviews_insert_own" on public.reviews for insert with check (user_id = auth.uid());
create policy "reviews_update_own" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reviews_delete_own_or_admin" on public.reviews for delete using (user_id = auth.uid() or public.is_admin());

-- SAVED_PLACES / VISITED_PLACES / USER_INTERESTS
create policy "saved_places_own" on public.saved_places for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "visited_places_own" on public.visited_places for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_interests_own" on public.user_interests for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- USER_FOLLOWS
create policy "user_follows_select_all" on public.user_follows for select using (true);
create policy "user_follows_own" on public.user_follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- NOTIFICATIONS
create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_admin_all" on public.notifications for all using (public.is_admin()) with check (public.is_admin());

-- VERIFICATION_REQUESTS
create policy "verification_select_own_or_admin" on public.verification_requests
  for select using (requested_by = auth.uid() or public.is_admin() or public.owns_place(place_id));
create policy "verification_insert_business_owner" on public.verification_requests
  for insert with check (requested_by = auth.uid() and public.owns_place(place_id));
create policy "verification_admin_update" on public.verification_requests
  for update using (public.is_admin()) with check (public.is_admin());

-- REPORTS
create policy "reports_insert_any_authenticated" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports_select_own_or_admin" on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_admin_update" on public.reports for update using (public.is_admin()) with check (public.is_admin());
create policy "reports_admin_delete" on public.reports for delete using (public.is_admin());

-- AUDIT_LOG
create policy "audit_log_admin_select" on public.audit_log for select using (public.is_admin());
create policy "audit_log_admin_insert" on public.audit_log for insert with check (public.is_admin());
