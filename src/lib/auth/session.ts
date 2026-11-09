import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { AppRole, Profile } from "@/types/db";

export interface SessionUser {
  id: string;
  email: string;
  emailConfirmed: boolean;
  profile: Profile | null;
  roles: AppRole[];
  /** Rôle principal pour la navigation : admin > worker > client */
  primaryRole: AppRole | null;
}

export function homeForRole(role: AppRole | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "worker") return "/worker/dashboard";
  return "/client/dashboard";
}

/** Utilisateur courant, validé auprès de Supabase Auth. Mis en cache par requête. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  const roles = ((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role);
  const primaryRole: AppRole | null = roles.includes("admin")
    ? "admin"
    : roles.includes("worker")
      ? "worker"
      : roles.includes("client")
        ? "client"
        : null;

  return {
    id: user.id,
    email: user.email ?? "",
    emailConfirmed: Boolean(user.email_confirmed_at),
    profile: profile ?? null,
    roles,
    primaryRole,
  };
});

/** Profil incomplet (ex. compte créé via Google) : téléphone, ville et CGU encore à renseigner. */
export function needsOnboarding(user: SessionUser): boolean {
  return Boolean(user.profile && !user.profile.terms_accepted_at);
}

export async function requireUser(next?: string, opts?: { allowIncomplete?: boolean }): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (user.profile?.is_suspended) redirect("/suspended");
  if (!opts?.allowIncomplete && needsOnboarding(user)) {
    redirect(`/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return user;
}

/** Garde de rôle côté serveur : le rôle est lu en base, jamais depuis le navigateur. */
export async function requireRole(role: AppRole, next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!user.roles.includes(role)) redirect(homeForRole(user.primaryRole));
  return user;
}
