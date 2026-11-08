import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/payments/registry";
import { WebhookSignatureError } from "@/lib/payments/types";

export type WebhookResult = { status: number; body: Record<string, unknown> };

/**
 * Traitement d'un webhook de paiement :
 *  1. vérification de la signature (dans l'adaptateur) — rejet 401 sinon ;
 *  2. enregistrement de l'événement (unique par fournisseur + id) → idempotence ;
 *  3. rapprochement avec le paiement par référence fournisseur ;
 *  4. confirmation atomique via la fonction SQL confirm_payment (service_role).
 * Le montant n'est jamais lu depuis le webhook pour créditer : il provient du contrat en base.
 */
export async function processPaymentWebhook(providerId: string, rawBody: string, headers: Headers): Promise<WebhookResult> {
  let adapter;
  try {
    adapter = getAdapter(providerId);
  } catch {
    return { status: 404, body: { error: "unknown_provider" } };
  }

  let outcome;
  try {
    outcome = await adapter.parseWebhook(rawBody, headers);
  } catch (e) {
    if (e instanceof WebhookSignatureError) return { status: 401, body: { error: "invalid_signature" } };
    return { status: 400, body: { error: "invalid_payload" } };
  }

  const db = getSupabaseAdminClient();
  const { data: inserted, error: insErr } = await db
    .from("webhook_events")
    .insert({ provider: adapter.id, event_id: outcome.eventId, event_type: outcome.kind, payload: JSON.parse(rawBody) })
    .select("id")
    .maybeSingle();
  if (insErr) {
    if (/duplicate|unique/i.test(insErr.message)) return { status: 200, body: { received: true, duplicate: true } };
    return { status: 500, body: { error: "storage_failed" } };
  }
  const eventRowId = inserted?.id as string | undefined;
  const finish = async (status: "processed" | "ignored" | "error", error?: string) => {
    if (eventRowId) await db.from("webhook_events").update({ status, error: error ?? null, processed_at: new Date().toISOString() }).eq("id", eventRowId);
  };

  if (outcome.kind === "ignored") {
    await finish("ignored");
    return { status: 200, body: { received: true, ignored: outcome.reason } };
  }

  // Rapprochement : par référence fournisseur, sinon par référence marchand transmise à la création
  let query = db.from("payments").select("id, provider_reference, status").eq("provider", adapter.id);
  query = outcome.reference ? query.eq("provider_reference", outcome.reference) : query.eq("id", outcome.paymentId ?? "");
  let { data: payment } = await query.maybeSingle();
  if (!payment && outcome.paymentId && /^[0-9a-f-]{36}$/i.test(outcome.paymentId)) {
    ({ data: payment } = await db.from("payments").select("id, provider_reference, status").eq("provider", adapter.id).eq("id", outcome.paymentId).maybeSingle());
  }
  if (!payment) {
    await finish("error", "payment_not_found");
    return { status: 200, body: { received: true, matched: false } };
  }

  if (outcome.kind === "succeeded") {
    const { error } = await db.rpc("confirm_payment", {
      p_payment_id: payment.id,
      p_provider_reference: outcome.reference,
      p_provider_fee: outcome.providerFee,
    });
    if (error) {
      await finish("error", error.message);
      return { status: 500, body: { error: "confirm_failed" } };
    }
  } else {
    await db.rpc("fail_payment", { p_payment_id: payment.id, p_reason: outcome.reason });
  }
  await finish("processed");
  return { status: 200, body: { received: true } };
}

/**
 * Rapprochement de secours au retour du client : interroge l'API du prestataire (authentifiée par clé secrète)
 * si le webhook n'est pas encore arrivé. Ne fait jamais confiance aux paramètres d'URL du navigateur.
 */
export async function reconcilePayment(paymentId: string): Promise<void> {
  const db = getSupabaseAdminClient();
  const { data: p } = await db.from("payments").select("id, provider, provider_reference, status").eq("id", paymentId).maybeSingle();
  if (!p || p.status !== "processing" || !p.provider_reference) return;
  try {
    const status = await getAdapter(p.provider as string).fetchStatus(p.provider_reference as string);
    if (status === "approved") await db.rpc("confirm_payment", { p_payment_id: p.id, p_provider_reference: p.provider_reference, p_provider_fee: null });
    if (status === "declined") await db.rpc("fail_payment", { p_payment_id: p.id, p_reason: "Refusé par le prestataire" });
  } catch {
    // Le webhook signé reste la source de vérité ; on réessaiera plus tard.
  }
}
