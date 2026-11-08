import Link from "next/link";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ApplicationActions } from "@/components/jobs/application-actions";
import { ApplicationStatusBadge } from "@/components/jobs/status-badge";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative, formatXOF, truncate } from "@/lib/utils/format";
import type { Application, Job, PublicProfile } from "@/types/db";

export const metadata = { title: "Candidatures reçues" };

export default async function ClientApplicationsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const user = await requireRole("client");
  const { all } = await searchParams;
  const supabase = await getSupabaseServerClient();
  const { data: jobs } = await supabase.from("jobs").select("id, title, budget_amount, status").eq("client_id", user.id).limit(500);
  const jobMap = new Map(((jobs ?? []) as Pick<Job, "id" | "title" | "budget_amount" | "status">[]).map((j) => [j.id, j]));
  let q = supabase.from("applications").select("*").in("job_id", [...jobMap.keys()]).order("created_at", { ascending: false }).limit(100);
  if (!all) q = q.eq("status", "pending");
  const { data: apps } = jobMap.size ? await q : { data: [] };
  const list = (apps ?? []) as Application[];
  const { data: profiles } = list.length ? await supabase.from("public_profiles").select("*").in("id", [...new Set(list.map((a) => a.worker_id))]) : { data: [] };
  const people = new Map(((profiles ?? []) as PublicProfile[]).map((p) => [p.id, p]));

  return (
    <>
      <PageHeader
        title="Candidatures reçues"
        description={all ? "Toutes les candidatures" : "Candidatures en attente de votre décision"}
        actions={<Link href={all ? "/client/applications" : "/client/applications?all=1"} className="text-sm font-medium text-primary hover:underline">{all ? "Voir seulement en attente" : "Voir tout l'historique"}</Link>}
      />
      {list.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucune candidature" description="Les nouvelles candidatures apparaîtront ici et vous serez notifié." />
      ) : (
        <Card className="divide-y">
          {list.map((a) => {
            const j = jobMap.get(a.job_id);
            const w = people.get(a.worker_id);
            const open = j && ["published", "reviewing"].includes(j.status);
            return (
              <div key={a.id} className="grid gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm"><strong>{w ? `${w.first_name} ${w.last_initial}` : "Candidat"}</strong> pour <Link href={`/client/jobs/${a.job_id}`} className="font-medium text-primary hover:underline">{j?.title}</Link></p>
                  <div className="flex items-center gap-2"><ApplicationStatusBadge status={a.status} /><span className="text-sm font-semibold tabular-nums">{formatXOF(a.proposed_amount ?? j?.budget_amount)}</span></div>
                </div>
                <p className="text-sm text-muted-foreground">{truncate(a.cover_letter, 220)}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{formatRelative(a.created_at)}</span>
                  {a.status === "pending" && open && <ApplicationActions applicationId={a.id} workerName={w?.first_name ?? "ce candidat"} amount={formatXOF(a.proposed_amount ?? j?.budget_amount)} />}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
