import "server-only";
import { serverEnv } from "@/lib/env.server";
import { verifyTimestampedSignature } from "../signature";
import { WebhookSignatureError, type PaymentAdapter, type WebhookOutcome } from "../types";

/**
 * Adaptateur SasPay — https://docs.saspay.me (spécification OpenAPI : /api-reference/openapi.json).
 * Une seule API REST pour MTN MoMo, Moov Money et Celtiis Cash au Bénin (et 17 autres pays).
 *
 * Flux retenu : session de checkout hébergée (`POST /checkout-sessions/`). Le client choisit son réseau
 * et saisit son numéro sur la page SasPay ; aucune donnée de paiement ne transite par JOBLINK.
 *
 * Points imposés par SasPay et pris en compte ici :
 *  - l'environnement est choisi par l'HÔTE, pas par la clé : `api.saspay.me` traite TOUT appel comme réel,
 *    même avec une clé `sk_test_`. D'où le contrôle de cohérence clé ↔ environnement (`saspayKeyMatchesEnv`) ;
 *  - montants en chaînes décimales (« 10000.00 »), jamais de flottants ;
 *  - le webhook notifie la TRANSACTION (id, référence), pas la session : on revérifie la transaction
 *    par l'API authentifiée (`GET /payments/{id}/verify/`) et on retrouve le paiement JOBLINK grâce à la
 *    référence « JL:<uuid> » placée dans la description de la session ;
 *  - un échec sur la page hébergée n'est pas définitif (bouton « Réessayer ») : seuls l'expiration ou
 *    l'annulation de la session font échouer le paiement JOBLINK (voir `fetchStatus`).
 */
const BASE = () =>
  serverEnv.saspayEnvironment === "live" ? "https://api.saspay.me/api/v1" : "https://sandbox-api.saspay.me/api/v1";

/** Une clé de test ne doit jamais partir vers l'hôte réel, ni une clé réelle vers le bac à sable. */
export function saspayKeyMatchesEnv(key = serverEnv.saspaySecretKey, env = serverEnv.saspayEnvironment): boolean {
  if (!key) return false;
  return env === "live" ? key.startsWith("sk_live_") : key.startsWith("sk_test_");
}

