import { z } from "zod";
import { countryCode, email, normalizePhone, passwordStrong, personName, phoneField, placeName } from "./common";

export const accountTypes = ["client", "worker"] as const;

export const registerSchema = z
  .object({
    firstName: personName,
    lastName: personName,
    email,
    phone: phoneField,
    password: passwordStrong,
    confirmPassword: z.string(),
    country: countryCode,
    city: placeName,
    neighborhood: placeName,
    accountType: z.enum(accountTypes, { message: "Choisissez un type de compte" }),
    acceptTerms: z.literal(true, { message: "Vous devez accepter les conditions générales" }),
    // Champ piège anti-robots : doit rester vide
    website: z.string().max(0).optional(),
    // Page d'origine (ex. une mission) : l'utilisateur y revient après confirmation de l'e-mail
    next: z.string().max(300).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Les mots de passe ne correspondent pas" });
    }
    if (!normalizePhone(v.phone, v.country)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Numéro invalide (ex. 01 97 00 00 00)" });
    }
  });
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Saisissez votre e-mail ou votre téléphone").max(254),
  password: z.string().min(1, "Saisissez votre mot de passe").max(72),
  remember: z.boolean().optional(),
  next: z.string().optional(),
});
export type LoginInput = z.input<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: passwordStrong, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  });

/** N'autorise que des redirections internes après connexion (évite les open redirects). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** Finalisation du profil (comptes créés via Google) : mêmes exigences que l'inscription classique. */
export const onboardingSchema = z
  .object({
    accountType: z.enum(accountTypes, { message: "Choisissez un type de compte" }),
    firstName: personName,
    lastName: personName,
    phone: phoneField,
    country: countryCode,
    city: placeName,
    neighborhood: placeName,
    acceptTerms: z.literal(true, { message: "Vous devez accepter les conditions générales" }),
    next: z.string().max(300).optional(),
  })
  .superRefine((v, ctx) => {
    if (!normalizePhone(v.phone, v.country)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Numéro invalide (ex. 01 97 00 00 00)" });
    }
  });
export type OnboardingInput = z.input<typeof onboardingSchema>;
