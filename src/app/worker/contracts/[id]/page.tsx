import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin, Star } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ContractWorkerActions } from "@/components/jobs/contract-worker-actions";
import { ContactReveal } from "@/components/jobs/contact-reveal";
import { EventTimeline } from "@/components/jobs/event-timeline";
import { ReviewForm } from "@/components/jobs/review-form";
import { StartChatButton } from "@/components/jobs/start-chat-button";
import { ContractStatusBadge, PaymentStatusBadge } from "@/components/jobs/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCommissionRates } from "@/services/catalog";
import { computeBreakdown, formatRate } from "@/lib/payments/commission";
import { parsePoint } from "@/lib/maps/parse-point";
import { formatDate, formatXOF } from "@/lib/utils/format";
import type { Contract, ContractEvent, Job, Payment } from "@/types/db";

export const metadata = { title: "Mission" };

export default async function WorkerContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("worker");
  const supabase = await getSupabaseServerClient();
  const { data: contract } = await supabase.from("contracts").select("*").eq("id", id).eq("worker_id", user.id).maybeSingle<Contract>();
  if (!contract) notFound();
  const [{ data: job }, { data: client }, { data: events }, { data: payment }, { data: review }, rates] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", contract.job_id).maybeSingle<Job>(),
    supabase.from("public_profiles").select("first_name, last_initial").eq("id", contract.client_id).maybeSingle(),
    supabase.from("contract_events").select("*").eq("job_id", contract.job_id).order("created_at", { ascending: false }).limit(30),
    supabase.from("payments").select("*").eq("contract_id", contract.id).order("created_at", { ascending: false }).limit(1).maybeSingle<Payment>(),
    supabase.from("reviews").select("id").eq("contract_id", contract.id).eq("reviewer_id", user.id).maybeSingle(),
    getCommissionRates(),
  ]);
  if (!job) notFound();
  const b = computeBreakdown(contract.agreed_amount, rates.commission, rates.providerFee);
  const point = parsePoint(job.location);
  const clientName = client ? `${client.first_name} ${client.last_initial}` : "le client";

  return (
    <>
      <PageHeader title={job.title} description={`Pour ${clientName} · avant le ${formatDate(job.deadline)}`} actions={<><ContractStatusBadge status={contract.status} /><Button asChild variant="ghost"><Link href={`/jobs/${job.id}`}><ExternalLink /> Annonce</Link></Button></>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-6">
          {contract.status === "submitted" && <Alert variant="info">Travail envoyé : en attente de validation par le client.</Alert>}
          {contract.status === "disputed" && <Alert variant="error">Un litige est en cours. L&apos;équipe JOBLINK vous contactera.</Alert>}
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <StartChatButton otherUserId={contract.client_id} jobId={job.id} label="Écrire au client" />
                {contract.status !== "cancelled" && <ContactReveal userId={contract.client_id} />}
              </div>
              <ContractWorkerActions contractId={contract.id} status={contract.status} userId={user.id} />
              {contract.status === "completed" && !review && <ReviewForm contractId={contract.id} targetName={clientName} />}
              {contract.status === "completed" && review && <p className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="size-4 fill-amber-400 text-amber-400" /> Avis publié.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Détails de la mission</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="whitespace-pre-line leading-relaxed">{job.description}</p>
              {job.work_mode === "on_site" && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="flex items-center gap-1 font-medium"><MapPin className="size-4" /> Adresse (visible car vous êtes retenu)</p>
                  <p className="mt-1">{job.address || `${job.neighborhood}, ${job.city}`}</p>
                  {point && <a className="mt-1 inline-block text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=17/${point.lat}/${point.lng}`}>Ouvrir l&apos;itinéraire</a>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Rémunération</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between"><dt>Montant convenu</dt><dd className="font-medium tabular-nums">{formatXOF(b.amount)}</dd></div>
                <div className="flex justify-between text-muted-foreground"><dt>Commission ({formatRate(payment ? Number(payment.commission_rate) : rates.commission)})</dt><dd className="tabular-nums">− {formatXOF(payment?.commission_amount ?? b.commission)}</dd></div>
                <div className="flex justify-between text-muted-foreground"><dt>Frais de paiement</dt><dd className="tabular-nums">− {formatXOF(payment?.provider_fee_amount ?? b.providerFee)}</dd></div>
                <div className="flex justify-between border-t pt-2 font-semibold"><dt>Net</dt><dd className="text-primary-strong tabular-nums">{formatXOF(payment?.net_amount ?? b.net)}</dd></div>
              </dl>
              {payment && <p className="mt-3 flex items-center justify-between text-sm">Paiement <PaymentStatusBadge status={payment.status} /></p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Historique</CardTitle></CardHeader>
            <CardContent><EventTimeline events={(events ?? []) as ContractEvent[]} /></CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
