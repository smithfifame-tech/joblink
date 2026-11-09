import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Appels serveur à privilèges minimaux (fonctions SQL srv_*), authentifiés par la clé interne
 * INTERNAL_RPC_KEY (jamais exposée au navigateur). Remplace la clé service_role : chaque fonction
 * ne réalise qu'une opération précise (webhook, contact, limitation de débit…).
 */
let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

export function serverRpcConfigured(): boolean {
  return isSupabaseConfigured() && serverEnv.internalRpcKey.length >= 32;
}

export async function serverRpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: { message: string } | null }> {
  if (!serverRpcConfigured()) return { data: null, error: { message: "SERVER_RPC_NOT_CONFIGURED" } };
  const { data, error } = await db().rpc(fn, { p_key: serverEnv.internalRpcKey, ...args });
  return { data: (data as T) ?? null, error: error ? { message: error.message } : null };
}
