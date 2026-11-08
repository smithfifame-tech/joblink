/** Taux de commission JOBLINK par défaut (la valeur de référence est platform_settings.payments.commission_rate). */
export const DEFAULT_COMMISSION_RATE = 0.05;

export interface PaymentBreakdown {
  amount: number;
  commission: number;
  providerFee: number;
  net: number;
  rate: number;
}

/** Même règle que la fonction SQL compute_commission : montant × taux, arrondi au franc. */
export function computeCommission(amount: number, rate = DEFAULT_COMMISSION_RATE): number {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Montant invalide");
  if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) throw new Error("Taux invalide");
  return Math.round(amount * rate);
}

/** Montant net = montant − commission − frais externes affichés. */
export function computeBreakdown(amount: number, rate = DEFAULT_COMMISSION_RATE, providerFeeRate = 0): PaymentBreakdown {
  if (!Number.isInteger(amount)) throw new Error("Les montants XOF sont entiers");
  const commission = computeCommission(amount, rate);
  const providerFee = computeCommission(amount, providerFeeRate);
  const net = amount - commission - providerFee;
  if (net < 0) throw new Error("Montant net négatif");
  return { amount, commission, providerFee, net, rate };
}
