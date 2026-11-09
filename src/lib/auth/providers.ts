import "server-only";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";

/**
 * Fournisseurs de connexion activés dans Supabase (lecture du point public /auth/v1/settings).
 * Mis en cache 5 minutes : le bouton Google s'active tout seul dès que le fournisseur est configuré.
 */
export async function getAuthProviders(): Promise<{ google: boolean }> {
  if (!isSupabaseConfigured()) return { google: false };
  try {
    const res = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseAnonKey },
      next: { revalidate: 300 },
    });
    if (!res.ok) return { google: false };
    const json = (await res.json()) as { external?: Record<string, boolean> };
    return { google: Boolean(json.external?.google) };
  } catch {
    return { google: false };
  }
}
