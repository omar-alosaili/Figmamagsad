// Feature flags. Nothing is deleted when a flag is off — UI entry points
// hide and public surfaces filter the related content, but all data,
// RLS policies, and Edge Functions stay intact. Flip to true to relaunch.
export const FEATURES = {
  // Paid creator lists: selling/buying lists, price badges, the creator
  // dashboard (لوحتي), admin payouts + economy stats. Hidden until the
  // payment provider (Moyasar) is live and the product is ready.
  paidLists: false,
};
