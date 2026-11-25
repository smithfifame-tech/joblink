import "server-only";

export const serverEnv = {
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  appEnv: (process.env.APP_ENV ?? "development") as "development" | "staging" | "production",
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "sandbox") as "sandbox" | "fedapay" | "saspay" | "kkiapay",
  saspaySecretKey: process.env.SASPAY_SECRET_KEY ?? "",
  saspayWebhookSecret: process.env.SASPAY_WEBHOOK_SECRET ?? "",
  saspayEnvironment: (process.env.SASPAY_ENVIRONMENT === "live" ? "live" : "sandbox") as "sandbox" | "live",
  /** Versements automatiques aux travailleurs (exige l'IP du serveur whitelistée chez SasPay). */
  saspayPayoutsEnabled: process.env.SASPAY_PAYOUTS_ENABLED === "true",
  /** Relais de versements à IP fixe (voir relay/README.md). Vide : appel direct à SasPay. */
  saspayPayoutRelayUrl: (process.env.SASPAY_PAYOUT_RELAY_URL ?? "").replace(/\/+$/, ""),
  fedapaySecretKey: process.env.FEDAPAY_SECRET_KEY ?? "",
  fedapayWebhookSecret: process.env.FEDAPAY_WEBHOOK_SECRET ?? "",
  fedapayEnvironment: (process.env.FEDAPAY_ENVIRONMENT ?? "sandbox") as "sandbox" | "live",
  sandboxWebhookSecret: process.env.SANDBOX_WEBHOOK_SECRET ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "JOBLINK <no-reply@joblink.bj>",
  contactInbox: process.env.CONTACT_INBOX ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  ownerPanelServerKey: process.env.OWNER_PANEL_SERVER_KEY ?? "",
  internalRpcKey: process.env.INTERNAL_RPC_KEY ?? "",
};

export const isProduction = () => serverEnv.appEnv === "production";
