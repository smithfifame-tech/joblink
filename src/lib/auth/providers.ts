import "server-only";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";

/**
 * Fournisseurs de connexion activés dans Supabase (lecture du point public /auth/v1/settings).
 * Mis en cache 5 minutes : le bouton Google s'active tout seul dès que le fournisseur est configuré.
 */
export async function getAuthProviders(): Promise<{ google: boolean; emailConfirm: boolean | null }> {
  if (!isSupabaseConfigured()) return { google: false, emailConfirm: null };
  try {
    const res = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseAnonKey },
      next: { revalidate: 300 },
    });
    if (!res.ok) return { google: false, emailConfirm: null };
    const json = (await res.json()) as { external?: Record<string, boolean>; mailer_autoconfirm?: boolean };
    return {
      google: Boolean(json.external?.google),
      // mailer_autoconfirm = true : les comptes sont validés sans e-mail de confirmation
      emailConfirm: typeof json.mailer_autoconfirm === "boolean" ? !json.mailer_autoconfirm : null,
    };
  } catch {
    return { google: false, emailConfirm: null };
  }
}
