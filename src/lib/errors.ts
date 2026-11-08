/** Traduction des codes d'erreur métier renvoyés par PostgreSQL en messages compréhensibles. */
const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Vous devez être connecté pour effectuer cette action.",
  ACCOUNT_SUSPENDED: "Votre compte est suspendu. Contactez le support.",
  WORKER_ROLE_REQUIRED: "Cette action est réservée aux comptes travailleurs.",
  ADMIN_REQUIRED: "Action réservée aux administrateurs.",
  JOB_NOT_FOUND: "Mission introuvable ou accès refusé.",
  JOB_NOT_OPEN: "Cette mission n'accepte plus de candidatures.",
  JOB_EXPIRED: "La date limite de cette mission est dépassée.",
  JOB_FULL: "Le nombre de travailleurs recherchés est déjà atteint.",
  CANNOT_APPLY_OWN_JOB: "Vous ne pouvez pas candidater à votre propre mission.",
  ALREADY_APPLIED: "Vous avez déjà candidaté à cette mission.",
  PRICE_PROPOSAL_NOT_ALLOWED: "Le client n'accepte pas de proposition de prix pour cette mission.",
  APPLICATION_NOT_FOUND: "Candidature introuvable ou accès refusé.",
  CONTRACT_NOT_FOUND: "Mission attribuée introuvable ou accès refusé.",
  INVALID_TRANSITION: "Cette action n'est pas possible dans l'état actuel de la mission.",
  INVALID_PROOF_PATH: "Fichier de preuve invalide.",
  CANCEL_NOT_ALLOWED: "Une mission démarrée ne peut plus être annulée. Ouvrez un litige si nécessaire.",
  LOCATION_REQUIRED: "Indiquez la localisation de la mission sur la carte.",
  PAYMENT_NOT_ALLOWED: "Le paiement n'est possible qu'après validation du travail.",
  ALREADY_PAID: "Cette mission a déjà été payée.",
  ALREADY_PAID_OUT: "Le prestataire a déjà été payé pour cette mission.",
  PAYMENT_NOT_FOUND: "Paiement introuvable.",
  INVALID_IDEMPOTENCY_KEY: "Requête de paiement invalide.",
  REVIEW_NOT_ALLOWED: "Vous pourrez laisser un avis une fois la mission terminée.",
  ALREADY_REVIEWED: "Vous avez déjà laissé un avis pour cette mission.",
  INVALID_RATING: "La note doit être comprise entre 1 et 5.",
  CONVERSATION_NOT_ALLOWED: "Vous ne pouvez écrire qu'aux personnes liées à vos missions.",
  BLOCKED: "Vous ne pouvez pas interagir avec cet utilisateur.",
  CONTACT_NOT_ALLOWED: "Coordonnées visibles uniquement entre parties d'une mission.",
  CANNOT_SUSPEND_SELF: "Vous ne pouvez pas suspendre votre propre compte.",
  INVALID_COORDINATES: "Coordonnées géographiques invalides.",
  RATE_LIMITED: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function translateError(raw: unknown): string {
  const text =
    typeof raw === "string" ? raw : raw && typeof raw === "object" && "message" in raw ? String((raw as { message: unknown }).message) : "";
  for (const code of Object.keys(MESSAGES)) {
    if (text.includes(code)) return MESSAGES[code]!;
  }
  if (/duplicate key|unique/i.test(text)) return "Cet élément existe déjà.";
  if (/row-level security|permission denied/i.test(text)) return "Accès refusé.";
  if (/fetch failed|network|ECONN/i.test(text)) return "Problème de connexion. Vérifiez votre réseau et réessayez.";
  return "Une erreur inattendue est survenue. Réessayez dans un instant.";
}

export function fail(error: unknown): { ok: false; error: string } {
  if (process.env.NODE_ENV !== "production") console.error("[action]", error);
  return { ok: false, error: translateError(error) };
}
