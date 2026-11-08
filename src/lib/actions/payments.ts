"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getActiveAdapter, getAdapter, isPaymentConfigured } from "@/lib/payments/registry";
import { signPayload } from "@/lib/payments/signature";
import { serverEnv, isProduction } from "@/lib/env.server";
import { publicEnv } from "@/lib/env";
import { fail, type ActionResult } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { processPaymentWebhook } from "@/services/payments";
import type { Payment, Profile } from "@/types/db";
import { authed, callRpc } from "./_helpers";

/**
 * Démarre le paiement d'un contrat validé. Le montant est calculé en base à partir du contrat
 * (jamais transmis par le navigateur). Retourne l'URL de paiement du prestataire.
 */
export async function startPaymentAction(contractId: string, idempotencyKey?: string): Promise<ActionResult<{ checkoutUrl: string }>> {
  if (!z.string().uuid().safeParse(contractId).success) return { ok: false, error: "Mission invalide." };
  if (!isPaymentConfigured()) {
    return { ok: false, error: "Le paiement en ligne n'est pas encore activé sur cette instance. Contactez l'administrateur." };
  }
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Session expirée." };
    if (!(await rateLimit("payment:start", user.id, 10, 600))) return { ok: false, error: "Trop de tentatives de paiement." };

    const adapter = getActiveAdapter();
    const key = idempotencyKey && /^[\w-]{16,80}$/.test(idempotencyKey) ? idempotencyKey : `pay-${contractId}-${randomUUID()}`;
    const { data, error } = await supabase.rpc("create_payment_intent", {
      p_contract_id: contractId,
      p_provider: adapter.id,
      p_idempotency_key: key,
    });
    if (error) return fail(error);
    const payment = data as Payment;

    // Intention déjà en cours chez le prestataire : on réutilise la même session
    if (payment.checkout_url && payment.status === "processing") {
      return { ok: true, data: { checkoutUrl: payment.checkout_url } };
    }

    const [{ data: profile }, { data: job }] = await Promise.all([
      supabase.from("profiles").select("first_name, last_name, email, phone").eq("id", user.id).single<Pick<Profile, "first_name" | "last_name" | "email" | "phone">>(),
      supabase.from("jobs").select("title").eq("id", payment.job_id).single(),
    ]);
    const session = await getAdapter(payment.provider).createCheckout({
      paymentId: payment.id,
      amount: payment.amount,
      description: `JOBLINK — ${job?.title ?? "Mission"}`,
      customer: {
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        email: profile?.email ?? "",
        phone: profile?.phone ?? null,
      },
      callbackUrl: `${publicEnv.siteUrl}/client/payments?payment=${payment.id}`,
    });
    const { error: refErr } = await getSupabaseAdminClient().rpc("attach_payment_reference", {
      p_payment_id: payment.id,
      p_reference: session.reference,
      p_checkout_url: session.checkoutUrl,
    });
    if (refErr) return fail(refErr);
    return { ok: true, data: { checkoutUrl: session.checkoutUrl } };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelPaymentIntentAction(paymentId: string) {
  return callRpc("cancel_payment_intent", { p_payment_id: paymentId }, { revalidate: ["/client/payments"] });
}

/**
 * SANDBOX uniquement : émet un webhook signé (succès/échec) traité par la même chaîne qu'en réel.
 * Interdit en production.
 */
export async function simulateSandboxPaymentAction(paymentId: string, outcome: "approved" | "declined"): Promise<ActionResult> {
  if (isProduction() || serverEnv.paymentProvider !== "sandbox") return { ok: false, error: "Mode sandbox indisponible." };
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Session expirée." };
    const { data: p } = await supabase.from("payments").select("id, payer_id, provider_reference, provider").eq("id", paymentId).maybeSingle();
    if (!p || p.payer_id !== user.id || p.provider !== "sandbox") return { ok: false, error: "Paiement introuvable." };
    const body = JSON.stringify({
      id: `sbx_evt_${randomUUID()}`,
      name: outcome === "approved" ? "transaction.approved" : "transaction.declined",
      entity: { reference: p.provider_reference, payment_id: p.id, fee: 0 },
    });
    const headers = new Headers({ "x-sandbox-signature": signPayload(body, serverEnv.sandboxWebhookSecret) });
    const res = await processPaymentWebhook("sandbox", body, headers);
    if (res.status !== 200) return { ok: false, error: "Le webhook sandbox a été rejeté." };
    revalidatePath("/client/payments");
    return { ok: true, data: undefined, message: outcome === "approved" ? "Paiement de test confirmé." : "Paiement de test refusé." };
  } catch (e) {
    return fail(e);
  }
}
