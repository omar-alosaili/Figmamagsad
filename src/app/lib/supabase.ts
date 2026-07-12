import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Report a misconfiguration instead of throwing at module load. Throwing
// here crashes before React can mount → a silent white screen that's hard
// to diagnose. main.tsx reads configError and renders a readable message.
const missing = [
  !url && "VITE_SUPABASE_URL",
  !anonKey && "VITE_SUPABASE_ANON_KEY",
].filter(Boolean) as string[];

export const configError: string[] | null = missing.length ? missing : null;

// Placeholders keep createClient from throwing when env vars are missing;
// the app renders the config screen instead of ever calling Supabase.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } },
);
