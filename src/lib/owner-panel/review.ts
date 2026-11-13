/**
 * Contrôles automatiques du centre de contrôle (fonctions pures, testées) :
 * - relecture de l'annonce du site avant publication ;
 * - repérage des missions ouvertes qui ont besoin d'une action.
 */
import { formatRate } from "@/lib/payments/commission";
import { readableCase } from "@/lib/utils/format";

/* ───────────── Annonce ───────────── */

export type AnnouncementIssue = {
  id: string;
  level: "error" | "warning" | "info";
  text: string;
  /** Message corrigé proposé (bouton « Corriger »), si une correction automatique est possible. */
  fix?: string;
  fixLabel?: string;
};

/** Fautes fréquentes (mots entiers, insensible à la casse et aux accents manquants). */
const SPELLING: { re: RegExp; to: string }[] = [
  { re: /(?<!\p{L})sera\s+pr[ée]lev(?:er|é)(?!\p{L})/giu, to: "sera prélevée" },
  { re: /(?<!\p{L})com+i(?:s|t)ion(s?)(?!\p{L})/giu, to: "commission$1" },
  { re: /(?<!\p{L})prelev/giu, to: "prélev" },
  { re: /(?<!\p{L})payement(s?)(?!\p{L})/giu, to: "paiement$1" },
  { re: /(?<!\p{L})addresse(s?)(?!\p{L})/giu, to: "adresse$1" },
  { re: /(?<!\p{L})telephone(s?)(?!\p{L})/giu, to: "téléphone$1" },
  { re: /(?<!\p{L})gratuitment(?!\p{L})/giu, to: "gratuitement" },
  { re: /(?<!\p{L})inscrivez vous(?!\p{L})/giu, to: "inscrivez-vous" },
  { re: /(?<!\p{L})connectez vous(?!\p{L})/giu, to: "connectez-vous" },
];

function keepCase(found: string, replacement: string): string {
  const letters = found.replace(/[^\p{L}]/gu, "");
  if (letters && letters === letters.toLocaleUpperCase("fr-FR")) return replacement.toLocaleUpperCase("fr-FR");
  if (found.charAt(0) === found.charAt(0).toLocaleUpperCase("fr-FR")) return replacement.charAt(0).toLocaleUpperCase("fr-FR") + replacement.slice(1);
  return replacement;
}

function fixSpelling(text: string): string {
  let out = text;
  for (const { re, to } of SPELLING) {
    out = out.replace(re, (m: string, ...groups: unknown[]) => {
      const g1 = typeof groups[0] === "string" ? groups[0] : "";
      return keepCase(m, to.replace("$1", g1));
    });
  }
  return out;
}

const PERCENT = /(\d+(?:[.,]\d+)?)\s?%/g;
const MENTIONS_FEES = /commis|pr[ée]l[eè]v|frais|taux/i;

