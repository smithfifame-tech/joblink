import Link from "next/link";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination } from "@/components/dashboard/pagination";
import { MarkAllRead } from "@/components/messages/mark-all-read";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/format";
import type { Notification } from "@/types/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };
const PAGE = 30;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireUser("/notifications");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await getSupabaseServerClient();
  const { data, count } = await supabase.from("notifications").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const list = (data ?? []) as Notification[];
  const unread = list.filter((n) => !n.read_at).length;
  return (
    <>
      <PageHeader title="Notifications" actions={unread > 0 ? <MarkAllRead /> : undefined} />
      {list.length === 0 ? <EmptyState icon={Bell} title="Aucune notification" description="Candidatures, messages, paiements : vous serez prévenu ici." /> : (
        <Card className="divide-y">
          {list.map((n) => {
            const content = (
              <div className={cn("flex gap-3 p-4", !n.read_at && "bg-accent/40")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.read_at && "font-semibold")}>{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatRelative(n.created_at)}</p>
                </div>
              </div>
            );
            return n.link ? <Link key={n.id} href={n.link} className="block hover:bg-muted/50">{content}</Link> : <div key={n.id}>{content}</div>;
          })}
        </Card>
      )}
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} basePath="/notifications" />
    </>
  );
}
