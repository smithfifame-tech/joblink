"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

/** Client navigateur (clé anonyme uniquement — soumis aux politiques RLS). */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  }
  return browserClient;
}
