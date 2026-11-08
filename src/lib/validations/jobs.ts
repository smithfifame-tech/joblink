import { z } from "zod";
import { amountXOF, cleanText, countryCode, placeName, uuid } from "./common";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");

export function todayISO(): string {
  // Date du jour dans le fuseau Africa/Porto-Novo
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Porto-Novo" });
}

export const jobSchema = z
  .object({
    title: cleanText(8, 120, "Le titre"),
    categoryId: uuid,
    description: cleanText(30, 5000, "La description"),
    skills: z.array(z.string().trim().min(2).max(60)).max(15, "15 compétences maximum"),
    budget: amountXOF(500),
    payType: z.enum(["fixed", "hourly", "daily"]),
    allowPriceProposal: z.boolean(),
    startDate: isoDate,
    deadline: isoDate,
    country: countryCode,
    city: placeName,
    neighborhood: placeName,
    address: z.string().trim().max(300).optional().or(z.literal("")),
    workMode: z.enum(["on_site", "remote"]),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    workersNeeded: z.coerce.number().int().min(1, "Au moins 1").max(50, "50 maximum"),
    intent: z.enum(["publish", "draft"]).default("publish"),
  })
  .superRefine((v, ctx) => {
    if (v.deadline < v.startDate) {
      ctx.addIssue({ code: "custom", path: ["deadline"], message: "La date limite doit suivre la date de début" });
    }
    if (v.deadline < todayISO()) {
      ctx.addIssue({ code: "custom", path: ["deadline"], message: "La date limite est déjà passée" });
    }
    if (v.workMode === "on_site" && (v.lat === null || v.lng === null)) {
      ctx.addIssue({ code: "custom", path: ["lat"], message: "Placez la mission sur la carte" });
    }
  });
export type JobInput = z.input<typeof jobSchema>;
export type JobValues = z.output<typeof jobSchema>;

export const applicationSchema = z.object({
  jobId: uuid,
  coverLetter: cleanText(20, 3000, "Votre message"),
  proposedAmount: z
    .union([z.literal(""), z.undefined(), amountXOF(500)])
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

export const completionSchema = z.object({
  contractId: uuid,
  note: cleanText(5, 2000, "Le compte rendu"),
  proofPaths: z.array(z.string().max(300)).max(6),
});

export const reviewSchema = z.object({
  contractId: uuid,
  rating: z.coerce.number().int().min(1, "Choisissez une note").max(5),
  comment: z.string().trim().max(1500).optional(),
});

export const disputeSchema = z.object({
  contractId: uuid,
  reason: cleanText(5, 200, "Le motif"),
  details: z.string().trim().max(4000).optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(["user", "job", "message", "review"]),
  targetId: uuid,
  reason: z.enum(["spam", "fraud", "abuse", "inappropriate", "safety", "other"]),
  details: z.string().trim().max(2000).optional(),
});

/** Paramètres de recherche publics (query string), tous facultatifs et bornés. */
export const jobSearchParamsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().regex(/^[a-z0-9-]{2,60}$/).optional(),
  city: z.string().trim().max(120).optional(),
  min: z.coerce.number().int().min(0).max(100_000_000).optional(),
  max: z.coerce.number().int().min(0).max(100_000_000).optional(),
  mode: z.enum(["on_site", "remote"]).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().refine((r) => [1, 5, 10, 20, 50].includes(r)).optional(),
  west: z.coerce.number().min(-180).max(180).optional(),
  south: z.coerce.number().min(-90).max(90).optional(),
  east: z.coerce.number().min(-180).max(180).optional(),
  north: z.coerce.number().min(-90).max(90).optional(),
  sort: z.enum(["recent", "distance", "budget_desc", "budget_asc", "deadline"]).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});
export type JobSearchParams = z.output<typeof jobSearchParamsSchema>;

/** Parse tolérant : les paramètres invalides sont ignorés plutôt que de faire échouer la page. */
export function parseSearchParams(input: Record<string, string | string[] | undefined>): JobSearchParams {
  const out: Record<string, unknown> = {};
  const shape = jobSearchParamsSchema.shape;
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const raw = input[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value === undefined || value === "") continue;
    const parsed = shape[key].safeParse(value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out as JobSearchParams;
}
