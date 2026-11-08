import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireUser } from "@/lib/auth/session";

// Espaces privés : toujours rendus à la requête (jamais mis en cache ni pré-rendus)
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

/** Pages communes (messages, notifications) affichées dans l'espace du rôle principal. */
export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <DashboardShell user={user} role={user.primaryRole ?? "client"}>{children}</DashboardShell>;
}
