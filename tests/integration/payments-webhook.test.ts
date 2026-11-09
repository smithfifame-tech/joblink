import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Chaîne complète webhook → vérification de signature → idempotence → rapprochement → confirmation.
 * Les appels serveur srv_* (clé interne) sont remplacés par un double en mémoire.
 */
const state = {
  events: new Set<string>(),
  payments: [{ id: "11111111-2222-4333-8444-555555555555", provider: "sandbox", provider_reference: "SBX-REF-1", status: "processing" }],
  rpc: [] as { fn: string; args: Record<string, unknown> }[],
};

async function fakeServerRpc(fn: string, args: Record<string, unknown> = {}) {
  if (fn === "srv_webhook_begin") {
    const k = `${args.p_provider}:${args.p_event_id}`;
    if (state.events.has(k)) return { data: { duplicate: true, id: null }, error: null };
    state.events.add(k);
    return { data: { duplicate: false, id: `evt-${state.events.size}` }, error: null };
  }
  if (fn === "srv_webhook_finish") return { data: null, error: null };
  if (fn === "srv_find_payment") {
    const p = state.payments.find(
      (x) => x.provider === args.p_provider && ((args.p_reference && x.provider_reference === args.p_reference) || (args.p_payment_id && x.id === args.p_payment_id)),
    );
    return { data: p ?? null, error: null };
  }
  state.rpc.push({ fn, args });
  return { data: null, error: null };
}

vi.mock("@/lib/supabase/server-rpc", () => ({ serverRpc: fakeServerRpc, serverRpcConfigured: () => true }));

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const svc = await import("@/services/payments");
  const sig = await import("@/lib/payments/signature");
  return { ...svc, ...sig };
}

const SECRET = "sandbox-secret-for-tests";

beforeEach(() => {
  vi.unstubAllEnvs();
  state.events.clear();
  state.rpc.length = 0;
});

describe("webhook de paiement", () => {
  it("confirme un paiement signé et ignore le doublon (idempotence)", async () => {
    const { processPaymentWebhook, signPayload } = await load({ APP_ENV: "development", PAYMENT_PROVIDER: "sandbox", SANDBOX_WEBHOOK_SECRET: SECRET });
    const body = JSON.stringify({ id: "evt_1", name: "transaction.approved", entity: { reference: "SBX-REF-1", payment_id: state.payments[0]!.id, fee: 0 } });
    const headers = new Headers({ "x-sandbox-signature": signPayload(body, SECRET) });

    const first = await processPaymentWebhook("sandbox", body, headers);
    expect(first.status).toBe(200);
    expect(state.rpc).toEqual([{ fn: "srv_confirm_payment", args: { p_payment_id: state.payments[0]!.id, p_reference: "SBX-REF-1", p_fee: 0 } }]);

    const replay = await processPaymentWebhook("sandbox", body, headers);
    expect(replay).toEqual({ status: 200, body: { received: true, duplicate: true } });
    expect(state.rpc).toHaveLength(1); // aucune seconde confirmation
  });

  it("rejette une signature invalide sans rien enregistrer (401)", async () => {
    const { processPaymentWebhook, signPayload } = await load({ APP_ENV: "development", SANDBOX_WEBHOOK_SECRET: SECRET });
    const body = JSON.stringify({ id: "evt_2", name: "transaction.approved", entity: { reference: "SBX-REF-1", payment_id: "x" } });
    const res = await processPaymentWebhook("sandbox", body, new Headers({ "x-sandbox-signature": signPayload(body, "mauvais") }));
    expect(res.status).toBe(401);
    expect(state.events.size).toBe(0);
    expect(state.rpc).toHaveLength(0);
  });

  it("marque l'échec d'un paiement refusé", async () => {
    const { processPaymentWebhook, signPayload } = await load({ APP_ENV: "development", SANDBOX_WEBHOOK_SECRET: SECRET });
    const body = JSON.stringify({ id: "evt_3", name: "transaction.declined", entity: { reference: "SBX-REF-1", payment_id: state.payments[0]!.id } });
    const res = await processPaymentWebhook("sandbox", body, new Headers({ "x-sandbox-signature": signPayload(body, SECRET) }));
    expect(res.status).toBe(200);
    expect(state.rpc[0]?.fn).toBe("srv_fail_payment");
  });

  it("n'associe jamais un webhook à un paiement inconnu", async () => {
    const { processPaymentWebhook, signPayload } = await load({ APP_ENV: "development", SANDBOX_WEBHOOK_SECRET: SECRET });
    const body = JSON.stringify({ id: "evt_4", name: "transaction.approved", entity: { reference: "INCONNUE", payment_id: "nope" } });
    const res = await processPaymentWebhook("sandbox", body, new Headers({ "x-sandbox-signature": signPayload(body, SECRET) }));
    expect(res.body).toMatchObject({ matched: false });
    expect(state.rpc).toHaveLength(0);
  });

  it("interdit le prestataire sandbox en production", async () => {
    const { processPaymentWebhook, signPayload } = await load({ APP_ENV: "production", SANDBOX_WEBHOOK_SECRET: SECRET });
    const body = JSON.stringify({ id: "evt_5", name: "transaction.approved", entity: { reference: "SBX-REF-1", payment_id: "x" } });
    const res = await processPaymentWebhook("sandbox", body, new Headers({ "x-sandbox-signature": signPayload(body, SECRET) }));
    expect(res.status).toBe(404);
    expect(state.rpc).toHaveLength(0);
  });

  it("vérifie la signature FedaPay avec l'en-tête X-FEDAPAY-SIGNATURE", async () => {
    const { processPaymentWebhook, signPayload } = await load({ APP_ENV: "production", FEDAPAY_WEBHOOK_SECRET: "wh_live_x", FEDAPAY_SECRET_KEY: "sk_live_x" });
    state.payments.push({ id: "99999999-2222-4333-8444-555555555555", provider: "fedapay", provider_reference: "1234", status: "processing" });
    const body = JSON.stringify({ id: 77, name: "transaction.approved", entity: { id: 1234, fees: 150, merchant_reference: "99999999-2222-4333-8444-555555555555" } });
    const ok = await processPaymentWebhook("fedapay", body, new Headers({ "x-fedapay-signature": signPayload(body, "wh_live_x") }));
    expect(ok.status).toBe(200);
    expect(state.rpc.at(-1)).toEqual({ fn: "srv_confirm_payment", args: { p_payment_id: "99999999-2222-4333-8444-555555555555", p_reference: "1234", p_fee: 150 } });
    const bad = await processPaymentWebhook("fedapay", body, new Headers({ "x-fedapay-signature": "t=1,s=00" }));
    expect(bad.status).toBe(401);
  });
});
