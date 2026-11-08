import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ContractStatusBadge } from "@/components/jobs/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatXOF } from "@/lib/utils/format";
import type { Contract } from "@/types/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Missions acceptées" };

export default async function WorkerContractsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireRole("worker");
  const { status } = await searchParams;
  const supabase = await getSupabaseServerClient();
  let q = supabase.from("contracts").select("*").eq("worker_id", user.id);
  q = status === "completed" ? q.eq("status", "completed") : status === "all" ? q : q.in("status", ["pending_acceptance", "in_progress", "submitted", "disputed"]);
  const { data } = await q.order("created_at", { ascending: false }).limit(200);
  const list = (data ?? []) as Contract[];
  const { data: jobs } = list.length ? await supabase.from("jobs").select("id, title, city, neighborhood, deadline").in("id", list.map((c) => c.job_id)) : { data: [] };
  const jobMap = new Map((jobs ?? []).map((j) => [j.id as string, j]));
  const tabs = [["", "En cours"], ["completed", "Terminées"], ["all", "Toutes"]];

  return (
    <>
      <PageHeader title="Missions acceptées" />
      <nav className="mb-4 flex gap-1" aria-label="Filtrer">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/worker/contracts${k ? `?status=${k}` : ""}`} className={cn("rounded-full border px-3 py-1.5 text-sm", (status ?? "") === k ? "border-primary bg-accent font-medium" : "text-muted-foreground hover:bg-muted")}>{l}</Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune mission ici" description="Les missions pour lesquelles vous êtes retenu apparaîtront ici." action={<Button asChild variant="outline"><Link href="/worker/jobs">Trouver une mission</Link></Button>} />
      ) : (
        <Card className="divide-y">
          {list.map((c) => {
            const j = jobMap.get(c.job_id);
            return (
              <Link key={c.id} href={`/worker/contracts/${c.id}`} className="flex flex-col gap-2 p-4 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{(j?.title as string) ?? "Mission"}</p>
                  <p className="text-xs text-muted-foreground">{j ? `${j.neighborhood}, ${j.city} · avant le ${formatDate(j.deadline as string)}` : ""}</p>
                </div>
                <div className="flex items-center gap-3"><span className="text-sm font-semibold tabular-nums">{formatXOF(c.agreed_amount)}</span><ContractStatusBadge status={c.status} /></div>
              </Link>
            );
          })}
        </Card>
      )}
    </>
  );
}
