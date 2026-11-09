"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverRpc } from "@/lib/supabase/server-rpc";
import { SESSION_ONLY_COOKIE } from "@/lib/supabase/cookies";
import { publicEnv } from "@/lib/env";
import { forgotPasswordSchema, loginSchema, onboardingSchema, registerSchema, resetPasswordSchema, safeNext } from "@/lib/validations/auth";
import { normalizePhone } from "@/lib/validations/common";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { isPasswordPwned, PWNED_MESSAGE } from "@/lib/security/pwned";
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

export async function registerAction(input: unknown): Promise<ActionResult<{ email: string; redirectTo?: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs du formulaire.", fieldErrors: flatten(parsed.error) };
  const v = parsed.data;
  if (v.website) return { ok: true, data: { email: v.email } }; // robot : on ne crée rien

  const ip = await getClientIp();
  if (!(await rateLimit("register:ip", ip, 5, 3600)) || !(await rateLimit("register:email", v.email, 3, 3600))) {
    return { ok: false, error: "Trop d'inscriptions depuis cette connexion. Réessayez plus tard." };
  }
  if (await isPasswordPwned(v.password)) {
    return { ok: false, error: PWNED_MESSAGE, fieldErrors: { password: [PWNED_MESSAGE] } };
  }

  const supabase = await getSupabaseServerClient();
  const { data: signed, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      // Après le clic dans l'e-mail : session ouverte puis retour sur le site (page d'origine ou espace personnel)
      emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=${encodeURIComponent(safeNext(v.next) ?? "/account")}`,
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
  // Si la confirmation par e-mail est désactivée dans Supabase, la session est ouverte immédiatement :
  // on amène directement l'utilisateur sur le site.
  if (signed.session) {
    const dest = safeNext(v.next) ?? "/account";
    return { ok: true, data: { email: v.email, redirectTo: dest.includes("?") ? `${dest}&welcome=1` : `${dest}?welcome=1` } };
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
    if (phone) {
      const { data } = await serverRpc<string>("srv_email_for_phone", { p_phone: phone });
      email = data ?? null;
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
  if (await isPasswordPwned(parsed.data.password)) {
    return { ok: false, error: PWNED_MESSAGE, fieldErrors: { password: [PWNED_MESSAGE] } };
  }
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

const ONBOARDING_ERRORS: Record<string, string> = {
  INVALID_PHONE: "Numéro de téléphone invalide.",
  INVALID_PLACE: "Ville et quartier sont obligatoires.",
  INVALID_NAME: "Nom et prénom sont obligatoires.",
  ALREADY_ONBOARDED: "Votre profil est déjà complet.",
};

/** Finalise un compte créé via Google : rôle, identité, téléphone, ville et acceptation des CGU. */
export async function completeOnboardingAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs du formulaire.", fieldErrors: flatten(parsed.error) };
  const v = parsed.data;
  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };

  const { error } = await supabase.rpc("complete_onboarding", {
    p_account_type: v.accountType,
    p_first_name: v.firstName,
    p_last_name: v.lastName,
    p_phone: normalizePhone(v.phone, v.country),
    p_country_code: v.country,
    p_city: v.city,
    p_neighborhood: v.neighborhood,
  });
  if (error) {
    const key = Object.keys(ONBOARDING_ERRORS).find((k) => error.message.includes(k));
    if (key === "ALREADY_ONBOARDED") return { ok: true, data: { redirectTo: safeNext(v.next) ?? "/account" } };
    return { ok: false, error: key ? ONBOARDING_ERRORS[key]! : "Impossible d'enregistrer votre profil. Réessayez." };
  }
  const dest = safeNext(v.next) ?? homeForRole(v.accountType);
  return { ok: true, data: { redirectTo: dest.includes("?") ? `${dest}&welcome=1` : `${dest}?welcome=1` } };
}
