import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { SESSION_ONLY_COOKIE, applySessionPreference } from "./cookies";

/**
 * Client serveur lié à la session de l'utilisateur (cookies). Soumis à RLS.
 * À utiliser dans les Server Components, Server Actions et Route Handlers.
 */
export async function getSupabaseServerClient(opts?: { sessionOnly?: boolean }): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const sessionOnly = opts?.sessionOnly ?? cookieStore.get(SESSION_ONLY_COOKIE)?.value === "1";
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, applySessionPreference(options, sessionOnly));
          }
        } catch {
          // Appel depuis un Server Component : le middleware se charge du rafraîchissement.
        }
      },
    },
  });
}

let adminClient: SupabaseClient | null = null;

/**
 * Client service_role — CONTOURNE RLS. Strictement réservé au serveur (webhooks, rate limiting,
 * tâches d'administration). Ne jamais importer dans un composant client.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!serverEnv.serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante : configurez-la côté serveur.");
  }
  if (!adminClient) {
    adminClient = createClient(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
