import { OwnerLogin } from "@/components/owner/owner-login";
import { OwnerDashboard, type OwnerHealth, type OwnerTab } from "@/components/owner/owner-dashboard";
import { ownerApi, ownerPanelConfigured, ownerSession } from "@/lib/owner-panel/server";
import { getAuthProviders } from "@/lib/auth/providers";
import { isPaymentConfigured } from "@/lib/payments/registry";
import { isProduction, serverEnv } from "@/lib/env.server";

const TABS: OwnerTab[] = ["overview", "users", "jobs", "moderation", "incidents", "site", "security"];

type SearchParams = Promise<{ tab?: string; q?: string }>;

export default async function OwnerPanelPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await ownerSession();
  if (!session) return <OwnerLogin available={ownerPanelConfigured()} />;

  const sp = await searchParams;
  const tab = (TABS as string[]).includes(sp.tab ?? "") ? (sp.tab as OwnerTab) : "overview";
  const q = (sp.q ?? "").slice(0, 100);

  const [data, users, providers, incidents, announcement] = await Promise.all([
    ownerApi.overview(),
    tab === "users" ? ownerApi.users(q, 100, 0) : Promise.resolve(undefined),
    getAuthProviders(),
    ownerApi.incidents().catch(() => null),
    tab === "site" ? ownerApi.announcement().catch(() => null) : Promise.resolve(null),
  ]);

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
  return <OwnerDashboard tab={tab} data={data} users={users} q={q} health={health} incidents={incidents} announcement={announcement} />;
}
