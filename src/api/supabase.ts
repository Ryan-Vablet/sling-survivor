/**
 * Supabase client for leaderboard. Only created when env vars are set.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (url && anonKey) {
    client = createClient(url, anonKey);
    return client;
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  return !!(url && anonKey);
}
