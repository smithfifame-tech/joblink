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

async function guarded(fn: () => Promise<unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    await fn();
    revalidatePath(OWNER_PATH);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "SESSION_EXPIRED") redirect(OWNER_PATH);
    return { ok: false, error: "Action impossible pour le moment." };
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
