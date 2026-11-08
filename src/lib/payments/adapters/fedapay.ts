import "server-only";
import { serverEnv } from "@/lib/env.server";
import { verifySignature } from "../signature";
import { WebhookSignatureError, type PaymentAdapter, type WebhookOutcome } from "../types";

/**
 * Adaptateur FedaPay (agrégateur béninois : MTN Mobile Money, Moov Money, cartes).
 * API REST : https://docs.fedapay.com — signature de webhook vérifiée selon le SDK officiel
 * (en-tête X-FEDAPAY-SIGNATURE « t=…,s=… », HMAC-SHA256 de « t.corps », tolérance 5 min).
 * Requiert un compte marchand validé (KYC) et l'activation des reversements (payouts) par FedaPay.
 */
const BASE = () =>
  serverEnv.fedapayEnvironment === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!serverEnv.fedapaySecretKey) throw new Error("FEDAPAY_SECRET_KEY manquante");
  const res = await fetch(`${BASE()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${serverEnv.fedapaySecretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`FedaPay ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json as T;
}

/** Les réponses FedaPay sont enveloppées sous une clé « v1/<ressource> ». */
function unwrap<T>(json: Record<string, unknown>, resource: string): T {
  const key = Object.keys(json).find((k) => k === `v1/${resource}`);
  return (key ? json[key] : json) as T;
}

function localPhone(phone: string | null) {
  if (!phone) return undefined;
  const country = phone.startsWith("+228") ? "tg" : "bj";
  return { number: phone.replace(/^\+\d{3}/, ""), country };
}

export const fedapayAdapter: PaymentAdapter = {
  id: "fedapay",
  label: "FedaPay",
  methods: ["MTN Mobile Money", "Moov Money", "Carte bancaire"],

  async createCheckout(req) {
    const created = await call<Record<string, unknown>>("POST", "/transactions", {
      description: req.description.slice(0, 250),
      amount: req.amount,
      currency: { iso: "XOF" },
      callback_url: req.callbackUrl,
      merchant_reference: req.paymentId,
      custom_metadata: { payment_id: req.paymentId },
      customer: {
        firstname: req.customer.firstName,
        lastname: req.customer.lastName,
        email: req.customer.email,
        phone_number: localPhone(req.customer.phone),
      },
    });
    const trx = unwrap<{ id: number | string }>(created, "transaction");
    const token = await call<{ token: string; url: string }>("POST", `/transactions/${trx.id}/token`);
    return { reference: String(trx.id), checkoutUrl: token.url };
  },

  async parseWebhook(rawBody, headers): Promise<WebhookOutcome> {
    const check = verifySignature(rawBody, headers.get("x-fedapay-signature"), serverEnv.fedapayWebhookSecret);
    if (!check.valid) throw new WebhookSignatureError(check.reason);
    const event = JSON.parse(rawBody) as {
      id?: string | number;
      name: string;
      entity?: { id: string | number; status?: string; fees?: number; merchant_reference?: string };
    };
    const entity = event.entity;
    const eventId = String(event.id ?? `${event.name}:${entity?.id ?? "unknown"}`);
    if (!entity) return { kind: "ignored", eventId, reason: "no_entity" };
    const reference = String(entity.id);
    if (event.name === "transaction.approved" || event.name === "transaction.transferred") {
      return {
        kind: "succeeded",
        eventId,
        reference,
        providerFee: typeof entity.fees === "number" ? Math.round(entity.fees) : null,
        paymentId: entity.merchant_reference,
      };
    }
    if (event.name === "transaction.declined" || event.name === "transaction.canceled") {
      return { kind: "failed", eventId, reference, reason: `FedaPay: ${event.name}`, paymentId: entity.merchant_reference };
    }
    return { kind: "ignored", eventId, reason: event.name };
  },

  async fetchStatus(reference) {
    const json = await call<Record<string, unknown>>("GET", `/transactions/${encodeURIComponent(reference)}`);
    const trx = unwrap<{ status?: string }>(json, "transaction");
    if (trx.status === "approved" || trx.status === "transferred") return "approved";
    if (trx.status === "declined" || trx.status === "canceled") return "declined";
    if (trx.status === "pending") return "pending";
    return "unknown";
  },

  async createPayout(req) {
    const created = await call<Record<string, unknown>>("POST", "/payouts", {
      amount: req.amount,
      currency: { iso: "XOF" },
      merchant_reference: `payout-${req.paymentId}`,
      customer: {
        firstname: req.recipient.firstName,
        lastname: req.recipient.lastName,
        email: req.recipient.email,
        phone_number: localPhone(req.recipient.phone),
      },
    });
    const payout = unwrap<{ id: number | string }>(created, "payout");
    await call("PUT", "/payouts/start", { payouts: [{ id: payout.id }] });
    return { reference: String(payout.id), success: true };
  },
};
