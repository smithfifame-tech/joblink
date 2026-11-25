import { describe, expect, it } from "vitest";
import { signTimestampedPayload, verifyTimestampedSignature } from "@/lib/payments/signature";
import {
  beninNetworkFor,
  countryFromPhone,
  extractJoblinkPaymentId,
  normalizeBeninPhone,
  toDecimalString,
} from "@/lib/payments/adapters/saspay";

describe("signature des webhooks SasPay", () => {
  const body = '{"event":"transaction.success","data":{"id":"x"}}';
  const now = 1_790_000_000;

  it("accepte une signature valide et récente", () => {
    const h = signTimestampedPayload(body, "secret", now);
    expect(verifyTimestampedSignature(body, h.signature, h.timestamp, "secret", { now })).toEqual({ valid: true });
  });

  it("rejette corps modifié, mauvais secret, en-têtes absents et horodatage hors tolérance", () => {
    const h = signTimestampedPayload(body, "secret", now);
    expect(verifyTimestampedSignature(body + " ", h.signature, h.timestamp, "secret", { now })).toEqual({ valid: false, reason: "mismatch" });
    expect(verifyTimestampedSignature(body, h.signature, h.timestamp, "autre", { now })).toEqual({ valid: false, reason: "mismatch" });
    expect(verifyTimestampedSignature(body, null, h.timestamp, "secret", { now })).toEqual({ valid: false, reason: "missing_header" });
    expect(verifyTimestampedSignature(body, h.signature, "abc", "secret", { now })).toEqual({ valid: false, reason: "bad_timestamp" });
    expect(verifyTimestampedSignature(body, h.signature, h.timestamp, "secret", { now: now + 301 })).toEqual({ valid: false, reason: "expired" });
    expect(verifyTimestampedSignature(body, h.signature, h.timestamp, "", { now })).toEqual({ valid: false, reason: "missing_secret" });
  });
});

describe("utilitaires SasPay", () => {
  it("formate les montants en chaînes décimales", () => {
    expect(toDecimalString(10000)).toBe("10000.00");
    expect(() => toDecimalString(10.5)).toThrow();
  });

  it("retrouve la référence JOBLINK dans la description", () => {
    expect(extractJoblinkPaymentId("JOBLINK — Ménage · Réf. JL:AAAAAAAA-1111-4222-8333-444444444444")).toBe("aaaaaaaa-1111-4222-8333-444444444444");
    expect(extractJoblinkPaymentId("Facture #1042")).toBeUndefined();
    expect(extractJoblinkPaymentId(undefined)).toBeUndefined();
  });

  it("normalise les anciens numéros béninois à 8 chiffres", () => {
    expect(normalizeBeninPhone("+22997505050")).toBe("+2290197505050");
    expect(normalizeBeninPhone("+2290197505050")).toBe("+2290197505050");
    expect(normalizeBeninPhone("+22890123456")).toBe("+22890123456");
  });

  it("déduit le pays de l'indicatif", () => {
    expect(countryFromPhone("+2290197505050")).toBe("BJ");
    expect(countryFromPhone("+22890123456")).toBe("TG");
    expect(countryFromPhone(null)).toBe("BJ");
  });

  it("identifie l'opérateur béninois sans jamais deviner un préfixe incertain", () => {
    expect(beninNetworkFor("+2290197505050")).toBe("mtn_bj");
    expect(beninNetworkFor("+22966123456")).toBe("mtn_bj");
    expect(beninNetworkFor("+2290165123456")).toBe("moov_bj");
    expect(beninNetworkFor("+2290144123456")).toBe("celtiis_bj");
    expect(beninNetworkFor("+2290155123456")).toBeNull();
    expect(beninNetworkFor("+22890123456")).toBeNull();
  });
});
