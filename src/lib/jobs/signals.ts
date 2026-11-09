import { APP_TIMEZONE } from "@/lib/utils/format";

/** Date du jour (AAAA-MM-JJ) dans le fuseau de l'application. */
export function todayInAppTz(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Jours restants avant la date limite (0 = aujourd'hui, négatif = dépassée). */
export function daysLeft(deadline: string | null | undefined, now: Date = new Date()): number | null {
  if (!deadline) return null;
  const d = deadline.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const a = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  const t = todayInAppTz(now);
  const b = Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10));
  return Math.round((a - b) / 86_400_000);
}

export function deadlineLabel(deadline: string | null | undefined, now: Date = new Date()): string | null {
  const n = daysLeft(deadline, now);
  if (n === null) return null;
  if (n < 0) return "Date limite dépassée";
  if (n === 0) return "Clôture aujourd'hui";
  if (n === 1) return "Clôture demain";
  if (n <= 30) return `Plus que ${n} jours`;
  return null;
}

/** Mission « urgente » : date limite dans 2 jours ou moins. */
export function isUrgent(deadline: string | null | undefined, now: Date = new Date()): boolean {
  const n = daysLeft(deadline, now);
  return n !== null && n >= 0 && n <= 2;
}

/** Mission « nouvelle » : publiée il y a moins de 48 h. */
export function isNew(createdAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!createdAt) return false;
  const t = Date.parse(createdAt);
  return Number.isFinite(t) && now.getTime() - t >= 0 && now.getTime() - t < 48 * 3_600_000;
}

export interface QualityInput {
  title?: string;
  categoryId?: string;
  description?: string;
  skills?: string[];
  budget?: number | string;
  deadline?: string;
  photos?: number;
  located?: boolean;
}

export interface QualityResult {
  score: number;
  level: "faible" | "correcte" | "excellente";
  tips: string[];
}

/** Indice de qualité d'une annonce (aide à la rédaction, purement indicatif). */
export function jobQuality(v: QualityInput): QualityResult {
  let score = 0;
  const tips: string[] = [];
  const title = (v.title ?? "").trim();
  const desc = (v.description ?? "").trim();
  const budget = Number(String(v.budget ?? "").replace(/\s/g, ""));

  if (title.length >= 10) score += 15;
  else tips.push("Donnez un titre précis (au moins 10 caractères).");
  if (title.length >= 25) score += 5;

  if (v.categoryId) score += 10;
  else tips.push("Choisissez une catégorie.");

  if (desc.length >= 30) score += 15;
  else tips.push("Décrivez le travail attendu (30 caractères minimum).");
  if (desc.length >= 150) score += 15;
  else if (desc.length >= 30) tips.push("Ajoutez des détails : matériel, accès, horaires… (150 caractères conseillés).");

  if (Number.isFinite(budget) && budget > 0) score += 15;
  else tips.push("Indiquez un budget.");

  if (v.deadline) score += 5;
  if ((v.skills ?? []).length > 0) score += 5;
  else tips.push("Ajoutez au moins une compétence recherchée.");

  if ((v.photos ?? 0) > 0) score += 10;
  else tips.push("Une photo du travail à faire attire plus de candidatures.");

  if (v.located) score += 5;

  score = Math.min(100, score);
  return { score, level: score >= 80 ? "excellente" : score >= 50 ? "correcte" : "faible", tips: tips.slice(0, 3) };
}
