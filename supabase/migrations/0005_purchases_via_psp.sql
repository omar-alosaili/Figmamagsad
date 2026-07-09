-- ============================================================
-- Phase 2 of paid lists: purchases go through the payment
-- provider (Moyasar) via the create-payment / confirm-payment
-- Edge Functions, which use the service role. Clients may no
-- longer insert purchase rows at all — the Phase 1 policy that
-- allowed direct 'paid' inserts is removed.
--
-- APPLY ONLY after the Edge Functions are deployed and verified,
-- otherwise purchasing breaks entirely.
-- ============================================================

drop policy "list_purchases_insert_own" on public.list_purchases;
