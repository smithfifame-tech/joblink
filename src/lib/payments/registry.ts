import "server-only";
import { isProduction, serverEnv } from "@/lib/env.server";
import { fedapayAdapter } from "./adapters/fedapay";
import { sandboxAdapter } from "./adapters/sandbox";
import { saspayAdapter, saspayKeyMatchesEnv } from "./adapters/saspay";
import type { PaymentAdapter, ProviderId } from "./types";

const ADAPTERS: Partial<Record<ProviderId, PaymentAdapter>> = {
  sandbox: sandboxAdapter,
  fedapay: fedapayAdapter,
  saspay: saspayAdapter,
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
  // Les webhooks passent par l'API serveur interne : sans elle, aucun paiement ne pourrait être confirmé.
  if (!serverEnv.internalRpcKey) return false;
  const p = serverEnv.paymentProvider;
  if (p === "sandbox") return !isProduction() && Boolean(serverEnv.sandboxWebhookSecret);
  if (p === "fedapay") return Boolean(serverEnv.fedapaySecretKey && serverEnv.fedapayWebhookSecret);
  // Clé sk_test_ ↔ bac à sable, sk_live_ ↔ réel : SasPay débite pour de vrai toute requête envoyée à l'hôte live.
  if (p === "saspay") return saspayKeyMatchesEnv() && Boolean(serverEnv.saspayWebhookSecret);
  return false;
}
