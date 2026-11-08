import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsPanel } from "@/components/forms/settings-panel";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Paramètres" };

export default async function WorkerSettingsPage() {
  const user = await requireRole("worker");
  if (!user.profile) return null;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Paramètres" />
      <SettingsPanel profile={user.profile} />
    </div>
  );
}
