import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
export const isSupabaseConfigured = /^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)
  && key.startsWith("sb_publishable_") && !key.includes("REEMPLAZAR");
let client: SupabaseClient | undefined;

// No client or network request is created until configuration is present.
export function getSupabase() {
  if (!isSupabaseConfigured) throw new Error("Falta conectar Supabase.");
  return client ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

export type { User, Session } from "@supabase/supabase-js";
