import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/session";

// Espaces privés : toujours rendus à la requête (jamais mis en cache ni pré-rendus)
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

/** Accès strictement réservé au rôle admin (vérifié en base, jamais côté navigateur). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin", "/admin");
  return <DashboardShell user={user} role="admin">{children}</DashboardShell>;
}
