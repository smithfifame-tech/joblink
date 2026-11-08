import "server-only";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fail, type ActionResult } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";

export function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const i of error.issues) {
    const k = i.path.map(String).join(".") || "form";
    (out[k] ??= []).push(i.message);
  }
  return out;
}

export function invalid(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return { ok: false as const, error: "Vérifiez les champs du formulaire.", fieldErrors: fieldErrors(error) };
}

/** Utilisateur authentifié courant (client RLS). */
export async function authed() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Appelle une fonction SQL métier (SECURITY DEFINER) avec la session de l'utilisateur.
 * Les autorisations sont vérifiées en base : auth.uid(), rôle, statut.
 */
export async function callRpc<T = unknown>(
  fn: string,
  args: Record<string, unknown>,
  opts: { revalidate?: string[]; limit?: { scope: string; max: number; window: number }; message?: string } = {},
): Promise<ActionResult<T>> {
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };
    if (opts.limit && !(await rateLimit(opts.limit.scope, user.id, opts.limit.max, opts.limit.window))) {
      return { ok: false, error: "Trop d'actions en peu de temps. Patientez un instant." };
    }
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return fail(error);
    for (const p of opts.revalidate ?? []) revalidatePath(p, "layout");
    return { ok: true, data: data as T, message: opts.message };
  } catch (e) {
    return fail(e);
  }
}
