import Link from "next/link";
import { Briefcase, CheckCircle2, Clock, CreditCard, Inbox, Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { EventTimeline } from "@/components/jobs/event-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatXOF } from "@/lib/utils/format";
import type { ContractEvent } from "@/types/db";

export const metadata = { title: "Tableau de bord client" };

export default async function ClientDashboard() {
  const user = await requireRole("client");
  const supabase = await getSupabaseServerClient();
  const [{ data: stats }, { data: myJobs }] = await Promise.all([
    supabase.rpc("client_dashboard_stats"),
    supabase.from("jobs").select("id, title").eq("client_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);
  const s = (stats ?? {}) as Record<string, number>;
  const ids = (myJobs ?? []).map((j) => j.id as string);
  const titles = new Map((myJobs ?? []).map((j) => [j.id as string, j.title as string]));
  const { data: events } = ids.length
    ? await supabase.from("contract_events").select("*").in("job_id", ids).order("created_at", { ascending: false }).limit(8)
    : { data: [] };

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.profile?.first_name ?? ""}`}
        description="Suivez vos missions, candidatures et paiements."
        actions={<Button asChild><Link href="/client/jobs/new"><Plus /> Publier une mission</Link></Button>}
      />
      {(s.to_validate ?? 0) > 0 && (
        <Alert variant="warning" className="mb-4" title={`${s.to_validate} travail à valider`}>
          Un travailleur a déclaré une mission terminée. <Link href="/client/jobs?status=active" className="font-medium underline">Vérifier</Link>
        </Alert>
      )}
      {(s.to_pay ?? 0) > 0 && (
        <Alert variant="info" className="mb-4" title={`${s.to_pay} paiement en attente`}>
          <Link href="/client/payments" className="font-medium underline">Régler maintenant</Link>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Missions publiées" value={s.published ?? 0} icon={Briefcase} href="/client/jobs" />
        <StatCard label="En cours" value={s.in_progress ?? 0} icon={Clock} href="/client/jobs?status=active" />
        <StatCard label="Terminées" value={s.completed ?? 0} icon={CheckCircle2} href="/client/jobs?status=completed" />
        <StatCard label="Candidatures reçues" value={s.applications ?? 0} hint={`${s.pending_applications ?? 0} en attente`} icon={Inbox} href="/client/applications" />
        <StatCard label="Dépenses" value={formatXOF(s.spent ?? 0)} icon={Wallet} href="/client/payments" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Dernières activités</CardTitle></CardHeader>
          <CardContent>
            {(events ?? []).length ? (
              <ul className="grid gap-3">
                {((events ?? []) as ContractEvent[]).map((e) => (
                  <li key={e.id} className="text-sm">
                    <Link href={`/client/jobs/${e.job_id}`} className="font-medium hover:text-primary">{titles.get(e.job_id)}</Link>
                    <div className="mt-1"><EventTimeline events={[e]} /></div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Briefcase} title="Aucune activité" description="Publiez votre première mission pour recevoir des candidatures." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bien démarrer</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Link href="/client/jobs/new" className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted"><Plus className="size-4 text-primary" /> Publier une mission détaillée avec photos</Link>
            <Link href="/client/profile" className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted"><CheckCircle2 className="size-4 text-primary" /> Compléter mon profil</Link>
            <Link href="/client/payments" className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted"><CreditCard className="size-4 text-primary" /> Comprendre les paiements</Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
