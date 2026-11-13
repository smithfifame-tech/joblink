"use server";

import { z } from "zod";
import { applicationSchema, completionSchema, disputeSchema, reportSchema, reviewSchema } from "@/lib/validations/jobs";
import { fail, type ActionResult } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { authed, callRpc, invalid } from "./_helpers";

const id = z.string().uuid();

export async function applyAction(input: unknown) {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return callRpc<string>(
    "apply_to_job",
    { p_job_id: parsed.data.jobId, p_cover_letter: parsed.data.coverLetter, p_proposed_amount: parsed.data.proposedAmount },
    {
      revalidate: [`/jobs/${parsed.data.jobId}`, "/worker/applications"],
      limit: { scope: "apply", max: 30, window: 3600 },
      message: "Candidature envoyée.",
    },
  );
}

export async function withdrawApplicationAction(applicationId: string) {
  if (!id.safeParse(applicationId).success) return { ok: false as const, error: "Candidature invalide." };
  return callRpc("withdraw_application", { p_application_id: applicationId }, { revalidate: ["/worker/applications"], message: "Candidature retirée." });
}

export async function acceptApplicationAction(applicationId: string) {
  if (!id.safeParse(applicationId).success) return { ok: false as const, error: "Candidature invalide." };
  return callRpc<string>("accept_application", { p_application_id: applicationId }, { revalidate: ["/client"], message: "Candidature acceptée." });
}

export async function rejectApplicationAction(applicationId: string, note?: string) {
  if (!id.safeParse(applicationId).success) return { ok: false as const, error: "Candidature invalide." };
  return callRpc("reject_application", { p_application_id: applicationId, p_note: note?.slice(0, 500) ?? null }, { revalidate: ["/client"], message: "Candidature refusée." });
}

export async function respondContractAction(contractId: string, accept: boolean) {
  if (!id.safeParse(contractId).success) return { ok: false as const, error: "Mission invalide." };
  return callRpc("respond_to_contract", { p_contract_id: contractId, p_accept: accept }, {
    revalidate: ["/worker"],
    message: accept ? "Mission confirmée. Bon travail !" : "Mission déclinée.",
  });
}

export async function submitCompletionAction(input: unknown) {
  const parsed = completionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return callRpc("submit_completion", {
    p_contract_id: parsed.data.contractId,
    p_note: parsed.data.note,
    p_proof_paths: parsed.data.proofPaths,
  }, { revalidate: ["/worker"], message: "Travail déclaré terminé. Le client va valider." });
}

export async function requestChangesAction(contractId: string, note: string) {
  const n = z.string().trim().min(5, "Précisez les corrections attendues").max(1000).safeParse(note);
  if (!n.success) return { ok: false as const, error: n.error.issues[0]!.message };
  return callRpc("request_changes", { p_contract_id: contractId, p_note: n.data }, { revalidate: ["/client"], message: "Demande de corrections envoyée." });
}

export async function validateCompletionAction(contractId: string) {
  if (!id.safeParse(contractId).success) return { ok: false as const, error: "Mission invalide." };
  return callRpc("validate_completion", { p_contract_id: contractId }, { revalidate: ["/client"], message: "Travail validé. Vous pouvez procéder au paiement." });
}

export async function openDisputeAction(input: unknown) {
  const parsed = disputeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return callRpc<string>("open_dispute", {
    p_contract_id: parsed.data.contractId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details ?? null,
  }, { revalidate: ["/client", "/worker"], limit: { scope: "dispute", max: 5, window: 3600 }, message: "Litige ouvert. L'équipe JOBLINK va l'examiner." });
}

export async function submitReviewAction(input: unknown) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return callRpc<string>("submit_review", {
    p_contract_id: parsed.data.contractId,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment ?? null,
  }, { revalidate: ["/client", "/worker"], message: "Merci pour votre avis !" });
}

export async function reportAction(input: unknown): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Connectez-vous pour signaler un contenu." };
    if (!(await rateLimit("report", user.id, 10, 3600))) return { ok: false, error: "Trop de signalements envoyés." };
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: parsed.data.targetType,
      target_id: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
    });
    if (error) return fail(error);
    return { ok: true, data: undefined, message: "Signalement transmis à la modération. Merci." };
  } catch (e) {
    return fail(e);
  }
}

/** Coordonnées de l'autre partie, visibles uniquement après attribution (contrôle SQL). */
export async function getContactInfoAction(userId: string) {
  if (!id.safeParse(userId).success) return { ok: false as const, error: "Utilisateur invalide." };
  return callRpc<{ email: string; phone: string | null }[]>("get_contact_info", { p_user: userId });
}
