"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/payments/registry";
import { fail, type ActionResult } from "@/lib/errors";
import { authed, callRpc, invalid } from "./_helpers";

const uuid = z.string().uuid();
const note = z.string().trim().max(2000).optional();

// Toutes ces fonctions vérifient is_admin() en base et journalisent l'action (audit_logs).

export async function adminSuspendAction(userId: string, suspend: boolean, reason?: string) {
  if (!uuid.safeParse(userId).success) return { ok: false as const, error: "Utilisateur invalide." };
  return callRpc("admin_set_suspension", { p_user: userId, p_suspended: suspend, p_reason: reason ?? null }, {
    revalidate: ["/admin"],
    message: suspend ? "Compte suspendu." : "Compte réactivé.",
  });
}

export async function adminVerifyWorkerAction(userId: string, verified: boolean) {
  return callRpc("admin_set_worker_verified", { p_user: userId, p_verified: verified }, { revalidate: ["/admin"], message: "Statut de vérification mis à jour." });
}

export async function adminReviewVerificationAction(requestId: string, approve: boolean, reviewNote?: string) {
  return callRpc("admin_review_verification", { p_request: requestId, p_approve: approve, p_note: reviewNote ?? null }, {
    revalidate: ["/admin"],
    message: approve ? "Vérification approuvée." : "Vérification refusée.",
  });
}

export async function adminModerateJobAction(jobId: string, hide: boolean, moderationNote?: string) {
  return callRpc("admin_moderate_job", { p_job: jobId, p_hide: hide, p_note: moderationNote ?? null }, {
    revalidate: ["/admin", "/jobs"],
    message: hide ? "Mission masquée." : "Mission rétablie.",
  });
}

export async function adminUpdateReportAction(reportId: string, status: "open" | "reviewing" | "resolved" | "dismissed", resolution?: string) {
  return callRpc("admin_update_report", { p_report: reportId, p_status: status, p_note: resolution ?? null }, { revalidate: ["/admin"], message: "Signalement mis à jour." });
}

export async function adminResolveDisputeAction(disputeId: string, status: "under_review" | "resolved_client" | "resolved_worker" | "closed", resolution: string) {
  const n = z.string().trim().min(5, "Expliquez la décision").max(4000).safeParse(resolution);
  if (!n.success) return { ok: false as const, error: n.error.issues[0]!.message };
  return callRpc("admin_resolve_dispute", { p_dispute: disputeId, p_status: status, p_note: n.data }, { revalidate: ["/admin"], message: "Litige mis à jour." });
}

export async function adminToggleReviewAction(reviewId: string, hidden: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await authed();
    const { error } = await supabase.from("reviews").update({ is_hidden: hidden }).eq("id", reviewId);
    if (error) return fail(error);
    await supabase.rpc("log_audit", { p_action: hidden ? "review.hidden" : "review.restored", p_entity_type: "review", p_entity_id: reviewId, p_metadata: {} });
    revalidatePath("/admin/reviews");
    return { ok: true, data: undefined, message: "Avis mis à jour." };
  } catch (e) {
    return fail(e);
  }
}

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/, "Slug : minuscules, chiffres et tirets"),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  icon: z.string().max(40),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export async function adminSaveCategoryAction(input: unknown): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { supabase } = await authed();
    const v = parsed.data;
    const row = { slug: v.slug, name: v.name, description: v.description || null, icon: v.icon, sort_order: v.sortOrder, is_active: v.isActive };
    const { data, error } = v.id
      ? await supabase.from("categories").update(row).eq("id", v.id).select("id").single()
      : await supabase.from("categories").insert(row).select("id").single();
    if (error) return fail(error);
    await supabase.rpc("log_audit", { p_action: v.id ? "category.updated" : "category.created", p_entity_type: "category", p_entity_id: data.id, p_metadata: row });
    revalidatePath("/admin/categories");
    revalidatePath("/categories");
    return { ok: true, data: undefined, message: "Catégorie enregistrée." };
  } catch (e) {
    return fail(e);
  }
}

export async function adminSetSettingAction(key: string, rawValue: string) {
  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    return { ok: false as const, error: "Valeur JSON invalide (ex. 0.05 ou \"texte\")." };
  }
  return callRpc("admin_set_setting", { p_key: key, p_value: value }, { revalidate: ["/admin/settings"], message: "Paramètre enregistré." });
}

/** Versement au travailleur via l'API du prestataire, puis enregistrement en base. */
export async function adminPayoutAction(paymentId: string): Promise<ActionResult> {
  if (!uuid.safeParse(paymentId).success) return { ok: false, error: "Paiement invalide." };
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Session expirée." };
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return { ok: false, error: "Action réservée aux administrateurs." };
    const { data: p, error } = await supabase.from("payments").select("*").eq("id", paymentId).single();
    if (error || !p) return { ok: false, error: "Paiement introuvable." };
    if (p.status !== "succeeded" || p.payout_status === "completed") return { ok: false, error: "Ce paiement n'est pas éligible au versement." };
    const { data: payee } = await getSupabaseAdminClient().from("profiles").select("first_name, last_name, email, phone").eq("id", p.payee_id).single();
    if (!payee?.phone) return { ok: false, error: "Le travailleur n'a pas de numéro Mobile Money renseigné." };
    const adapter = getAdapter(p.provider as string);
    if (!adapter.createPayout) return { ok: false, error: "Ce prestataire ne gère pas les versements automatiques : versez manuellement puis enregistrez." };
    const result = await adapter.createPayout({
      paymentId,
      amount: p.net_amount as number,
      recipient: { firstName: payee.first_name, lastName: payee.last_name, email: payee.email, phone: payee.phone },
    });
    const { error: rErr } = await supabase.rpc("record_payout", { p_payment_id: paymentId, p_success: result.success, p_reference: result.reference });
    if (rErr) return fail(rErr);
    revalidatePath("/admin/transactions");
    return { ok: true, data: undefined, message: "Versement initié." };
  } catch (e) {
    return fail(e);
  }
}

export async function adminRecordManualPayoutAction(paymentId: string, reference: string) {
  const r = z.string().trim().min(3).max(120).safeParse(reference);
  if (!r.success) return { ok: false as const, error: "Référence de versement requise." };
  return callRpc("record_payout", { p_payment_id: paymentId, p_success: true, p_reference: r.data }, { revalidate: ["/admin/transactions"], message: "Versement enregistré." });
}

export async function adminRefundAction(paymentId: string, reason: string) {
  const r = note.safeParse(reason);
  if (!r.success || !reason?.trim()) return { ok: false as const, error: "Motif requis." };
  return callRpc("admin_refund_payment", { p_payment_id: paymentId, p_reason: reason }, { revalidate: ["/admin/transactions"], message: "Remboursement enregistré." });
}

export async function adminMarkContactHandledAction(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await authed();
    const { error } = await supabase.from("contact_messages").update({ status: "handled" }).eq("id", id);
    if (error) return fail(error);
    revalidatePath("/admin");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}
