import { z } from "zod";
import { COUNTRIES } from "@/lib/maps/places";

const DIAL: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.dialCode]));

/**
 * Normalise un numéro au format E.164. Pour le Bénin, accepte les numéros à 10 chiffres (01XXXXXXXX,
 * format en vigueur depuis 2024) et les anciens numéros à 8 chiffres.
 */
export function normalizePhone(raw: string, country = "BJ"): string | null {
  let v = raw.replace(/[\s.\-()]/g, "");
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  if (!v.startsWith("+")) {
    const dial = DIAL[country] ?? "+229";
    v = `${dial}${v}`;
  }
  if (!/^\+[0-9]{8,15}$/.test(v)) return null;
  if (v.startsWith("+229")) {
    const local = v.slice(4);
    if (!(local.length === 10 && local.startsWith("01")) && local.length !== 8) return null;
  }
  return v;
}

export const uuid = z.string().uuid("Identifiant invalide");

/** Téléphone : obligatoire et au bon format dès la saisie (le contrôle par pays est refait au niveau du formulaire). */
export const phoneField = z
  .string()
  .trim()
  .min(1, "Numéro de téléphone obligatoire")
  .refine((v) => COUNTRIES.some((c) => normalizePhone(v, c.code) !== null), "Numéro invalide (ex. 01 97 00 00 00)");

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "L'adresse e-mail est obligatoire")
  .max(254)
  .email("Adresse e-mail invalide");

export const passwordStrong = z
  .string()
  .min(10, "Au moins 10 caractères")
  .max(72, "72 caractères maximum")
  .regex(/[a-z]/, "Au moins une lettre minuscule")
  .regex(/[A-Z]/, "Au moins une lettre majuscule")
  .regex(/[0-9]/, "Au moins un chiffre")
  .regex(/[^A-Za-z0-9]/, "Au moins un caractère spécial");

export const personName = z
  .string()
  .trim()
  .min(2, "2 caractères minimum")
  .max(80, "80 caractères maximum")
  .regex(/^[\p{L}][\p{L}\p{M}' .-]*$/u, "Caractères non autorisés");

export const placeName = z.string().trim().min(2, "Champ obligatoire").max(120, "120 caractères maximum");

export const countryCode = z.enum(COUNTRIES.map((c) => c.code) as [string, ...string[]], {
  message: "Pays invalide",
});

/** Entier en FCFA (accepte « 10 000 » ou « 10000 »). */
export const amountXOF = (min = 500, max = 100_000_000) =>
  z.preprocess(
    (v) => (typeof v === "string" ? Number(v.replace(/[\s  .]/g, "")) : v),
    z
      .number({ message: "Montant invalide" })
      .int("Montant entier en FCFA")
      .min(min, `Minimum ${min.toLocaleString("fr-FR")} FCFA`)
      .max(max, "Montant trop élevé"),
  );

/** Texte libre nettoyé : supprime les caractères de contrôle (le rendu React échappe déjà le HTML). */
export const cleanText = (min: number, max: number, label = "Ce champ") =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().min(min, `${label} : ${min} caractères minimum`).max(max, `${label} : ${max} caractères maximum`));
