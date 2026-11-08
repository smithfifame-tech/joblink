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
