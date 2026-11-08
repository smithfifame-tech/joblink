import { z } from "zod";
import { amountXOF, cleanText, countryCode, normalizePhone, personName, phoneField, placeName } from "./common";

export const profileSchema = z
  .object({
    firstName: personName,
    lastName: personName,
    phone: phoneField,
    country: countryCode,
    city: placeName,
    neighborhood: placeName,
    bio: z.string().trim().max(2000).optional(),
    notifyEmail: z.boolean(),
    notifyNewJobs: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!normalizePhone(v.phone, v.country)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Numéro invalide" });
    }
  });

const optionalAmount = z
  .union([z.literal(""), z.undefined(), z.null(), amountXOF(0)])
  .transform((v) => (v === "" || v === undefined ? null : v));

export const workerProfileSchema = z
  .object({
    headline: z.string().trim().max(140).optional(),
    experienceYears: z.union([z.literal(""), z.coerce.number().int().min(0).max(70)]).optional(),
    experiences: z.string().trim().max(4000).optional(),
    rateMin: optionalAmount,
    rateMax: optionalAmount,
    rateUnit: z.enum(["fixed", "hourly", "daily"]),
    travelRadiusKm: z.coerce.number().int().min(1).max(200),
    availability: z.enum(["available", "busy", "unavailable"]),
    availabilityNotes: z.string().trim().max(500).optional(),
    portfolioUrls: z.array(z.string().trim().url("URL invalide").startsWith("https://", "URL https:// requise")).max(10),
    showOnMap: z.boolean(),
    categoryIds: z.array(z.string().uuid()).max(8, "8 catégories maximum"),
  })
  .refine((v) => v.rateMin === null || v.rateMax === null || v.rateMin <= v.rateMax, {
    path: ["rateMax"],
    message: "Le tarif maximum doit être supérieur au minimum",
  });

export const contactSchema = z.object({
  name: cleanText(2, 120, "Le nom"),
  email: z.string().trim().email("Adresse e-mail invalide").max(254),
  subject: cleanText(3, 160, "Le sujet"),
  message: cleanText(10, 5000, "Le message"),
  website: z.string().max(0).optional(),
});

export const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: cleanText(1, 4000, "Le message"),
});

/** Validation des fichiers envoyés (type MIME réel vérifié aussi par Storage). */
export const FILE_RULES = {
  avatar: { maxBytes: 2 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  jobImage: { maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  attachment: { maxBytes: 10 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
  proof: { maxBytes: 10 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
  verification: { maxBytes: 10 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
} as const;

export type FileKind = keyof typeof FILE_RULES;

export function validateFile(file: { size: number; type: string }, kind: FileKind): string | null {
  const rule = FILE_RULES[kind];
  if (!(rule.types as readonly string[]).includes(file.type)) return "Format de fichier non autorisé.";
  if (file.size > rule.maxBytes) return `Fichier trop volumineux (max ${Math.round(rule.maxBytes / 1024 / 1024)} Mo).`;
  if (file.size === 0) return "Fichier vide.";
  return null;
}

/** Nom de fichier sûr pour Storage (pas de traversée de chemin, extension contrôlée). */
export function safeStorageName(original: string, mime: string): string {
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[mime] ?? "bin";
  const base = original
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "fichier";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}.${ext}`;
}
