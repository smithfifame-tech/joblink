import { describe, expect, it } from "vitest";
import { computeBreakdown, computeCommission, DEFAULT_COMMISSION_RATE } from "@/lib/payments/commission";

describe("commission JOBLINK (5 %)", () => {
  it("applique l'exemple du cahier des charges : 10 000 → 500 de commission, 9 500 nets", () => {
    const b = computeBreakdown(10000);
    expect(DEFAULT_COMMISSION_RATE).toBe(0.05);
    expect(b.commission).toBe(500);
    expect(b.net).toBe(9500);
    expect(b.providerFee).toBe(0);
  });

  it("arrondit au franc CFA le plus proche (XOF sans décimales)", () => {
    expect(computeCommission(9999)).toBe(500); // 499,95
    expect(computeCommission(10010)).toBe(501); // 500,5
    expect(computeCommission(1)).toBe(0);
  });

  it("déduit les frais externes affichés du montant net", () => {
    const b = computeBreakdown(20000, 0.05, 0.015);
    expect(b).toEqual({ amount: 20000, commission: 1000, providerFee: 300, net: 18700, rate: 0.05 });
    expect(b.amount - b.commission - b.providerFee).toBe(b.net);
  });

  it("refuse les montants non entiers et les taux aberrants", () => {
    expect(() => computeBreakdown(100.5)).toThrow();
    expect(() => computeCommission(-1)).toThrow();
    expect(() => computeCommission(1000, 0.9)).toThrow();
  });
});
