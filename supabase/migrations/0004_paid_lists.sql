-- ============================================================
-- Magsad — Phase 1 of paid creator lists.
--
-- Creators (profiles.is_creator) can mark a list as paid with a
-- price. List METADATA stays publicly visible for discovery, but
-- list_places rows are hidden until the viewer owns the list or
-- has a 'paid' row in list_purchases. Because RLS hides the rows,
-- lists carry a trigger-maintained place_count so a locked list
-- can still advertise how many places it contains.
--
-- Phase 1 has no payment provider: the app inserts purchases with
-- status 'paid' directly (see list_purchases_insert_own policy).
-- Phase 2 must tighten that policy to 'pending' only and let a
-- payment webhook (service role) flip rows to 'paid'.
-- ============================================================

alter table public.profiles
  add column is_creator boolean not null default false;

alter table public.lists
  add column is_paid boolean not null default false,
  add column price numeric(8,2),
  add column place_count integer not null default 0;

-- Paid lists must have a positive price
alter table public.lists
  add constraint lists_paid_price check (not is_paid or (price is not null and price > 0));

-- Backfill place_count for existing lists
update public.lists
  set place_count = (select count(*) from public.list_places lp where lp.list_id = lists.id);

create function public.sync_list_place_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.lists set place_count = place_count + 1 where id = new.list_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.lists set place_count = greatest(0, place_count - 1) where id = old.list_id;
    return old;
  end if;
  return null;
end $$;

create trigger trg_sync_list_place_count
  after insert or delete on public.list_places
  for each row execute function public.sync_list_place_count();

-- PURCHASES
create table public.list_purchases (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(8,2) not null,
  currency text not null default 'SAR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded')),
  payment_ref text,
  purchased_at timestamptz not null default now(),
  unique (list_id, buyer_id)
);

create index idx_list_purchases_buyer on public.list_purchases(buyer_id, status);
create index idx_list_purchases_list on public.list_purchases(list_id, status);

alter table public.list_purchases enable row level security;

create policy "list_purchases_select_own" on public.list_purchases
  for select using (
    buyer_id = auth.uid()
    or public.is_admin()
    -- creators can see purchases of their own lists (earnings)
    or exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid())
  );

-- PHASE 1 ONLY: the client "buys" by inserting a paid row directly.
-- Phase 2: restrict to status = 'pending' and let the payment webhook
-- (service role, bypasses RLS) mark rows paid.
create policy "list_purchases_insert_own" on public.list_purchases
  for insert with check (
    buyer_id = auth.uid()
    -- can't buy your own list, and only real paid lists are purchasable
    and exists (select 1 from public.lists l
                where l.id = list_id and l.is_paid and l.is_public and l.user_id <> auth.uid())
  );

-- Gate list contents behind purchase for paid lists
drop policy "list_places_select" on public.list_places;
create policy "list_places_select" on public.list_places
  for select using (
    exists (
      select 1 from public.lists l
      where l.id = list_id
        and (
          l.user_id = auth.uid()
          or public.is_admin()
          or (l.is_public and not l.is_paid)
          or (l.is_public and l.is_paid and exists (
                select 1 from public.list_purchases p
                where p.list_id = l.id and p.buyer_id = auth.uid() and p.status = 'paid'))
        )
    )
  );

-- Only creators may publish paid lists (free lists unchanged)
drop policy "lists_insert_own" on public.lists;
create policy "lists_insert_own" on public.lists
  for insert with check (
    user_id = auth.uid()
    and (not is_paid or exists (
          select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_creator))
  );
