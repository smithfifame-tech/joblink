import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Chaîne complète webhook → vérification de signature → idempotence → rapprochement → confirm_payment.
 * Le client Supabase service_role est remplacé par un double en mémoire.
 */
const state = {
  events: new Set<string>(),
  payments: [{ id: "11111111-2222-4333-8444-555555555555", provider: "sandbox", provider_reference: "SBX-REF-1", status: "processing" }],
  rpc: [] as { fn: string; args: Record<string, unknown> }[],
};

function fakeDb() {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const api = {
        insert(row: { provider: string; event_id: string }) {
          return {
            select: () => ({
              maybeSingle: async () => {
                const k = `${row.provider}:${row.event_id}`;
                if (state.events.has(k)) return { data: null, error: { message: "duplicate key value violates unique constraint" } };
                state.events.add(k);
                return { data: { id: `evt-${state.events.size}` }, error: null };
              },
            }),
          };
        },
        update: () => ({ eq: async () => ({ error: null }) }),
        select: () => api,
        eq(col: string, val: unknown) {
          filters[col] = val;
          return api;
        },
        async maybeSingle() {
          if (table !== "payments") return { data: null };
          const p = state.payments.find((x) => Object.entries(filters).every(([k, v]) => (x as Record<string, unknown>)[k] === v));
          return { data: p ?? null };
        },
      };
      return api;
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      state.rpc.push({ fn, args });
      return { data: null, error: null };
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fakeDb(), getSupabaseServerClient: async () => fakeDb() }));

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
    expect(state.rpc).toEqual([{ fn: "confirm_payment", args: { p_payment_id: state.payments[0]!.id, p_provider_reference: "SBX-REF-1", p_provider_fee: 0 } }]);

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
    expect(state.rpc[0]?.fn).toBe("fail_payment");
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
    expect(state.rpc.at(-1)).toEqual({ fn: "confirm_payment", args: { p_payment_id: "99999999-2222-4333-8444-555555555555", p_provider_reference: "1234", p_provider_fee: 150 } });
    const bad = await processPaymentWebhook("fedapay", body, new Headers({ "x-fedapay-signature": "t=1,s=00" }));
    expect(bad.status).toBe(401);
  });
});
