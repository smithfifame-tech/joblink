import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Client ANONYME sans cookies, pour les données publiques (catégories, missions publiées, statistiques, avis).
 * Ne lit pas la session : les pages qui l'utilisent restent statiques / ISR et sont servies depuis le CDN.
 * Soumis à RLS avec le rôle `anon` : n'expose rien de plus qu'un visiteur non connecté.
 */
export function getSupabasePublicClient(): SupabaseClient {
  if (!client) {
    client = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
