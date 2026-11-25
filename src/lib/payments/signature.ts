import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vérification de signature des webhooks au format `t=<unix>,s=<hmac_sha256_hex>`
 * où la signature porte sur `${t}.${corps_brut}` (format FedaPay, vérifié dans le SDK officiel).
 * Le même schéma est utilisé par l'adaptateur sandbox.
 */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function computeSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function signPayload(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  return `t=${timestamp},s=${computeSignature(`${timestamp}.${rawBody}`, secret)}`;
}

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function verifySignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  opts: { tolerance?: number; now?: number } = {},
): { valid: true } | { valid: false; reason: string } {
  if (!secret) return { valid: false, reason: "missing_secret" };
  if (!header) return { valid: false, reason: "missing_header" };
  let timestamp = -1;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2).map((s) => s.trim());
    if (k === "t" && v) timestamp = Number.parseInt(v, 10);
    if (k === "s" && v) signatures.push(v);
  }
  if (!Number.isFinite(timestamp) || timestamp < 0) return { valid: false, reason: "bad_timestamp" };
  if (signatures.length === 0) return { valid: false, reason: "no_signature" };
  const expected = computeSignature(`${timestamp}.${rawBody}`, secret);
  if (!signatures.some((s) => safeEqualHex(s, expected))) return { valid: false, reason: "mismatch" };
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const tolerance = opts.tolerance ?? SIGNATURE_TOLERANCE_SECONDS;
  if (Math.abs(now - timestamp) > tolerance) return { valid: false, reason: "expired" };
  return { valid: true };
}

/**
 * Format SasPay (https://docs.saspay.me/api-reference/webhooks) : deux en-têtes distincts,
 * `X-Webhook-Timestamp` (secondes Unix) et `X-Webhook-Signature` (HMAC-SHA256 hex minuscule)
 * calculé sur `${timestamp}.${corps_brut}`. Même tolérance de 5 minutes, comparaison en temps constant.
 */
export function verifyTimestampedSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  timestampHeader: string | null | undefined,
  secret: string,
  opts: { tolerance?: number; now?: number } = {},
): { valid: true } | { valid: false; reason: string } {
  if (!secret) return { valid: false, reason: "missing_secret" };
  if (!signatureHeader || !timestampHeader) return { valid: false, reason: "missing_header" };
  const ts = timestampHeader.trim();
  if (!/^\d{1,16}$/.test(ts)) return { valid: false, reason: "bad_timestamp" };
  // Variantes tolérées : préfixe « sha256= », majuscules, plusieurs signatures séparées par des virgules (rotation).
  const candidates = signatureHeader
    .split(",")
    .map((v) => v.trim().replace(/^(sha256|v1|s)=/i, "").toLowerCase())
    .filter(Boolean);
  const expected = computeSignature(`${ts}.${rawBody}`, secret);
  if (!candidates.some((c) => safeEqualHex(c, expected))) return { valid: false, reason: "mismatch" };
  // Horodatage en secondes (documenté) ou en millisecondes
  const seconds = ts.length >= 13 ? Math.floor(Number(ts) / 1000) : Number(ts);
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const tolerance = opts.tolerance ?? SIGNATURE_TOLERANCE_SECONDS;
  if (Math.abs(now - seconds) > tolerance) return { valid: false, reason: "expired" };
  return { valid: true };
}

/** Produit les en-têtes d'un webhook au format SasPay (tests). */
export function signTimestampedPayload(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  return { timestamp: String(timestamp), signature: computeSignature(`${timestamp}.${rawBody}`, secret) };
}
