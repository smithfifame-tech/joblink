"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { SESSION_ONLY_COOKIE } from "@/lib/supabase/cookies";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, safeNext } from "@/lib/validations/auth";
import { normalizePhone } from "@/lib/validations/common";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { homeForRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/errors";
import type { AppRole } from "@/types/db";

function flatten(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    (out[k] ??= []).push(i.message);
  }
  return out;
}

export async function registerAction(input: unknown): Promise<ActionResult<{ email: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs du formulaire.", fieldErrors: flatten(parsed.error) };
  const v = parsed.data;
  if (v.website) return { ok: true, data: { email: v.email } }; // robot : on ne crée rien

  const ip = await getClientIp();
  if (!(await rateLimit("register:ip", ip, 5, 3600)) || !(await rateLimit("register:email", v.email, 3, 3600))) {
    return { ok: false, error: "Trop d'inscriptions depuis cette connexion. Réessayez plus tard." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/account`,
      // Le rôle est relu et validé par le trigger SQL handle_new_user (jamais « admin »)
      data: {
        first_name: v.firstName,
        last_name: v.lastName,
        phone: normalizePhone(v.phone, v.country),
        country_code: v.country,
        city: v.city,
        neighborhood: v.neighborhood,
        account_type: v.accountType,
        terms_accepted: "true",
      },
    },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      // Réponse identique pour ne pas révéler l'existence d'un compte
      return { ok: true, data: { email: v.email } };
    }
    if (/password/i.test(error.message)) return { ok: false, error: "Mot de passe refusé : choisissez-en un plus robuste." };
    if (/rate limit/i.test(error.message)) return { ok: false, error: "Trop de tentatives. Réessayez dans quelques minutes." };
    return { ok: false, error: "Inscription impossible pour le moment. Réessayez." };
  }
  return { ok: true, data: { email: v.email } };
}

const GENERIC_LOGIN_ERROR = "Identifiants incorrects ou compte non confirmé.";

export async function loginAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs du formulaire.", fieldErrors: flatten(parsed.error) };
  const { identifier, password, remember, next } = parsed.data;

  const ip = await getClientIp();
  const idKey = identifier.toLowerCase();
  if (!(await rateLimit("login:ip", ip, 20, 900)) || !(await rateLimit("login:id", idKey, 8, 900))) {
    return { ok: false, error: "Trop de tentatives de connexion. Patientez 15 minutes." };
  }

  // Connexion par e-mail, ou par téléphone (résolu côté serveur, sans révéler d'information)
  let email = identifier.includes("@") ? identifier.toLowerCase() : null;
  if (!email) {
    const phone = normalizePhone(identifier);
    if (phone && serverEnv.serviceRoleKey) {
      const { data } = await getSupabaseAdminClient().from("profiles").select("email").eq("phone", phone).limit(1).maybeSingle();
      email = (data?.email as string | undefined) ?? null;
    }
  }
  if (!email) return { ok: false, error: GENERIC_LOGIN_ERROR };

  const cookieStore = await cookies();
  const sessionOnly = !remember;
  cookieStore.set(SESSION_ONLY_COOKIE, sessionOnly ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(sessionOnly ? {} : { maxAge: 60 * 60 * 24 * 365 }),
  });
  const supabase = await getSupabaseServerClient({ sessionOnly });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error && /not confirmed/i.test(error.message)) {
      return { ok: false, error: "Confirmez d'abord votre adresse e-mail (lien reçu à l'inscription)." };
    }
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
    supabase.from("profiles").select("is_suspended").eq("id", data.user.id).maybeSingle(),
  ]);
  if (profile?.is_suspended) {
    await supabase.auth.signOut();
    return { ok: false, error: "Ce compte est suspendu. Contactez le support JOBLINK." };
  }
  const list = (roles ?? []).map((r) => r.role as AppRole);
  const primary: AppRole = list.includes("admin") ? "admin" : list.includes("worker") ? "worker" : "client";
  return { ok: true, data: { redirectTo: safeNext(next) ?? homeForRole(primary) } };
}

export async function logoutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_ONLY_COOKIE);
  redirect("/login?logged_out=1");
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Adresse e-mail invalide.", fieldErrors: flatten(parsed.error) };
  const ip = await getClientIp();
  if (!(await rateLimit("forgot:ip", ip, 5, 3600)) || !(await rateLimit("forgot:email", parsed.data.email, 3, 3600))) {
    return { ok: false, error: "Trop de demandes. Réessayez plus tard." };
  }
  const supabase = await getSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/reset-password`,
  });
  // Toujours la même réponse : on ne révèle pas si le compte existe
  return { ok: true, data: undefined, message: "Si un compte existe, un lien de réinitialisation a été envoyé." };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez le mot de passe.", fieldErrors: flatten(parsed.error) };
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Lien expiré. Refaites une demande de réinitialisation." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: "Impossible de modifier le mot de passe. Choisissez-en un différent." };
  // Déconnexion des autres sessions après changement de mot de passe
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true, data: undefined, message: "Mot de passe modifié." };
}

export async function resendConfirmationAction(email: string): Promise<ActionResult> {
  const ip = await getClientIp();
  if (!(await rateLimit("resend:ip", ip, 3, 3600))) return { ok: false, error: "Trop de demandes." };
  const supabase = await getSupabaseServerClient();
  await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/account` } });
  return { ok: true, data: undefined, message: "E-mail de confirmation renvoyé." };
}
