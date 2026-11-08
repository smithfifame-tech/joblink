import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination } from "@/components/dashboard/pagination";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatXOF } from "@/lib/utils/format";
import type { Job, JobStatus } from "@/types/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mes missions" };

const FILTERS: { key: string; label: string; statuses: JobStatus[] | null }[] = [
  { key: "all", label: "Toutes", statuses: null },
  { key: "open", label: "Ouvertes", statuses: ["published", "reviewing"] },
  { key: "active", label: "En cours", statuses: ["assigned", "in_progress", "disputed"] },
  { key: "completed", label: "Terminées", statuses: ["completed"] },
  { key: "draft", label: "Brouillons", statuses: ["draft"] },
  { key: "cancelled", label: "Annulées", statuses: ["cancelled"] },
];
const PAGE = 15;

export default async function ClientJobsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const user = await requireRole("client");
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status) ?? FILTERS[0]!;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await getSupabaseServerClient();
  let q = supabase.from("jobs").select("*", { count: "exact" }).eq("client_id", user.id).is("deleted_at", null);
  if (filter.statuses) q = q.in("status", filter.statuses);
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const jobs = (data ?? []) as Job[];

  return (
    <>
      <PageHeader title="Mes missions" actions={<Button asChild><Link href="/client/jobs/new"><Plus /> Publier</Link></Button>} />
      <nav aria-label="Filtrer" className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/client/jobs${f.key === "all" ? "" : `?status=${f.key}`}`} className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-sm", f.key === filter.key ? "border-primary bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted")}>
            {f.label}
          </Link>
        ))}
      </nav>
      {jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="Aucune mission ici" action={<Button asChild><Link href="/client/jobs/new">Publier une mission</Link></Button>} />
      ) : (
        <Card className="divide-y">
          {jobs.map((j) => (
            <Link key={j.id} href={`/client/jobs/${j.id}`} className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">{j.title}</p>
                <p className="text-xs text-muted-foreground">{j.city} · créée le {formatDate(j.created_at)} · {j.applications_count} candidature{j.applications_count > 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">{formatXOF(j.budget_amount)}</span>
                <JobStatusBadge status={j.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} basePath="/client/jobs" params={{ status: sp.status }} />
    </>
  );
}
