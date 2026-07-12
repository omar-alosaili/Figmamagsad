import { createClient } from "@supabase/supabase-js";

// Production defaults. These are PUBLIC by design — the anon key is meant to
// ship in the client bundle (it already does at the live site), and the data
// is protected by Row Level Security, not by hiding these values. Baking them
// in means the deployed app works with no dashboard env config. An env var
// (e.g. .env.local for dev, or a Vercel env var) still overrides them.
const PROD_SUPABASE_URL = "https://euijhnqatqueynygjoul.supabase.co";
const PROD_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1aWpobnFhdHF1ZXlueWdqb3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODA1NTksImV4cCI6MjA5OTM1NjU1OX0.nVZ43-noeDTiv6pxDesRRMSsSCwzGIX_TC0ww0ZJXqU";

const url = import.meta.env.VITE_SUPABASE_URL || PROD_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || PROD_SUPABASE_ANON_KEY;

// Safety net: if the defaults were ever removed AND no env is set, show a
// readable "not configured" screen instead of a silent white crash.
const missing = [
  !url && "VITE_SUPABASE_URL",
  !anonKey && "VITE_SUPABASE_ANON_KEY",
].filter(Boolean) as string[];

export const configError: string[] | null = missing.length ? missing : null;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
