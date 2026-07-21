-- Phase 3 start: the OWNED data layer.
--
-- 1) fsq_places — the FSQ OS Places Riyadh dining subset (Apache 2.0:
--    ours to store, merge, and correct forever). Serves as the compliant
--    storable base for matched places and the discovery pool for the
--    ~42k open places Magsad doesn't have yet.
create table if not exists public.fsq_places (
  fsq_place_id text primary key,
  name text not null,
  latitude double precision,
  longitude double precision,
  address text,
  locality text,
  tel text,
  website text,
  categories text[],
  date_created text,
  date_refreshed text,
  date_closed text,
  dataset_release text not null default '2024-11-19',
  imported_at timestamptz not null default now()
);
alter table public.fsq_places enable row level security;
-- Service-role only for now (no app reads yet); no policies.

-- 2) Link matched catalog rows to their FSQ identity.
alter table places add column if not exists fsq_place_id text references public.fsq_places(fsq_place_id);
create index if not exists places_fsq_idx on places (fsq_place_id) where fsq_place_id is not null;

-- 3) First-party review photos.
alter table reviews add column if not exists photos text[] not null default '{}';

-- 4) User-photos storage bucket: authenticated users upload under their
--    own uid folder; everyone can view.
insert into storage.buckets (id, name, public)
values ('user-photos', 'user-photos', true)
on conflict (id) do nothing;

create policy "user_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_photos_read_all" on storage.objects
  for select using (bucket_id = 'user-photos');
create policy "user_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-photos' and (storage.foldername(name))[1] = auth.uid()::text);
