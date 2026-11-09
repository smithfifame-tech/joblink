import "server-only";

export const serverEnv = {
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  appEnv: (process.env.APP_ENV ?? "development") as "development" | "staging" | "production",
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "sandbox") as "sandbox" | "fedapay" | "kkiapay",
  fedapaySecretKey: process.env.FEDAPAY_SECRET_KEY ?? "",
  fedapayWebhookSecret: process.env.FEDAPAY_WEBHOOK_SECRET ?? "",
  fedapayEnvironment: (process.env.FEDAPAY_ENVIRONMENT ?? "sandbox") as "sandbox" | "live",
  sandboxWebhookSecret: process.env.SANDBOX_WEBHOOK_SECRET ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "JOBLINK <no-reply@joblink.bj>",
  contactInbox: process.env.CONTACT_INBOX ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  ownerPanelServerKey: process.env.OWNER_PANEL_SERVER_KEY ?? "",
};

export const isProduction = () => serverEnv.appEnv === "production";