export class SaspayApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
  ) {
    super(`SasPay ${status}${code ? ` ${code}` : ""}: ${message}`);
    this.name = "SaspayApiError";
  }
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  if (!saspayKeyMatchesEnv()) throw new Error("Clé SasPay absente ou incohérente avec SASPAY_ENVIRONMENT");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${serverEnv.saspaySecretKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(`${BASE()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  // Enveloppe documentée : { success, data, code } — certains exemples renvoient l'objet à plat.
  if (!res.ok || json.success === false) {
    const err = (json.error ?? json) as Record<string, unknown>;
    const code = typeof err.code === "string" ? err.code : null;
    const message = typeof err.message === "string" ? err.message : JSON.stringify(err).slice(0, 300);
    throw new SaspayApiError(res.status, code, message);
  }
  return (json.success === true && json.data && typeof json.data === "object" ? json.data : json) as T;
}

/** XOF : entier en base → « 10000.00 ». */
export function toDecimalString(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("Montant XOF invalide");
  return `${amount}.00`;
}

function parseAmount(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v)) return Number(v);
  return null;
}

/** Référence JOBLINK insérée dans la description de la session (relue via la vérification de transaction). */
const REF_PREFIX = "JL:";
const REF_RE = /JL:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
export function extractJoblinkPaymentId(text: unknown): string | undefined {
  return typeof text === "string" ? REF_RE.exec(text)?.[1]?.toLowerCase() : undefined;
}

const DIAL_CODES: Record<string, string> = { "229": "BJ", "228": "TG", "227": "NE", "226": "BF", "234": "NG" };

/** Pays déduit de l'indicatif (+229 → BJ). Par défaut : Bénin. */
export function countryFromPhone(phone: string | null | undefined): string {
  const m = /^\+(\d{3})/.exec(phone ?? "");
  return (m && DIAL_CODES[m[1]!]) || "BJ";
}

/**
 * Numéro béninois au format 10 chiffres (« 01 » + 8 chiffres, en vigueur depuis le 30/11/2024).
 * SasPay ajoute l'indicatif s'il manque mais ne corrige jamais un numéro local : on normalise ici
 * les anciens numéros à 8 chiffres encore présents dans certains profils.
 */
export function normalizeBeninPhone(phone: string): string {
  const m = /^\+229(\d+)$/.exec(phone.replace(/\s/g, ""));
  if (!m) return phone;
  return m[1]!.length === 8 ? `+22901${m[1]}` : phone;
}

// Préfixes mobiles (2 chiffres après « 01 ») — sources concordantes uniquement. Un préfixe absent
// de ces listes (ex. 55, 58) n'est PAS deviné : le versement doit alors être fait manuellement.
const BJ_NETWORKS: Record<string, "mtn_bj" | "moov_bj" | "celtiis_bj"> = {};
for (const p of ["42", "46", "50", "51", "52", "53", "54", "56", "57", "59", "61", "62", "66", "67", "69", "90", "91", "96", "97"]) BJ_NETWORKS[p] = "mtn_bj";
for (const p of ["45", "60", "63", "64", "65", "68", "94", "95", "98", "99"]) BJ_NETWORKS[p] = "moov_bj";
for (const p of ["43", "44", "47"]) BJ_NETWORKS[p] = "celtiis_bj";

/** Code réseau SasPay d'un numéro béninois, ou null si l'opérateur ne peut pas être déterminé avec certitude. */
export function beninNetworkFor(phone: string): "mtn_bj" | "moov_bj" | "celtiis_bj" | null {
  const m = /^\+22901(\d{2})\d{6}$/.exec(normalizeBeninPhone(phone));
  return m ? (BJ_NETWORKS[m[1]!] ?? null) : null;
}

interface SaspayTransaction {
  id: string;
  status?: string;
  description?: string;
  currency?: string;
  transaction_type?: string;
  requested_amount?: string;
  net_amount?: string;
}

export const saspayAdapter: PaymentAdapter = {
  id: "saspay",
  label: "SasPay",
  methods: ["MTN Mobile Money", "Moov Money", "Celtiis Cash"],

  async createCheckout(req) {
    const name = `${req.customer.firstName} ${req.customer.lastName}`.trim() || "Client JOBLINK";
    const ref = ` · Réf. ${REF_PREFIX}${req.paymentId}`;
    const session = await call<{ id: string; checkout_url: string }>("POST", "/checkout-sessions/", {
      amount: toDecimalString(req.amount),
      currency: "XOF",
      country: countryFromPhone(req.customer.phone),
      description: `${req.description.slice(0, 250 - ref.length)}${ref}`,
      customer_email: req.customer.email,
      customer_name: name.slice(0, 120),
      ...(req.customer.phone ? { customer_phone: normalizeBeninPhone(req.customer.phone) } : {}),
      return_url: req.callbackUrl,
      metadata: { payment_id: req.paymentId, source: "joblink" },
      // Expiration : une session abandonnée finit par libérer le paiement (statut EXPIRED → échec).
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
    if (!session?.id || !session.checkout_url) throw new Error("Réponse SasPay incomplète (checkout_url)");
    return { reference: session.id, checkoutUrl: session.checkout_url };
  },

  async parseWebhook(rawBody, headers): Promise<WebhookOutcome> {
    const check = verifyTimestampedSignature(
      rawBody,
      headers.get("x-webhook-signature"),
      headers.get("x-webhook-timestamp"),
      serverEnv.saspayWebhookSecret,
    );
    if (!check.valid) throw new WebhookSignatureError(check.reason);

    const event = JSON.parse(rawBody) as { event?: string; data?: { id?: string; status?: string; type?: string } };
    const name = event.event ?? "unknown";
    const trxId = event.data?.id;
    // SasPay ne fournit pas d'identifiant d'événement : (événement, transaction, statut) est stable d'une relivraison à l'autre.
    const eventId = `${name}:${trxId ?? "none"}:${event.data?.status ?? ""}`;

    if (!name.startsWith("transaction.") || !trxId) return { kind: "ignored", eventId, reason: name };
    if (event.data?.type && event.data.type !== "PAIEMENT") return { kind: "ignored", eventId, reason: `type ${event.data.type}` };
    if (name !== "transaction.success") {
      // Échec d'une tentative sur la page hébergée : le client peut réessayer sur la même session.
      return { kind: "ignored", eventId, reason: `${name} (session toujours ouverte)` };
    }

    // Le webhook est signé, mais on ne confirme qu'après relecture authentifiée de la transaction.
    const trx = await call<SaspayTransaction>("GET", `/payments/${encodeURIComponent(trxId)}/verify/`);
    const paymentId = extractJoblinkPaymentId(trx.description);
    if (!paymentId) return { kind: "ignored", eventId, reason: "transaction hors JOBLINK" };
    if (trx.status !== "SUCCESS") return { kind: "ignored", eventId, reason: `vérification : ${trx.status ?? "inconnu"}` };
    if (trx.currency && trx.currency !== "XOF") return { kind: "ignored", eventId, reason: `devise ${trx.currency}` };

    // Frais supportés par JOBLINK = montant demandé − montant net reçu (0 si les frais sont ajoutés au client).
    const requested = parseAmount(trx.requested_amount);
    const net = parseAmount(trx.net_amount);
    const providerFee = requested !== null && net !== null ? Math.max(0, Math.round(requested - net)) : null;
    return { kind: "succeeded", eventId, reference: null, providerFee, paymentId };
  },

  async fetchStatus(reference) {
    // `reference` = identifiant de la session de checkout ; SasPay revérifie l'état réel auprès de l'opérateur.
    const s = await call<{ status?: string; transaction_status?: string | null }>(
      "GET",
      `/checkout-sessions/${encodeURIComponent(reference)}/status/`,
    );
    if (s.status === "PAID" && s.transaction_status === "SUCCESS") return "approved";
    if (s.status === "EXPIRED" || s.status === "CANCELLED") return "declined";
    if (s.status === "PENDING" || s.status === "PAID") return "pending";
    return "unknown";
  },

  async createPayout(req) {
    if (!serverEnv.saspayPayoutsEnabled) {
      throw new Error(
        "Versements automatiques SasPay désactivés (SASPAY_PAYOUTS_ENABLED) : versez depuis le tableau de bord SasPay puis enregistrez la référence.",
      );
    }
    const country = countryFromPhone(req.recipient.phone);
    const method = country === "BJ" ? beninNetworkFor(req.recipient.phone) : null;
    if (!method) {
      throw new Error("Opérateur Mobile Money du travailleur non déterminé : versez manuellement puis enregistrez la référence.");
    }
    const phone = normalizeBeninPhone(req.recipient.phone);
    // Clé stable par paiement : un double clic ou une relance réseau ne crée jamais un second versement.
    const created = await call<{ id: string }>(
      "POST",
      "/payouts/initialize/",
      {
        amount: toDecimalString(req.amount),
        currency: "XOF",
        country,
        method,
        recipient: { msisdn: phone.replace(/^\+/, "") },
        customer: { email: req.recipient.email, first_name: req.recipient.firstName, last_name: req.recipient.lastName, phone },
        description: `JOBLINK — versement mission ${req.paymentId.slice(0, 8)}`,
        metadata: { payment_id: req.paymentId, source: "joblink" },
      },
      `joblink-payout-${req.paymentId}`,
    );
    const verified = await call<{ status?: string }>("GET", `/payouts/${encodeURIComponent(created.id)}/verify/`).catch(() => ({ status: "PENDING" }));
    return { reference: created.id, success: verified.status !== "FAILED" };
  },
};

/**
 * Contrôle de connexion (utilisé par /api/health) : appel authentifié en lecture seule (`GET /networks/`),
 * sans aucun mouvement d'argent. Résultat mis en cache 10 minutes pour ménager la limite de 300 requêtes/min.
 * Ne renvoie jamais la clé ni un message brut de SasPay.
 */
let pingCache: { at: number; value: "ok" | "cle_refusee" | "injoignable" } | null = null;
export async function saspayPing(): Promise<"ok" | "cle_refusee" | "injoignable"> {
  if (pingCache && Date.now() - pingCache.at < 10 * 60 * 1000) return pingCache.value;
  let value: "ok" | "cle_refusee" | "injoignable";
  try {
    await call("GET", "/networks/?page_size=1");
    value = "ok";
  } catch (e) {
    value = e instanceof SaspayApiError && (e.status === 401 || e.status === 403) ? "cle_refusee" : "injoignable";
  }
  pingCache = { at: Date.now(), value };
  return value;
}