export function announcementIssues(message: string, commissionRate: number): AnnouncementIssue[] {
  const text = message.trim();
  if (!text) return [];
  const issues: AnnouncementIssue[] = [];

  // 1. Taux annoncé ≠ taux réellement appliqué : le plus grave (information trompeuse pour les membres).
  if (MENTIONS_FEES.test(text)) {
    const real = Math.round(commissionRate * 10000) / 100;
    const announced = [...text.matchAll(PERCENT)].map((m) => Number(m[1].replace(",", ".")));
    const wrong = announced.find((n) => Math.abs(n - real) > 0.001);
    if (wrong !== undefined) {
      issues.push({
        id: "rate",
        level: "error",
        text: `Le message annonce ${formatRate(wrong / 100)}, mais la commission réellement appliquée aux paiements est de ${formatRate(commissionRate)}. Si le taux doit changer, modifiez-le d'abord dans Paramètres (administration avancée) : tout le site suivra automatiquement.`,
        fix: text.replace(PERCENT, (m, n: string) => (Math.abs(Number(n.replace(",", ".")) - wrong) < 0.001 ? formatRate(commissionRate) : m)),
        fixLabel: `Annoncer le taux réel (${formatRate(commissionRate)})`,
      });
    }
  }

  // 2. Message entièrement en majuscules : paraît « crié » et se lit mal.
  const recased = readableCase(text);
  if (recased !== text) {
    issues.push({
      id: "caps",
      level: "warning",
      text: "Le message est écrit en MAJUSCULES : il se lit plus difficilement et donne l'impression de crier.",
      fix: fixSpelling(recased),
      fixLabel: "Écrire en minuscules",
    });
  }

  // 3. Fautes fréquentes.
  const spelled = fixSpelling(text);
  if (spelled !== text) {
    issues.push({
      id: "spelling",
      level: "warning",
      text: "Quelques fautes d'orthographe ont été repérées (accents, mots mal orthographiés).",
      fix: spelled,
      fixLabel: "Corriger l'orthographe",
    });
  }

  // 4. Typographie : espace insécable avant « % » (évite « 10% » collé ou un « % » seul en début de ligne).
  if (/\d%/.test(text)) {
    issues.push({
      id: "percent-space",
      level: "info",
      text: "En français, on écrit « 10 % » avec une espace avant le signe %.",
      fix: text.replace(/(\d)%/g, "$1 %"),
      fixLabel: "Ajouter l'espace",
    });
  }

  // 5. Longueur sur téléphone.
  if (text.length > 110) {
    issues.push({
      id: "length",
      level: "info",
      text: `Message long (${text.length} caractères) : sur téléphone, le bandeau occupera 3 lignes ou plus. Visez moins de 100 caractères.`,
    });
  }
  return issues;
}

/* ───────────── Missions à surveiller ───────────── */

export type WatchJob = {
  id: string;
  title: string;
  budget_amount: number;
  pay_type: string;
  status: string;
  is_hidden: boolean;
  created_at: string;
  deadline: string;
  applications_count: number;
};

export type JobAlertKind = "expired" | "no_applicants" | "caps_title" | "budget";
export type JobAlert<T extends WatchJob = WatchJob> = { job: T; issues: { kind: JobAlertKind; label: string }[] };

const DAY = 86_400_000;
/** Seuils de budget « inhabituel » (FCFA) : probablement une erreur de saisie (unité ou zéros en trop). */
const BUDGET_LIMITS: Record<string, { min: number; max: number }> = {
  hourly: { min: 200, max: 25_000 },
  daily: { min: 1_000, max: 200_000 },
  fixed: { min: 500, max: 50_000_000 },
};

/**
 * Missions ouvertes qui méritent une action du propriétaire : échéance dépassée, aucune candidature
 * après 2 jours (à relancer / partager), titre en majuscules, budget probablement mal saisi.
 */
export function jobAlerts<T extends WatchJob>(jobs: T[], now: Date = new Date()): JobAlert<T>[] {
  const today = now.toISOString().slice(0, 10);
  const out: JobAlert<T>[] = [];
  for (const job of jobs) {
    if (job.is_hidden || !["published", "reviewing"].includes(job.status)) continue;
    const issues: JobAlert["issues"] = [];
    if (job.deadline && job.deadline < today) {
      issues.push({ kind: "expired", label: "Date limite dépassée, encore ouverte" });
    }
    const ageDays = Math.floor((now.getTime() - new Date(job.created_at).getTime()) / DAY);
    if (job.applications_count === 0 && ageDays >= 2) {
      issues.push({ kind: "no_applicants", label: `Aucune candidature depuis ${ageDays} jours` });
    }
    if (readableCase(job.title) !== job.title) {
      issues.push({ kind: "caps_title", label: "Titre en majuscules" });
    }
    const limits = BUDGET_LIMITS[job.pay_type];
    if (limits && (job.budget_amount < limits.min || job.budget_amount > limits.max)) {
      issues.push({ kind: "budget", label: job.budget_amount < limits.min ? "Budget anormalement bas" : "Budget anormalement élevé" });
    }
    if (issues.length) out.push({ job, issues });
  }
  // Les plus urgentes d'abord : échéance dépassée, puis budget suspect, puis le reste.
  const weight = (a: JobAlert<T>) =>
    a.issues.reduce((w, i) => w + (i.kind === "expired" ? 100 : i.kind === "budget" ? 10 : 1), 0);
  return out.sort((a, b) => weight(b) - weight(a));
}
