import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/session";

// Espaces privés : toujours rendus à la requête (jamais mis en cache ni pré-rendus)
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("worker", "/worker/dashboard");
  return <DashboardShell user={user} role="worker">{children}</DashboardShell>;
}
