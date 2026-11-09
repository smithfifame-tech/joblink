import { OwnerLogin } from "@/components/owner/owner-login";
import { OwnerDashboard, type OwnerTab } from "@/components/owner/owner-dashboard";
import { ownerApi, ownerPanelConfigured, ownerSession } from "@/lib/owner-panel/server";

const TABS: OwnerTab[] = ["overview", "users", "jobs", "moderation", "security"];

type SearchParams = Promise<{ tab?: string; q?: string }>;

export default async function OwnerPanelPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await ownerSession();
  if (!session) return <OwnerLogin available={ownerPanelConfigured()} />;

  const sp = await searchParams;
  const tab = (TABS as string[]).includes(sp.tab ?? "") ? (sp.tab as OwnerTab) : "overview";
  const q = (sp.q ?? "").slice(0, 100);

  const [data, users] = await Promise.all([
    ownerApi.overview(),
    tab === "users" ? ownerApi.users(q, 100, 0) : Promise.resolve(undefined),
  ]);
  return <OwnerDashboard tab={tab} data={data} users={users} q={q} />;
}
