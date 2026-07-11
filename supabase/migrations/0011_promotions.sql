-- ============================================================
-- Promoted / curated discovery content.
--
-- Admins publish places into discovery sections ("جديد في الرياض",
-- "مقترح لك"); place owners may REQUEST promotion, which stays
-- invisible to users until an admin approves and configures it.
-- Admins control visibility (status), duration (starts/ends),
-- priority, target district, and placement.
-- ============================================================

create type promotion_placement as enum ('home_new', 'home_suggested');
create type promotion_status as enum ('pending', 'active', 'paused', 'rejected');

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null, -- null = admin-created
  status promotion_status not null default 'pending',
  placement promotion_placement not null default 'home_new',
  priority int not null default 0,          -- higher shows first
  target_district text,                     -- null = everywhere
  starts_at timestamptz not null default now(),
  ends_at timestamptz,                      -- null = until paused
  note text not null default '',            -- owner pitch / admin note
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index promotions_active_idx on public.promotions (placement, status, priority desc);

alter table public.promotions enable row level security;

-- Users see only live promotions; owners also see their own requests
-- (any status) so the dashboard can show request state; admins see all.
create policy "promotions_select" on public.promotions for select using (
  (status = 'active' and starts_at <= now() and (ends_at is null or ends_at > now()))
  or requested_by = auth.uid()
  or public.is_admin()
);

-- Owners may only file a PENDING request for their own place —
-- nothing becomes visible without admin review. Admins insert freely
-- (including directly-active curated entries).
create policy "promotions_insert_owner_pending" on public.promotions for insert with check (
  public.is_admin()
  or (requested_by = auth.uid() and public.owns_place(place_id) and status = 'pending')
);

-- Only admins change promotion state/configuration.
create policy "promotions_update_admin" on public.promotions for update
  using (public.is_admin()) with check (public.is_admin());

-- Owners may withdraw their own still-pending request; admins any.
create policy "promotions_delete" on public.promotions for delete using (
  public.is_admin() or (requested_by = auth.uid() and status = 'pending')
);

alter type audit_action add value if not exists 'promotion_update';

-- Personalized recommendations are opt-out-able (privacy setting).
alter table public.profiles
  add column if not exists personalization_opt_in boolean not null default true;
