import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Logo } from "./logo";
import { DashboardNav } from "./dashboard-nav";
import { MobileDashboardNav } from "./mobile-dashboard-nav";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { NAV, ROLE_LABEL } from "./nav-config";
import { Alert } from "@/components/ui/alert";
import { logoutAction } from "@/lib/actions/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { storagePublicUrl } from "@/lib/env";
import type { SessionUser } from "@/lib/auth/session";
import type { AppRole } from "@/types/db";

export async function DashboardShell({ user, role, children }: { user: SessionUser; role: AppRole; children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  const unread = count ?? 0;
  const items = NAV[role];
  const name = user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : user.email;
  const base = role === "admin" ? "/admin" : `/${role}`;

  return (
    <div className="min-h-dvh bg-muted/30 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-background lg:flex">
        <div className="px-5 py-5"><Logo /></div>
        <p className="px-6 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{ROLE_LABEL[role]}</p>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <Suspense><DashboardNav items={items} unread={unread} /></Suspense>
        </div>
        <form action={logoutAction} className="border-t p-3">
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <LogOut className="size-4" /> Déconnexion
          </button>
        </form>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <Suspense><MobileDashboardNav items={items} title={ROLE_LABEL[role]} unread={unread} /></Suspense>
            <span className="text-sm font-medium text-muted-foreground lg:hidden">{ROLE_LABEL[role]}</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell userId={user.id} initialUnread={unread} />
            <UserMenu
              name={name}
              email={user.email}
              avatar={storagePublicUrl("avatars", user.profile?.avatar_url)}
              profileHref={role === "admin" ? "/notifications" : `${base}/profile`}
              settingsHref={role === "admin" ? "/admin/settings" : `${base}/settings`}
            />
          </div>
        </header>
        <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {!user.emailConfirmed && (
            <Alert variant="warning" className="mb-6" title="Adresse e-mail non confirmée">
              Confirmez votre e-mail via le lien reçu pour publier ou candidater.
            </Alert>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
