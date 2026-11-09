import Link from "next/link";
import { AlertTriangle, Banknote, Briefcase, CheckCircle2, Clock, Flag, Percent, Scale, ShieldCheck, UserRound, Users, Wrench } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ContactHandledButton } from "@/components/admin/admin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isPaymentConfigured } from "@/lib/payments/registry";
import { serverEnv } from "@/lib/env.server";
import { formatRelative, formatXOF } from "@/lib/utils/format";

export const metadata = { title: "Administration" };

export default async function AdminOverview() {
  await requireRole("admin");
  const supabase = await getSupabaseServerClient();
  const [{ data: stats }, { data: contacts }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.from("contact_messages").select("*").eq("status", "new").order("created_at", { ascending: false }).limit(5),
  ]);
  const s = (stats ?? {}) as Record<string, number>;
  return (
    <>
      <PageHeader title="Vue générale" description="Activité de la plateforme en temps réel." />
      {!isPaymentConfigured() && (
        <Alert variant="warning" className="mb-4" title="Paiements non configurés">
          Fournisseur actuel : {serverEnv.paymentProvider}. Renseignez les clés du prestataire (voir docs/PAYMENTS.md).
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Utilisateurs" value={s.users ?? 0} icon={Users} href="/admin/users" />
        <StatCard label="Clients" value={s.clients ?? 0} icon={UserRound} href="/admin/users?role=client" />
        <StatCard label="Travailleurs" value={s.workers ?? 0} icon={Wrench} href="/admin/workers" />
        <StatCard label="Missions publiées" value={s.jobs_published ?? 0} icon={Briefcase} href="/admin/jobs?status=open" />
        <StatCard label="Missions en cours" value={s.jobs_in_progress ?? 0} icon={Clock} href="/admin/jobs?status=active" />
        <StatCard label="Missions terminées" value={s.jobs_completed ?? 0} icon={CheckCircle2} href="/admin/jobs?status=completed" />
        <StatCard label="Volume des transactions" value={formatXOF(s.volume ?? 0)} icon={Banknote} href="/admin/transactions" />
        <StatCard label="Revenus de commissions" value={formatXOF(s.commissions ?? 0)} icon={Percent} href="/admin/commissions" />
        <StatCard label="Paiements en attente" value={s.payments_pending ?? 0} hint={`${s.payouts_pending ?? 0} versements à faire`} icon={Clock} href="/admin/transactions?status=pending" tone="warning" />
        <StatCard label="Signalements non traités" value={s.reports_open ?? 0} icon={Flag} href="/admin/reports" tone={(s.reports_open ?? 0) > 0 ? "warning" : "default"} />
        <StatCard label="Litiges ouverts" value={s.disputes_open ?? 0} icon={Scale} href="/admin/disputes" tone={(s.disputes_open ?? 0) > 0 ? "warning" : "default"} />
        <StatCard label="Vérifications en attente" value={s.verifications_pending ?? 0} icon={ShieldCheck} href="/admin/workers?tab=verifications" />
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4" /> Messages de contact non traités</CardTitle></CardHeader>
        <CardContent>
          {(contacts ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Aucun message en attente.</p> : (
            <ul className="divide-y">
              {(contacts ?? []).map((c) => (
                <li key={c.id as string} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.subject as string}</p>
                    <p className="text-xs text-muted-foreground">{c.name as string} · <a className="text-primary" href={`mailto:${c.email}`}>{c.email as string}</a> · {formatRelative(c.created_at as string)}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.message as string}</p>
                  </div>
                  <ContactHandledButton id={c.id as string} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">Toutes les actions sensibles sont enregistrées dans les <Link href="/admin/audit-logs" className="underline">journaux d&apos;activité</Link>.</p>
    </>
  );
}
