import "server-only";
import { serverRpc } from "@/lib/supabase/server-rpc";
import { getAdapter } from "@/lib/payments/registry";
import { WebhookSignatureError } from "@/lib/payments/types";

export type WebhookResult = { status: number; body: Record<string, unknown> };

/**
 * Traitement d'un webhook de paiement :
 *  1. vérification de la signature (dans l'adaptateur) — rejet 401 sinon ;
 *  2. enregistrement de l'événement (unique par fournisseur + id) → idempotence ;
 *  3. rapprochement avec le paiement par référence fournisseur ;
 *  4. confirmation atomique via la fonction SQL confirm_payment (appel serveur srv_*).
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

  let payload: unknown = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "invalid_payload" } };
  }
  const begun = await serverRpc<{ duplicate: boolean; id: string | null }>("srv_webhook_begin", {
    p_provider: adapter.id,
    p_event_id: outcome.eventId,
    p_event_type: outcome.kind,
    p_payload: payload,
  });
  if (begun.error || !begun.data) return { status: 500, body: { error: "storage_failed" } };
  if (begun.data.duplicate) return { status: 200, body: { received: true, duplicate: true } };
  const eventRowId = begun.data.id;
  const finish = async (status: "processed" | "ignored" | "error", error?: string) => {
    if (eventRowId) await serverRpc("srv_webhook_finish", { p_id: eventRowId, p_status: status, p_error: error ?? null });
  };

  if (outcome.kind === "ignored") {
    await finish("ignored");
    return { status: 200, body: { received: true, ignored: outcome.reason } };
  }

  // Rapprochement : par référence fournisseur, sinon par référence marchand transmise à la création
  const paymentId = outcome.paymentId && /^[0-9a-f-]{36}$/i.test(outcome.paymentId) ? outcome.paymentId : null;
  const { data: payment } = await serverRpc<{ id: string; status: string; provider_reference: string | null }>("srv_find_payment", {
    p_provider: adapter.id,
    p_reference: outcome.reference ?? null,
    p_payment_id: paymentId,
  });
  if (!payment) {
    await finish("error", "payment_not_found");
    return { status: 200, body: { received: true, matched: false } };
  }

  if (outcome.kind === "succeeded") {
    const { error } = await serverRpc("srv_confirm_payment", {
      p_payment_id: payment.id,
      p_reference: outcome.reference ?? null,
      p_fee: outcome.providerFee ?? null,
    });
    if (error) {
      await finish("error", error.message);
      return { status: 500, body: { error: "confirm_failed" } };
    }
  } else {
    await serverRpc("srv_fail_payment", { p_payment_id: payment.id, p_reason: outcome.reason });
  }
  await finish("processed");
  return { status: 200, body: { received: true } };
}

/**
 * Rapprochement de secours au retour du client : interroge l'API du prestataire (authentifiée par clé secrète)
 * si le webhook n'est pas encore arrivé. Ne fait jamais confiance aux paramètres d'URL du navigateur.
 */
export async function reconcilePayment(paymentId: string, provider: string): Promise<void> {
  const { data: p } = await serverRpc<{ id: string; status: string; provider: string; provider_reference: string | null }>("srv_find_payment", {
    p_provider: provider,
    p_reference: null,
    p_payment_id: paymentId,
  });
  if (!p || p.status !== "processing" || !p.provider_reference) return;
  try {
    const status = await getAdapter(p.provider).fetchStatus(p.provider_reference);
    if (status === "approved") await serverRpc("srv_confirm_payment", { p_payment_id: p.id, p_reference: p.provider_reference, p_fee: null });
    if (status === "declined") await serverRpc("srv_fail_payment", { p_payment_id: p.id, p_reason: "Refusé par le prestataire" });
  } catch {
    // Le webhook signé reste la source de vérité ; on réessaiera plus tard.
  }
}
