import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/session";

// Espaces privés : toujours rendus à la requête (jamais mis en cache ni pré-rendus)
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("client", "/client/dashboard");
  return <DashboardShell user={user} role="client">{children}</DashboardShell>;
}
