import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Chaîne SasPay : signature (X-Webhook-Signature + X-Webhook-Timestamp) → revérification authentifiée
 * de la transaction (GET /payments/{id}/verify/, simulé) → rapprochement par la référence JL:<uuid>
 * → confirmation. Les appels srv_* et l'API SasPay sont remplacés par des doubles en mémoire.
 */
const PAYMENT_ID = "aaaaaaaa-1111-4222-8333-444444444444";
const SESSION_ID = "c9a17e2c-4b1a-4f0e-9c3d-2a1b3c4d5e6f";
const TRX_ID = "9c3f2a10-4b7e-4f1a-9d2e-9b6a7c1e4a02";
const SECRET = "whsec_saspay_test";

const state = {
  events: new Set<string>(),
  payments: [{ id: PAYMENT_ID, provider: "saspay", provider_reference: SESSION_ID, status: "processing" }],
  rpc: [] as { fn: string; args: Record<string, unknown> }[],
  verify: {} as Record<string, unknown>,
  fetches: [] as { url: string; init: RequestInit }[],
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

const ENV = { APP_ENV: "development", PAYMENT_PROVIDER: "saspay", SASPAY_ENVIRONMENT: "sandbox", SASPAY_SECRET_KEY: "sk_test_abc", SASPAY_WEBHOOK_SECRET: SECRET };

async function load(env: Record<string, string> = ENV) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const svc = await import("@/services/payments");
  const sig = await import("@/lib/payments/signature");
  return { ...svc, ...sig };
}

