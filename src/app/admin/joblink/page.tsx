import { OwnerLogin } from "@/components/owner/owner-login";
import { OwnerDashboard, type OwnerHealth, type OwnerTab } from "@/components/owner/owner-dashboard";
import { ownerApi, ownerPanelConfigured, ownerSession, OWNER_PAGE_SIZES, type OwnerPaymentFilter, type OwnerVerification } from "@/lib/owner-panel/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getAuthProviders } from "@/lib/auth/providers";
import { isPaymentConfigured } from "@/lib/payments/registry";
import { isProduction, serverEnv } from "@/lib/env.server";

const TABS: OwnerTab[] = ["overview", "users", "jobs", "payments", "cases", "moderation", "incidents", "site", "security"];
const PAYMENT_FILTERS: OwnerPaymentFilter[] = ["", "pending", "payout", "succeeded", "failed", "refunded"];
const JOB_STATUSES = ["", "open", "active", "completed", "disputed", "cancelled", "draft", "hidden"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const { users: USERS_PAGE, jobs: JOBS_PAGE, payments: PAYMENTS_PAGE } = OWNER_PAGE_SIZES;

type SearchParams = Promise<{ tab?: string; q?: string; page?: string; status?: string; filter?: string; user?: string; all?: string }>;

/** Liens temporaires (15 min) vers les pièces d'identité, si la clé serveur Supabase est configurée. */
async function documentLinks(items: OwnerVerification[]): Promise<Record<string, string>> {
  if (!items.length || !serverEnv.serviceRoleKey) return {};
  try {
    const { data } = await getSupabaseAdminClient().storage.from("verifications").createSignedUrls(items.map((v) => v.document_path), 900);
    return Object.fromEntries((data ?? []).flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as const] : [])));
  } catch {
    return {};
  }
}

export default async function OwnerPanelPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await ownerSession();
  if (!session) return <OwnerLogin available={ownerPanelConfigured()} />;

  const sp = await searchParams;
  const tab = (TABS as string[]).includes(sp.tab ?? "") ? (sp.tab as OwnerTab) : "overview";
  const q = (sp.q ?? "").slice(0, 100);
  const page = Math.min(1000, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const jobStatus = JOB_STATUSES.includes(sp.status ?? "") ? (sp.status ?? "") : "";
  const paymentFilter = (PAYMENT_FILTERS as string[]).includes(sp.filter ?? "") ? (sp.filter as OwnerPaymentFilter) : "";
  const userId = sp.user && UUID.test(sp.user) ? sp.user : null;
  const showAllDisputes = sp.all === "1";

  const [data, users, userDetail, jobs, payments, disputes, verifications, providers, incidents, announcement] = await Promise.all([
    ownerApi.overview(),
    tab === "users" ? ownerApi.users(q, USERS_PAGE, (page - 1) * USERS_PAGE) : Promise.resolve(undefined),
    tab === "users" && userId ? ownerApi.userDetail(userId).catch(() => null) : Promise.resolve(null),
    tab === "jobs" ? ownerApi.jobs(q, jobStatus, JOBS_PAGE, (page - 1) * JOBS_PAGE) : Promise.resolve(null),
    tab === "payments" ? ownerApi.payments(paymentFilter, PAYMENTS_PAGE, (page - 1) * PAYMENTS_PAGE) : Promise.resolve(null),
    tab === "cases" ? ownerApi.disputes(showAllDisputes).catch(() => null) : Promise.resolve(null),
    tab === "cases" ? ownerApi.verifications().catch(() => null) : Promise.resolve(null),
    getAuthProviders(),
    ownerApi.incidents().catch(() => null),
    tab === "site" ? ownerApi.announcement().catch(() => null) : Promise.resolve(null),
  ]);
  const docs = verifications ? await documentLinks(verifications) : {};

  // État de mise en service (aucune valeur secrète n'est transmise au navigateur, seulement des statuts)
  const health: OwnerHealth = {
    payments: !isPaymentConfigured()
      ? "off"
      : serverEnv.paymentProvider === "fedapay"
        ? serverEnv.fedapayEnvironment === "live" ? "live" : "fedapay_test"
        : "sandbox",
    google: providers.google,
    emailConfirm: providers.emailConfirm,
    production: isProduction(),
  };
  return (
    <OwnerDashboard
      tab={tab}
      data={data}
      users={users}
      q={q}
      page={page}
      health={health}
      incidents={incidents}
      announcement={announcement}
      userDetail={userDetail}
      userRequested={Boolean(userId)}
      jobs={jobs}
      jobStatus={jobStatus}
      payments={payments}
      paymentFilter={paymentFilter}
      disputes={disputes}
      showAllDisputes={showAllDisputes}
      verifications={verifications}
      documentLinks={docs}
    />
  );
}
