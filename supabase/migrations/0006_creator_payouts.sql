-- ============================================================
-- Phase 3 of paid lists: creator payouts.
--
-- Creators accumulate a balance of 80% of their paid sales (the
-- platform keeps 20%). They request a payout; an admin marks it
-- paid after making the bank transfer. Balances are computed from
-- list_purchases at read time — no denormalized wallet.
-- ============================================================

alter type audit_action add value if not exists 'payout_paid';

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  paid_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_payout_requests_creator on public.payout_requests(creator_id, status);
create index idx_payout_requests_status on public.payout_requests(status, created_at);

alter table public.payout_requests enable row level security;

create policy "payout_requests_select_own_or_admin" on public.payout_requests
  for select using (creator_id = auth.uid() or public.is_admin());

-- Creators may request payouts for themselves; the amount is validated
-- against their real balance in the app, and admins verify before paying.
create policy "payout_requests_insert_own" on public.payout_requests
  for insert with check (
    creator_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_creator)
  );

create policy "payout_requests_admin_update" on public.payout_requests
  for update using (public.is_admin()) with check (public.is_admin());
