"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { OWNER_PATH, ownerApi, ownerLogin, ownerLogout } from "@/lib/owner-panel/server";

export type OwnerLoginState = { error?: string } | undefined;

export async function ownerLoginAction(_prev: OwnerLoginState, formData: FormData): Promise<OwnerLoginState> {
  const password = String(formData.get("password") ?? "");
  if (!password || password.length > 200) return { error: "Saisissez votre mot de passe." };
  const res = await ownerLogin(password);
  if (!res.ok) {
    if (res.error === "LOCKED") return { error: "Trop de tentatives. Accès bloqué 15 minutes par sécurité." };
    if (res.error === "UNAVAILABLE") return { error: "Le tableau de bord est momentanément indisponible." };
    return {
      error:
        res.remaining !== undefined && res.remaining <= 2
          ? `Mot de passe incorrect. Encore ${res.remaining} essai${res.remaining > 1 ? "s" : ""} avant blocage.`
          : "Mot de passe incorrect.",
    };
  }
  redirect(OWNER_PATH);
}

export async function ownerLogoutAction(): Promise<void> {
  await ownerLogout();
  redirect(OWNER_PATH);
}

const id = z.string().uuid();
const note = z.string().trim().max(500).optional();

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TRANSITION: "Ce dossier a déjà été traité. Actualisez la page.",
  NOTE_REQUIRED: "Ajoutez une explication (5 caractères minimum).",
  INVALID_REFERENCE: "Indiquez la référence de la transaction Mobile Money.",
  PAYMENT_NOT_FOUND: "Ce paiement n'est pas encore confirmé : versement impossible.",
};

async function guarded(fn: () => Promise<unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    await fn();
    revalidatePath(OWNER_PATH);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "SESSION_EXPIRED") redirect(OWNER_PATH);
    const code = e instanceof Error ? e.message : "";
    return { ok: false, error: ERROR_MESSAGES[code] ?? "Action impossible pour le moment." };
  }
}

export async function setSuspensionAction(userId: string, suspended: boolean, reason?: string) {
  const parsed = z.object({ userId: id, suspended: z.boolean(), reason: note }).safeParse({ userId, suspended, reason });
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  return guarded(() => ownerApi.setSuspension(parsed.data.userId, parsed.data.suspended, parsed.data.reason));
}

export async function moderateJobAction(jobId: string, hide: boolean) {
  const parsed = z.object({ jobId: id, hide: z.boolean() }).safeParse({ jobId, hide });
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  return guarded(() => ownerApi.moderateJob(parsed.data.jobId, parsed.data.hide, hide ? "Masquée par le propriétaire" : undefined));
}

export async function updateReportAction(reportId: string, status: "reviewing" | "resolved" | "dismissed") {
  const parsed = z.object({ reportId: id, status: z.enum(["reviewing", "resolved", "dismissed"]) }).safeParse({ reportId, status });
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  return guarded(() => ownerApi.updateReport(parsed.data.reportId, parsed.data.status));
}

export async function markContactAction(messageId: string) {
  const parsed = id.safeParse(messageId);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  return guarded(() => ownerApi.markContact(parsed.data));
}

export async function setIncidentAction(incidentId: string, action: "approve" | "dismiss" | "reopen" | "resolve") {
  const parsed = z.object({ incidentId: id, action: z.enum(["approve", "dismiss", "reopen", "resolve"]) }).safeParse({ incidentId, action });
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  return guarded(() => ownerApi.setIncident(parsed.data.incidentId, parsed.data.action));
}

/** Pages internes autorisées comme lien de l'annonce (jamais de lien externe). */
const ANNOUNCEMENT_LINKS = ["", "/jobs", "/map", "/client/jobs/new", "/register?type=worker", "/how-it-works", "/faq", "/contact"] as const;

export async function setAnnouncementAction(input: { message: string; tone: string; linkUrl: string; linkLabel: string; active: boolean; hours: number | null }) {
  const parsed = z
    .object({
      message: z.string().trim().max(240),
      tone: z.enum(["info", "success", "warning"]),
      linkUrl: z.enum(ANNOUNCEMENT_LINKS),
      linkLabel: z.string().trim().max(40),
      active: z.boolean(),
      hours: z.union([z.null(), z.number().int().min(1).max(24 * 90)]),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const d = parsed.data;
  if (d.active && !d.message) return { ok: false, error: "Écrivez un message avant de publier l'annonce." };
  const res = await guarded(() =>
    ownerApi.setAnnouncement({ message: d.message, tone: d.tone, linkUrl: d.linkUrl || null, linkLabel: d.linkLabel || null, active: d.active, hours: d.hours }),
  );
  if (res.ok) revalidatePath("/api/announcement");
  return res;
}

export async function recordPayoutAction(paymentId: string, reference: string) {
  const parsed = z.object({ paymentId: id, reference: z.string().trim().min(3).max(120) }).safeParse({ paymentId, reference });
  if (!parsed.success) return { ok: false, error: "Indiquez la référence de la transaction Mobile Money (3 caractères minimum)." };
  return guarded(() => ownerApi.recordPayout(parsed.data.paymentId, parsed.data.reference));
}

export async function resolveDisputeAction(disputeId: string, status: string, decision: string) {
  const parsed = z
    .object({
      disputeId: id,
      status: z.enum(["under_review", "resolved_client", "resolved_worker", "closed"]),
      decision: z.string().trim().min(5).max(2000),
    })
    .safeParse({ disputeId, status, decision });
  if (!parsed.success) return { ok: false, error: "Choisissez une décision et expliquez-la (5 caractères minimum)." };
  return guarded(() => ownerApi.resolveDispute(parsed.data.disputeId, parsed.data.status, parsed.data.decision));
}

export async function reviewVerificationAction(requestId: string, approve: boolean, reason?: string) {
  const parsed = z.object({ requestId: id, approve: z.boolean(), reason: z.string().trim().max(500).optional() }).safeParse({ requestId, approve, reason });
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  if (!approve && !parsed.data.reason) return { ok: false, error: "Expliquez au travailleur pourquoi le document est refusé." };
  return guarded(() => ownerApi.reviewVerification(parsed.data.requestId, approve, parsed.data.reason || undefined));
}
