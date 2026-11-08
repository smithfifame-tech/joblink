import "server-only";
import { isProduction, serverEnv } from "@/lib/env.server";
import { fedapayAdapter } from "./adapters/fedapay";
import { sandboxAdapter } from "./adapters/sandbox";
import type { PaymentAdapter, ProviderId } from "./types";

const ADAPTERS: Partial<Record<ProviderId, PaymentAdapter>> = {
  sandbox: sandboxAdapter,
  fedapay: fedapayAdapter,
  // kkiapay : ajouter un adaptateur implémentant PaymentAdapter, sans toucher au reste de l'application.
};

export function getAdapter(id: string): PaymentAdapter {
  const adapter = ADAPTERS[id as ProviderId];
  if (!adapter) throw new Error(`Prestataire de paiement inconnu : ${id}`);
  // Garde-fou : jamais de paiement simulé en production
  if (adapter.id === "sandbox" && isProduction()) {
    throw new Error("Le mode sandbox est interdit en production.");
  }
  return adapter;
}

export function getActiveAdapter(): PaymentAdapter {
  return getAdapter(serverEnv.paymentProvider);
}

export function isPaymentConfigured(): boolean {
  const p = serverEnv.paymentProvider;
  if (p === "sandbox") return !isProduction() && Boolean(serverEnv.sandboxWebhookSecret);
  if (p === "fedapay") return Boolean(serverEnv.fedapaySecretKey && serverEnv.fedapayWebhookSecret);
  return false;
}
