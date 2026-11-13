import Link from "next/link";
import { FileText, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmAction } from "@/components/dashboard/confirm-action";
import { ApplicationStatusBadge, JobStatusBadge } from "@/components/jobs/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { withdrawApplicationAction } from "@/lib/actions/applications";
import { formatRelative, formatXOF } from "@/lib/utils/format";
import type { Application, PublicJob } from "@/types/db";

export const metadata = { title: "Mes candidatures" };

export default async function WorkerApplicationsPage() {
  const user = await requireRole("worker");
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("applications").select("*").eq("worker_id", user.id).order("created_at", { ascending: false }).limit(200);
  const apps = (data ?? []) as Application[];
  const { data: jobs } = apps.length ? await supabase.from("public_jobs").select("*").in("id", apps.map((a) => a.job_id)) : { data: [] };
  const jobMap = new Map(((jobs ?? []) as PublicJob[]).map((j) => [j.id, j]));
  const { data: contracts } = apps.length ? await supabase.from("contracts").select("id, application_id").eq("worker_id", user.id) : { data: [] };
  const contractOf = new Map((contracts ?? []).map((c) => [c.application_id as string, c.id as string]));

  return (
    <>
      <PageHeader title="Mes candidatures" />
      {apps.length === 0 ? (
        <EmptyState icon={FileText} title="Aucune candidature" description="Parcourez les missions ouvertes et postulez en quelques secondes." action={<Button asChild><Link href="/worker/jobs">Voir les missions</Link></Button>} />
      ) : (
        <Card className="divide-y">
          {apps.map((a) => {
            const j = jobMap.get(a.job_id);
            const cid = contractOf.get(a.id);
            return (
              <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={cid ? `/worker/contracts/${cid}` : `/jobs/${a.job_id}`} className="font-medium hover:text-primary">{j?.title ?? "Mission indisponible"}</Link>
                  <p className="text-xs text-muted-foreground">{j ? `${j.city} · ` : ""}envoyée {formatRelative(a.created_at)} · {formatXOF(a.proposed_amount ?? j?.budget_amount)}</p>
                  {a.decision_note && a.status === "rejected" && <p className="mt-1 text-xs text-muted-foreground">« {a.decision_note} »</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {j && <JobStatusBadge status={j.status} />}
                  <ApplicationStatusBadge status={a.status} />
                  {cid && <Button asChild size="sm"><Link href={`/worker/contracts/${cid}`}>Ouvrir la mission</Link></Button>}
                  {a.status === "pending" && (
                    <ConfirmAction label="Retirer" icon={<Undo2 />} size="sm" variant="ghost" title="Retirer votre candidature ?" description="Vous ne pourrez plus candidater à cette mission." destructive action={() => withdrawApplicationAction(a.id)} />
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
