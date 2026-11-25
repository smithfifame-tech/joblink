/** Contrat commun à tous les prestataires de paiement (Payment Adapter). */
export type ProviderId = "sandbox" | "fedapay" | "saspay" | "kkiapay";

export interface CheckoutRequest {
  paymentId: string;
  amount: number; // XOF, issu de la base
  description: string;
  customer: { firstName: string; lastName: string; email: string; phone: string | null };
  callbackUrl: string;
}

export interface CheckoutSession {
  reference: string;
  checkoutUrl: string;
}

/**
 * `reference` : référence de paiement chez le prestataire, comparée à celle enregistrée à la création.
 * `null` quand l'événement ne la porte pas (SasPay notifie la transaction, pas la session de checkout) :
 * le rapprochement se fait alors uniquement par `paymentId` et la référence déjà enregistrée est conservée.
 */
export type WebhookOutcome =
  | { kind: "succeeded"; eventId: string; reference: string | null; providerFee: number | null; paymentId?: string }
  | { kind: "failed"; eventId: string; reference: string | null; reason: string; paymentId?: string }
  | { kind: "ignored"; eventId: string; reason: string };

export interface PayoutRequest {
  paymentId: string;
  amount: number;
  recipient: { firstName: string; lastName: string; email: string; phone: string };
}

export interface PaymentAdapter {
  readonly id: ProviderId;
  readonly label: string;
  /** Moyens de paiement pris en charge (affichage). */
  readonly methods: string[];
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Vérifie la signature PUIS interprète l'événement. Lève une erreur si la signature est invalide. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome>;
  /** Vérifie l'état réel d'une transaction auprès du prestataire (anti-falsification du retour navigateur). */
  fetchStatus(reference: string): Promise<"approved" | "pending" | "declined" | "unknown">;
  createPayout?(req: PayoutRequest): Promise<{ reference: string; success: boolean }>;
}

export class WebhookSignatureError extends Error {
  constructor(reason: string) {
    super(`Signature de webhook invalide (${reason})`);
    this.name = "WebhookSignatureError";
  }
}
