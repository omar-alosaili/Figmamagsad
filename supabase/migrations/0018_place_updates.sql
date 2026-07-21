-- "Google Maps Updates" admin feature: scans PROPOSE changes into this
-- staging table; nothing touches the places table until an admin
-- approves. One pending row per (google_place_id, change_type) — a
-- re-scan refreshes the proposal instead of stacking duplicates.
create table if not exists public.place_updates (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null,
  place_id uuid references public.places(id) on delete cascade, -- null for brand-new places
  change_type text not null check (change_type in ('new', 'info', 'rating', 'closed', 'duplicate')),
  -- Snapshot of the CURRENT db values for the changed fields (null for new)
  current_values jsonb,
  -- The proposed values from Google (full insert payload for 'new')
  proposed_values jsonb not null,
  -- Which fields differ — drives the diff table in the admin UI
  diff_fields text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  scan_run_id text not null,
  scanned_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists place_updates_one_pending
  on public.place_updates (google_place_id, change_type)
  where status = 'pending';
create index if not exists place_updates_status_idx on public.place_updates (status, change_type);

alter table public.place_updates enable row level security;
-- Admins review and decide; only the service role / edge function writes proposals.
create policy "place_updates_admin_select" on public.place_updates
  for select using (public.is_admin());
create policy "place_updates_admin_update" on public.place_updates
  for update using (public.is_admin()) with check (public.is_admin());

-- Audit actions for the approval workflow
alter type audit_action add value if not exists 'sync_approve';