function webhook(event: string, data: Record<string, unknown>, secret = SECRET, ts?: number) {
  const body = JSON.stringify({ event, data });
  return { body, headers: headersFor(body, secret, ts) };
}
function headersFor(body: string, secret: string, ts?: number) {
  const t = ts ?? Math.floor(Date.now() / 1000);
  const s = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return new Headers({ "x-webhook-signature": s, "x-webhook-timestamp": String(t), "x-webhook-event": "transaction.success" });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  state.events.clear();
  state.rpc.length = 0;
  state.fetches.length = 0;
  state.verify = {
    message: "Payment transaction fetched successfully",
    id: TRX_ID,
    transaction_type: "PAIEMENT",
    description: `JOBLINK — Plomberie · Réf. JL:${PAYMENT_ID}`,
    requested_amount: "10000.00",
    net_amount: "9850.00",
    currency: "XOF",
    status: "SUCCESS",
  };
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    state.fetches.push({ url, init });
    return new Response(JSON.stringify(state.verify), { status: 200, headers: { "content-type": "application/json" } });
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("webhook SasPay", () => {
  it("confirme après revérification authentifiée, en conservant la référence de session", async () => {
    const { processPaymentWebhook } = await load();
    const { body, headers } = webhook("transaction.success", { id: TRX_ID, type: "PAIEMENT", status: "SUCCESS", amount: "10000.00" });
    const res = await processPaymentWebhook("saspay", body, headers);
    expect(res.status).toBe(200);
    expect(state.fetches).toHaveLength(1);
    expect(state.fetches[0]!.url).toBe(`https://sandbox-api.saspay.me/api/v1/payments/${TRX_ID}/verify/`);
    expect((state.fetches[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_abc");
    // référence null → le paiement est retrouvé par JL:<uuid> et garde l'id de session enregistré
    expect(state.rpc).toEqual([{ fn: "srv_confirm_payment", args: { p_payment_id: PAYMENT_ID, p_reference: null, p_fee: 150 } }]);

    const replay = await processPaymentWebhook("saspay", body, headersFor(body, SECRET));
    expect(replay.body).toMatchObject({ duplicate: true });
    expect(state.rpc).toHaveLength(1);
  });

  it("accepte l'enveloppe { success, data } et compte 0 F de frais en mode ADD_ON", async () => {
    state.verify = { success: true, code: 200, data: { ...state.verify, net_amount: "10000.00" } };
    const { processPaymentWebhook } = await load();
    const { body, headers } = webhook("transaction.success", { id: TRX_ID, type: "PAIEMENT", status: "SUCCESS" });
    await processPaymentWebhook("saspay", body, headers);
    expect(state.rpc[0]?.args).toMatchObject({ p_fee: 0 });
  });

  it("ne confirme pas si l'API ne confirme pas le succès", async () => {
    state.verify = { ...state.verify, status: "PENDING" };
    const { processPaymentWebhook } = await load();
    const { body, headers } = webhook("transaction.success", { id: TRX_ID, type: "PAIEMENT", status: "SUCCESS" });
    const res = await processPaymentWebhook("saspay", body, headers);
    expect(res.body).toMatchObject({ ignored: expect.stringContaining("PENDING") });
    expect(state.rpc).toHaveLength(0);
  });

  it("ignore les transactions qui ne viennent pas de JOBLINK", async () => {
    state.verify = { ...state.verify, description: "Abonnement autre SaaS" };
    const { processPaymentWebhook } = await load();
    const { body, headers } = webhook("transaction.success", { id: TRX_ID, type: "PAIEMENT", status: "SUCCESS" });
    const res = await processPaymentWebhook("saspay", body, headers);
    expect(res.body).toMatchObject({ ignored: "transaction hors JOBLINK" });
    expect(state.rpc).toHaveLength(0);
  });

  it("n'échoue pas le paiement sur une tentative ratée (le client peut réessayer)", async () => {
    const { processPaymentWebhook } = await load();
    const { body, headers } = webhook("transaction.failed", { id: TRX_ID, type: "PAIEMENT", status: "FAILED" });
    const res = await processPaymentWebhook("saspay", body, headers);
    expect(res.status).toBe(200);
    expect(state.rpc).toHaveLength(0);
    expect(state.fetches).toHaveLength(0);
  });

  it("ignore les retraits et l'événement de test", async () => {
    const { processPaymentWebhook } = await load();
    const payout = webhook("transaction.success", { id: TRX_ID, type: "RETRAIT", status: "SUCCESS" });
    expect((await processPaymentWebhook("saspay", payout.body, payout.headers)).body).toMatchObject({ ignored: "type RETRAIT" });
    const test = webhook("webhook.test", {});
    expect((await processPaymentWebhook("saspay", test.body, test.headers)).status).toBe(200);
    expect(state.rpc).toHaveLength(0);
  });

  it("rejette une mauvaise signature ou un horodatage trop ancien (401)", async () => {
    const { processPaymentWebhook } = await load();
    const bad = webhook("transaction.success", { id: TRX_ID }, "mauvais-secret");
    expect((await processPaymentWebhook("saspay", bad.body, bad.headers)).status).toBe(401);
    const old = webhook("transaction.success", { id: TRX_ID }, SECRET, Math.floor(Date.now() / 1000) - 600);
    expect((await processPaymentWebhook("saspay", old.body, old.headers)).status).toBe(401);
    expect(state.events.size).toBe(0);
    expect(state.fetches).toHaveLength(0);
  });
});

describe("configuration SasPay", () => {
  it("refuse une clé de test pointée vers l'hôte réel (et inversement)", async () => {
    vi.resetModules();
    vi.stubEnv("INTERNAL_RPC_KEY", "k");
    for (const [k, v] of Object.entries({ ...ENV, SASPAY_ENVIRONMENT: "live" })) vi.stubEnv(k, v);
    let reg = await import("@/lib/payments/registry");
    expect(reg.isPaymentConfigured()).toBe(false);

    vi.resetModules();
    vi.stubEnv("SASPAY_ENVIRONMENT", "sandbox");
    reg = await import("@/lib/payments/registry");
    expect(reg.isPaymentConfigured()).toBe(true);

    vi.resetModules();
    vi.stubEnv("SASPAY_SECRET_KEY", "sk_live_abc");
    reg = await import("@/lib/payments/registry");
    expect(reg.isPaymentConfigured()).toBe(false);
  });

  it("crée la session de checkout avec montant décimal, référence JL et retour client", async () => {
    vi.resetModules();
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
    state.verify = { success: true, data: { id: SESSION_ID, checkout_url: "https://pay.saspay.me/checkout/abc", status: "PENDING" } };
    const { saspayAdapter } = await import("@/lib/payments/adapters/saspay");
    const session = await saspayAdapter.createCheckout({
      paymentId: PAYMENT_ID,
      amount: 10000,
      description: "JOBLINK — Plomberie",
      customer: { firstName: "Awa", lastName: "Sossou", email: "awa@example.com", phone: "+22997505050" },
      callbackUrl: "https://joblink-benin.vercel.app/client/payments?payment=x",
    });
    expect(session).toEqual({ reference: SESSION_ID, checkoutUrl: "https://pay.saspay.me/checkout/abc" });
    const sent = JSON.parse(String(state.fetches[0]!.init.body));
    expect(state.fetches[0]!.url).toBe("https://sandbox-api.saspay.me/api/v1/checkout-sessions/");
    expect(sent).toMatchObject({
      amount: "10000.00",
      currency: "XOF",
      country: "BJ",
      customer_name: "Awa Sossou",
      customer_phone: "+2290197505050",
      return_url: "https://joblink-benin.vercel.app/client/payments?payment=x",
      metadata: { payment_id: PAYMENT_ID, source: "joblink" },
    });
    expect(sent.description).toContain(`JL:${PAYMENT_ID}`);
  });
});
