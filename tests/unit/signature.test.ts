import { describe, expect, it } from "vitest";
import { computeSignature, signPayload, verifySignature } from "@/lib/payments/signature";

const secret = "wh_test_secret";
const body = JSON.stringify({ name: "transaction.approved", entity: { id: 42 } });

describe("signature des webhooks (format FedaPay t=…,s=…)", () => {
  it("accepte une signature valide et récente", () => {
    const header = signPayload(body, secret);
    expect(verifySignature(body, header, secret)).toEqual({ valid: true });
  });

  it("calcule HMAC-SHA256 de « timestamp.corps »", () => {
    const header = signPayload(body, secret, 1700000000);
    expect(header).toBe(`t=1700000000,s=${computeSignature(`1700000000.${body}`, secret)}`);
  });

  it("rejette un corps modifié", () => {
    const header = signPayload(body, secret);
    expect(verifySignature(body.replace("42", "43"), header, secret)).toMatchObject({ valid: false, reason: "mismatch" });
  });

  it("rejette un mauvais secret, un en-tête absent ou mal formé", () => {
    expect(verifySignature(body, signPayload(body, "autre"), secret).valid).toBe(false);
    expect(verifySignature(body, null, secret)).toMatchObject({ valid: false, reason: "missing_header" });
    expect(verifySignature(body, "s=abc", secret)).toMatchObject({ valid: false, reason: "bad_timestamp" });
    expect(verifySignature(body, "t=123", secret)).toMatchObject({ valid: false, reason: "no_signature" });
    expect(verifySignature(body, signPayload(body, secret), "")).toMatchObject({ valid: false, reason: "missing_secret" });
  });

  it("rejette un webhook rejoué hors tolérance (5 minutes)", () => {
    const old = Math.floor(Date.now() / 1000) - 600;
    expect(verifySignature(body, signPayload(body, secret, old), secret)).toMatchObject({ valid: false, reason: "expired" });
  });

  it("accepte plusieurs signatures (rotation de secret)", () => {
    const t = Math.floor(Date.now() / 1000);
    const header = `t=${t},s=deadbeef,s=${computeSignature(`${t}.${body}`, secret)}`;
    expect(verifySignature(body, header, secret).valid).toBe(true);
  });
});
