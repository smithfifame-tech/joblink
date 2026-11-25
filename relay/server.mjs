#!/usr/bin/env node
/**
 * Relais de versements JOBLINK → SasPay.
 *
 * Pourquoi : SasPay n'autorise les versements (POST /payouts/initialize/) que depuis une adresse IP
 * déclarée dans sa « IP Whitelist ». Vercel n'a pas d'IP de sortie fixe ; ce mini-serveur, installé sur
 * une machine à IP fixe, fait uniquement les versements pour le compte de JOBLINK.
 *
 * Sécurité :
 *  - chaque requête de JOBLINK est signée en HMAC-SHA256 avec la clé SasPay (que les deux côtés possèdent
 *    déjà) : `X-Relay-Timestamp` + `X-Relay-Signature` = HMAC(clé, `${timestamp}.${méthode} ${chemin}\n${corps}`) ;
 *    tolérance 5 min, signature à usage unique (anti-rejeu) ;
 *  - seuls les versements en XOF vers MTN / Moov / Celtiis Bénin sont acceptés, plafonnés (RELAY_MAX_AMOUNT) ;
 *  - clé d'idempotence stable par paiement JOBLINK : un double appel ne verse jamais deux fois ;
 *  - aucune dépendance npm, aucune donnée stockée sur disque, la clé n'est jamais journalisée.
 *
 * Variables d'environnement : SASPAY_SECRET_KEY (obligatoire), SASPAY_ENVIRONMENT (live|sandbox, défaut live),
 * RELAY_PORT (défaut 8787), RELAY_MAX_AMOUNT (défaut 500000 XOF).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const TOLERANCE_S = 300;
const NETWORKS = new Set(["mtn_bj", "moov_bj", "celtiis_bj"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function signRelayRequest(secret, method, path, body, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${method} ${path}\n${body}`).digest("hex");
  return { timestamp: String(timestamp), signature };
}

function safeEqualHex(a, b) {
  if (typeof a !== "string" || !/^[0-9a-f]{64}$/.test(a) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Construit le gestionnaire HTTP (exporté pour les tests). */
export function createRelay({ secretKey, environment = "live", maxAmount = 500000, fetchImpl = fetch, now = () => Date.now() }) {
  if (!secretKey || !/^sk_(live|test)_/.test(secretKey)) throw new Error("SASPAY_SECRET_KEY manquante ou invalide");
  if ((environment === "live") !== secretKey.startsWith("sk_live_")) throw new Error("Clé SasPay incohérente avec SASPAY_ENVIRONMENT");
  const base = environment === "live" ? "https://api.saspay.me/api/v1" : "https://sandbox-api.saspay.me/api/v1";
  const seen = new Map(); // signatures déjà utilisées → expiration

  function verify(req, path, body) {
    const ts = String(req.headers["x-relay-timestamp"] ?? "");
    const sig = String(req.headers["x-relay-signature"] ?? "").toLowerCase();
    if (!/^\d{10}$/.test(ts)) return "bad_timestamp";
    const nowS = Math.floor(now() / 1000);
    if (Math.abs(nowS - Number(ts)) > TOLERANCE_S) return "expired";
    const expected = signRelayRequest(secretKey, req.method, path, body, Number(ts)).signature;
    if (!safeEqualHex(sig, expected)) return "bad_signature";
    for (const [k, exp] of seen) if (exp < nowS) seen.delete(k);
    if (seen.has(sig)) return "replayed";
    seen.set(sig, nowS + TOLERANCE_S);
    return null;
  }

  async function saspay(method, path, body, idempotencyKey) {
    const headers = { Authorization: `Bearer ${secretKey}`, Accept: "application/json", "Content-Type": "application/json" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: { message: text.slice(0, 200) } };
    }
    return { status: res.status, json };
  }

  return async function handler(req, res) {
    const send = (status, payload) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(payload));
    };
    try {
      const url = new URL(req.url ?? "/", "http://relay");
      if (req.method === "GET" && url.pathname === "/health") return send(200, { ok: true, service: "joblink-payout-relay", environment });

      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 16 * 1024) return send(413, { error: "payload_too_large" });
      }

      if (req.method === "POST" && url.pathname === "/v1/payouts") {
        const bad = verify(req, url.pathname, body);
        if (bad) return send(401, { error: bad });
        let p;
        try {
          p = JSON.parse(body);
        } catch {
          return send(400, { error: "invalid_json" });
        }
        if (!UUID.test(p?.paymentId ?? "")) return send(400, { error: "invalid_payment_id" });
        if (!/^\d+\.00$/.test(p?.amount ?? "") || Number(p.amount) < 200 || Number(p.amount) > maxAmount) {
          return send(400, { error: "invalid_amount" });
        }
        if (p.currency !== "XOF" || p.country !== "BJ" || !NETWORKS.has(p.method)) return send(400, { error: "unsupported_destination" });
        if (!/^229\d{10}$/.test(p?.recipient?.msisdn ?? "")) return send(400, { error: "invalid_msisdn" });
        const r = await saspay(
          "POST",
          "/payouts/initialize/",
          {
            amount: p.amount,
            currency: "XOF",
            country: "BJ",
            method: p.method,
            recipient: { msisdn: p.recipient.msisdn },
            customer: p.customer ?? { phone: `+${p.recipient.msisdn}` },
            description: String(p.description ?? "JOBLINK — versement").slice(0, 200),
            metadata: { payment_id: p.paymentId, source: "joblink" },
          },
          `joblink-payout-${p.paymentId}`,
        );
        console.log(`[relay] payout ${p.paymentId.slice(0, 8)} ${p.amount} ${p.method} → ${r.status}`);
        return send(r.status, r.json);
      }

      const m = /^\/v1\/payouts\/([0-9a-f-]{36})$/i.exec(url.pathname);
      if (req.method === "GET" && m) {
        const bad = verify(req, url.pathname, body);
        if (bad) return send(401, { error: bad });
        const r = await saspay("GET", `/payouts/${m[1]}/verify/`);
        return send(r.status, r.json);
      }

      return send(404, { error: "not_found" });
    } catch (e) {
      console.error("[relay] erreur", e instanceof Error ? e.message : e);
      return send(502, { error: "relay_error" });
    }
  };
}

// Démarrage en tant que programme
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const handler = createRelay({
    secretKey: process.env.SASPAY_SECRET_KEY ?? "",
    environment: process.env.SASPAY_ENVIRONMENT === "sandbox" ? "sandbox" : "live",
    maxAmount: Number(process.env.RELAY_MAX_AMOUNT ?? 500000),
  });
  const port = Number(process.env.RELAY_PORT ?? 8787);
  createServer(handler).listen(port, "127.0.0.1", () => console.log(`[relay] à l'écoute sur 127.0.0.1:${port}`));
}
