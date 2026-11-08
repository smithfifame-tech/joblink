import "server-only";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { verifySignature } from "../signature";
import { WebhookSignatureError, type PaymentAdapter, type WebhookOutcome } from "../types";

/**
 * Prestataire SANDBOX — tests uniquement. Désactivé en production (voir registry.ts).
 * Le « paiement » est confirmé par un webhook signé envoyé par la page /payments/sandbox,
 * exactement comme le ferait un vrai prestataire : le code métier ne fait aucune exception.
 */
export const sandboxAdapter: PaymentAdapter = {
  id: "sandbox",
  label: "Sandbox (test)",
  methods: ["MTN Mobile Money (test)", "Moov Money (test)"],

  async createCheckout(req) {
    const reference = `SBX-${req.paymentId.replace(/-/g, "").slice(0, 16).toUpperCase()}`;
    return { reference, checkoutUrl: `${publicEnv.siteUrl}/payments/sandbox/${req.paymentId}` };
  },

  async parseWebhook(rawBody, headers): Promise<WebhookOutcome> {
    const check = verifySignature(rawBody, headers.get("x-sandbox-signature"), serverEnv.sandboxWebhookSecret);
    if (!check.valid) throw new WebhookSignatureError(check.reason);
    const event = JSON.parse(rawBody) as {
      id: string;
      name: string;
      entity: { reference: string; payment_id: string; fee?: number };
    };
    if (event.name === "transaction.approved") {
      return {
        kind: "succeeded",
        eventId: event.id,
        reference: event.entity.reference,
        providerFee: event.entity.fee ?? 0,
        paymentId: event.entity.payment_id,
      };
    }
    if (event.name === "transaction.declined" || event.name === "transaction.canceled") {
      return {
        kind: "failed",
        eventId: event.id,
        reference: event.entity.reference,
        reason: "Paiement refusé (sandbox)",
        paymentId: event.entity.payment_id,
      };
    }
    return { kind: "ignored", eventId: event.id, reason: event.name };
  },

  async fetchStatus() {
    return "unknown";
  },

  async createPayout(req) {
    return { reference: `SBX-PAYOUT-${req.paymentId.slice(0, 8)}`, success: true };
  },
};
