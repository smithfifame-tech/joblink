import { createHmac } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { createRelay, signRelayRequest } from "../../relay/server.mjs";

const KEY = "sk_live_testkey_0123456789";
const NOW = 1_790_000_000_000;
const PAYMENT = "aaaaaaaa-1111-4222-8333-444444444444";

function body(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    paymentId: PAYMENT,
    amount: "475.00",
    currency: "XOF",
    country: "BJ",
    method: "mtn_bj",
    recipient: { msisdn: "2290152803719" },
    ...over,
  });
}

async function call(handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>, method: string, path: string, raw = "", headers: Record<string, string> = {}) {
  const req = Object.assign(Readable.from(raw ? [raw] : []), { method, url: path, headers }) as unknown as IncomingMessage;
  let status = 0;
  let out = "";
  const res = {
    writeHead: (s: number) => {
      status = s;
    },
    end: (d: string) => {
      out = d;
    },
  } as unknown as ServerResponse;
  await handler(req, res);
  return { status, json: JSON.parse(out || "{}") };
}

function signed(method: string, path: string, raw: string, ts = Math.floor(NOW / 1000), key = KEY) {
  const s = signRelayRequest(key, method, path, raw, ts);
  return { "x-relay-timestamp": s.timestamp, "x-relay-signature": s.signature };
}

function setup() {
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    void url;
    void init;
    return new Response(JSON.stringify({ message: "Payout transaction initialized successfully", id: "a4b5c6d7-e8f9-4a0b-8c1d-2e3f4a5b6c7d" }), { status: 201 });
  });
  const handler = createRelay({ secretKey: KEY, environment: "live", fetchImpl: fetchImpl as unknown as typeof fetch, now: () => NOW });
  return { handler, fetchImpl };
}

describe("relais de versements", () => {
  it("transmet un versement signé à SasPay avec une clé d'idempotence par paiement", async () => {
    const { handler, fetchImpl } = setup();
    const raw = body();
    const r = await call(handler, "POST", "/v1/payouts", raw, signed("POST", "/v1/payouts", raw));
    expect(r.status).toBe(201);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.saspay.me/api/v1/payouts/initialize/");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(`joblink-payout-${PAYMENT}`);
    expect(JSON.parse(String(init.body))).toMatchObject({ amount: "475.00", method: "mtn_bj", recipient: { msisdn: "2290152803719" } });
  });

  it("refuse signature invalide, requête expirée et rejeu", async () => {
    const { handler, fetchImpl } = setup();
    const raw = body();
    expect((await call(handler, "POST", "/v1/payouts", raw, signed("POST", "/v1/payouts", raw, undefined, "sk_live_autre"))).json).toEqual({ error: "bad_signature" });
    expect((await call(handler, "POST", "/v1/payouts", raw, signed("POST", "/v1/payouts", raw, Math.floor(NOW / 1000) - 600))).json).toEqual({ error: "expired" });
    const h = signed("POST", "/v1/payouts", raw);
    expect((await call(handler, "POST", "/v1/payouts", raw, h)).status).toBe(201);
    expect((await call(handler, "POST", "/v1/payouts", raw, h)).json).toEqual({ error: "replayed" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("n'accepte que des montants et destinations autorisés", async () => {
    const { handler, fetchImpl } = setup();
    for (const [over, err] of [
      [{ amount: "100.00" }, "invalid_amount"],
      [{ amount: "900000.00" }, "invalid_amount"],
      [{ amount: "475.5" }, "invalid_amount"],
      [{ method: "orange_ci" }, "unsupported_destination"],
      [{ country: "TG" }, "unsupported_destination"],
      [{ recipient: { msisdn: "123" } }, "invalid_msisdn"],
      [{ paymentId: "x" }, "invalid_payment_id"],
    ] as const) {
      const raw = body(over);
      expect((await call(handler, "POST", "/v1/payouts", raw, signed("POST", "/v1/payouts", raw))).json).toEqual({ error: err });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuse une clé incohérente avec l'environnement", () => {
    expect(() => createRelay({ secretKey: "sk_test_x", environment: "live" })).toThrow();
  });

  it("la signature produite par JOBLINK correspond à celle attendue par le relais", () => {
    const raw = body();
    const ts = 1_790_000_000;
    // Même calcul que relayCall() dans src/lib/payments/adapters/saspay.ts
    const fromApp = createHmac("sha256", KEY).update(`${ts}.POST /v1/payouts\n${raw}`).digest("hex");
    expect(signRelayRequest(KEY, "POST", "/v1/payouts", raw, ts).signature).toBe(fromApp);
  });
});
