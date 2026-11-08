import Link from "next/link";
import { CheckCircle2, ClipboardList, FileText, Search, Star, UserRound, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { JobCard } from "@/components/jobs/job-card";
import { ContractStatusBadge } from "@/components/jobs/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { searchJobs } from "@/services/catalog";
import { formatXOF } from "@/lib/utils/format";
import type { Contract, WorkerProfile } from "@/types/db";

export const metadata = { title: "Tableau de bord travailleur" };

export default async function WorkerDashboard() {
  const user = await requireRole("worker");
  const supabase = await getSupabaseServerClient();
  const [{ data: stats }, { data: wp }, { data: cats }, { data: active }] = await Promise.all([
    supabase.rpc("worker_dashboard_stats"),
    supabase.from("worker_profiles").select("*").eq("user_id", user.id).maybeSingle<WorkerProfile>(),
    supabase.from("worker_categories").select("category_id, categories(slug)").eq("worker_id", user.id),
    supabase.from("contracts").select("*").eq("worker_id", user.id).in("status", ["pending_acceptance", "in_progress", "submitted"]).order("created_at", { ascending: false }),
  ]);
  const s = (stats ?? {}) as Record<string, number>;
  const firstCat = ((cats ?? []) as unknown as { categories: { slug: string } | null }[])[0]?.categories?.slug;
  const { rows: suggestions } = await searchJobs({ category: firstCat, city: firstCat ? undefined : user.profile?.city ?? undefined }, 4).catch(() => ({ rows: [] }));
  const contracts = (active ?? []) as Contract[];
  const { data: jobs } = contracts.length ? await supabase.from("jobs").select("id, title").in("id", contracts.map((c) => c.job_id)) : { data: [] };
  const titles = new Map((jobs ?? []).map((j) => [j.id as string, j.title as string]));
  const incomplete = !wp?.headline || !(cats ?? []).length;

  return (
    <>
      <PageHeader title={`Bonjour ${user.profile?.first_name ?? ""}`} description="Vos opportunités, missions et revenus." actions={<Button asChild><Link href="/worker/jobs"><Search /> Trouver une mission</Link></Button>} />
      {incomplete && (
        <Alert variant="info" className="mb-4" title="Complétez votre profil professionnel">
          Ajoutez un titre, vos catégories et vos tarifs pour être mieux recommandé. <Link href="/worker/profile" className="font-medium underline">Compléter</Link>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Candidatures" value={s.applications ?? 0} hint={`${s.pending_applications ?? 0} en attente`} icon={FileText} href="/worker/applications" />
        <StatCard label="Missions en cours" value={s.active_contracts ?? 0} icon={ClipboardList} href="/worker/contracts" />
        <StatCard label="Terminées" value={s.completed ?? 0} icon={CheckCircle2} href="/worker/contracts?status=completed" />
        <StatCard label="Revenus nets" value={formatXOF(s.earned ?? 0)} hint={`${formatXOF(s.pending_payout ?? 0)} à verser`} icon={Wallet} href="/worker/earnings" />
        <StatCard label="Note" value={s.rating_count ? `${Number(s.rating_avg).toFixed(1)} / 5` : "—"} hint={`${s.rating_count ?? 0} avis`} icon={Star} href="/worker/reviews" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Missions à suivre</CardTitle></CardHeader>
          <CardContent>
            {contracts.length === 0 ? <p className="text-sm text-muted-foreground">Aucune mission en cours.</p> : (
              <ul className="divide-y">
                {contracts.map((c) => (
                  <li key={c.id}>
                    <Link href={`/worker/contracts/${c.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                      <span className="truncate text-sm font-medium">{titles.get(c.job_id)}</span>
                      <ContractStatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle>Suggestions pour vous</CardTitle><Link href="/worker/jobs" className="text-sm text-primary hover:underline">Tout voir</Link></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {suggestions.length ? suggestions.map((j) => <JobCard key={j.id} job={j} compact />) : <p className="text-sm text-muted-foreground sm:col-span-2">Aucune mission ouverte correspondant à votre profil pour l&apos;instant.</p>}
          </CardContent>
        </Card>
      </div>
      <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><UserRound className="size-4" /> Activez « Apparaître à proximité » dans votre profil pour être visible des clients du quartier.</p>
    </>
  );
}
