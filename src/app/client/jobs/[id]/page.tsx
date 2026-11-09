import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ExternalLink, FileText, Pencil, Star, Users } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ApplicationActions } from "@/components/jobs/application-actions";
import { ContractClientActions } from "@/components/jobs/contract-client-actions";
import { CancelJobButton, DraftActions } from "@/components/jobs/cancel-job-button";
import { ContactReveal } from "@/components/jobs/contact-reveal";
import { EventTimeline } from "@/components/jobs/event-timeline";
import { PayButton } from "@/components/jobs/pay-button";
import { ReviewForm } from "@/components/jobs/review-form";
import { StartChatButton } from "@/components/jobs/start-chat-button";
import { ApplicationStatusBadge, ContractStatusBadge, JobStatusBadge, PaymentStatusBadge } from "@/components/jobs/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCommissionRates } from "@/services/catalog";
import { computeBreakdown } from "@/lib/payments/commission";
import { getActiveAdapter, isPaymentConfigured } from "@/lib/payments/registry";
import { publicEnv, storagePublicUrl } from "@/lib/env";
import { categoryPhoto } from "@/lib/media/category-photos";
import { JobHero } from "@/components/jobs/job-hero";
import { PublishedCelebration } from "@/components/jobs/published-celebration";
import { formatDate, formatRelative, formatXOF } from "@/lib/utils/format";
import type { Application, Contract, ContractEvent, Job, Payment, PublicProfile, Review } from "@/types/db";

export const metadata = { title: "Gérer la mission" };

export default async function ClientJobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ locked?: string; published?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireRole("client");
  const supabase = await getSupabaseServerClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).eq("client_id", user.id).maybeSingle<Job>();
  if (!job) notFound();

  const [{ data: apps }, { data: contracts }, { data: events }, { data: payments }, { data: reviews }, rates, { data: cat }, { data: firstImage }] = await Promise.all([
    supabase.from("applications").select("*").eq("job_id", id).order("created_at", { ascending: true }),
    supabase.from("contracts").select("*").eq("job_id", id).order("created_at"),
    supabase.from("contract_events").select("*").eq("job_id", id).order("created_at", { ascending: false }).limit(40),
    supabase.from("payments").select("*").eq("job_id", id),
    supabase.from("reviews").select("*").eq("job_id", id).eq("reviewer_id", user.id),
    getCommissionRates(),
    supabase.from("categories").select("name, slug, icon").eq("id", job.category_id).maybeSingle<{ name: string; slug: string; icon: string }>(),
    supabase.from("job_images").select("storage_path").eq("job_id", id).order("sort_order").limit(1).maybeSingle<{ storage_path: string }>(),
  ]);
  const applications = (apps ?? []) as Application[];
  const contractList = (contracts ?? []) as Contract[];
  const workerIds = [...new Set([...applications.map((a) => a.worker_id), ...contractList.map((c) => c.worker_id)])];
  const { data: profiles } = workerIds.length
    ? await supabase.from("public_profiles").select("*").in("id", workerIds)
    : { data: [] };
  const people = new Map(((profiles ?? []) as PublicProfile[]).map((p) => [p.id, p]));
  const paymentFor = (cid: string) => ((payments ?? []) as Payment[]).filter((p) => p.contract_id === cid).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const reviewed = new Set(((reviews ?? []) as Review[]).map((r) => r.contract_id));
  const paymentsOn = isPaymentConfigured();
  const methods = paymentsOn ? getActiveAdapter().methods : [];

  // Liens signés temporaires vers les preuves (bucket privé, lecture autorisée par RLS au client du contrat)
  const proofUrls = new Map<string, { name: string; url: string }[]>();
  for (const c of contractList) {
    if (!c.proof_paths.length) continue;
    const { data } = await supabase.storage.from("proofs").createSignedUrls(c.proof_paths, 3600);
    proofUrls.set(c.id, (data ?? []).flatMap((d) => (d.signedUrl ? [{ name: d.path?.split("/").pop() ?? "preuve", url: d.signedUrl }] : [])));
  }
  const editable = ["draft", "published", "reviewing"].includes(job.status);
  const pending = applications.filter((a) => a.status === "pending");

  return (
    <>
      {sp.published === "1" && job.status !== "draft" && (
        <PublishedCelebration jobId={job.id} title={job.title} url={`${publicEnv.siteUrl}/jobs/${job.id}`} />
      )}
      <JobHero
        className="mb-4"
        priority
        cover={(() => {
          const own = firstImage ? storagePublicUrl("job-images", firstImage.storage_path) : null;
          if (own) return { src: own, illustration: false };
          const p = categoryPhoto(cat?.slug, cat?.icon);
          return { src: p.src, illustration: true, alt: p.alt, credit: { author: p.author, url: p.authorUrl } };
        })()}
        categoryName={cat?.name}
        categoryIcon={cat?.icon}
        title={job.title}
        place={job.work_mode === "remote" ? "À distance" : `${job.neighborhood}, ${job.city}`}
        remote={job.work_mode === "remote"}
        startDate={job.start_date}
        deadline={job.deadline}
        workersNeeded={job.workers_needed}
        createdAt={job.published_at ?? job.created_at}
        aside={<JobStatusBadge status={job.status} />}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Budget <strong className="text-foreground tabular-nums">{formatXOF(job.budget_amount)}</strong> · {applications.length} candidature{applications.length > 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
            <JobStatusBadge status={job.status} />
            {job.status === "draft" && <DraftActions jobId={job.id} />}
            {editable && <Button asChild variant="outline"><Link href={`/client/jobs/${job.id}/edit`}><Pencil /> Modifier</Link></Button>}
            {job.status !== "draft" && <Button asChild variant="ghost"><Link href={`/jobs/${job.id}`}><ExternalLink /> Annonce</Link></Button>}
            {["draft", "published", "reviewing", "assigned"].includes(job.status) && <CancelJobButton jobId={job.id} />}
          </div>
      </div>
      {sp.locked && <Alert variant="info" className="mb-4">Cette mission est attribuée : elle ne peut plus être modifiée.</Alert>}
      {job.is_hidden && <Alert variant="error" className="mb-4" title="Mission masquée par la modération">{job.moderation_note}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-6">
          {contractList.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Travailleur{contractList.length > 1 ? "s" : ""} retenu{contractList.length > 1 ? "s" : ""}</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                {contractList.map((c) => {
                  const w = people.get(c.worker_id);
                  const pay = paymentFor(c.id);
                  const b = computeBreakdown(c.agreed_amount, rates.commission, rates.providerFee);
                  return (
                    <div key={c.id} className="grid gap-3 rounded-xl border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <PersonLine p={w} />
                        <div className="flex items-center gap-2"><ContractStatusBadge status={c.status} /><span className="text-sm font-semibold tabular-nums">{formatXOF(c.agreed_amount)}</span></div>
                      </div>
                      {c.status === "pending_acceptance" && <p className="text-sm text-muted-foreground">En attente de confirmation par le travailleur.</p>}
                      {c.completion_note && (
                        <div className="rounded-lg bg-muted p-3 text-sm">
                          <p className="font-medium">Compte rendu du travailleur</p>
                          <p className="mt-1 whitespace-pre-line text-muted-foreground">{c.completion_note}</p>
                          {(proofUrls.get(c.id) ?? []).length > 0 && (
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {(proofUrls.get(c.id) ?? []).map((p) => (
                                <li key={p.url}><a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><FileText className="size-3.5" /> {p.name}</a></li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <StartChatButton otherUserId={c.worker_id} jobId={job.id} />
                        {c.status !== "cancelled" && <ContactReveal userId={c.worker_id} />}
                        <ContractClientActions contractId={c.id} status={c.status} />
                      </div>
                      {c.status === "completed" && (
                        <div className="grid gap-3 border-t pt-3">
                          {pay?.status === "succeeded" ? (
                            <p className="flex flex-wrap items-center gap-2 text-sm">Paiement <PaymentStatusBadge status="succeeded" /> Reçu {pay.receipt_number} · <Link className="text-primary underline" href={`/client/payments/${pay.id}`}>voir le reçu</Link></p>
                          ) : paymentsOn ? (
                            <div className="flex flex-wrap items-center gap-3">
                              <PayButton contractId={c.id} amount={b.amount} commission={b.commission} providerFee={b.providerFee} net={b.net} methods={methods} />
                              {pay && <span className="text-sm text-muted-foreground">Dernière tentative : <PaymentStatusBadge status={pay.status} /></span>}
                            </div>
                          ) : (
                            <Alert variant="warning">Le paiement en ligne n&apos;est pas encore activé. L&apos;administrateur doit configurer un prestataire de paiement.</Alert>
                          )}
                          {!reviewed.has(c.id) ? <ReviewForm contractId={c.id} targetName={w ? w.first_name : "le travailleur"} /> : <p className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="size-4 fill-amber-400 text-amber-400" /> Avis publié, merci.</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Candidatures ({applications.length})</CardTitle>
              {pending.length > 0 && <p className="text-sm text-muted-foreground">{pending.length} en attente de votre décision</p>}
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <EmptyState icon={Users} title="Pas encore de candidature" description="Les travailleurs proches sont notifiés. Partagez le lien de l'annonce pour accélérer." />
              ) : (
                <ul className="grid gap-3">
                  {applications.map((a) => {
                    const w = people.get(a.worker_id);
                    return (
                      <li key={a.id} className="grid gap-3 rounded-xl border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <PersonLine p={w} />
                          <div className="flex items-center gap-2">
                            <ApplicationStatusBadge status={a.status} />
                            <span className="text-sm font-semibold tabular-nums">{formatXOF(a.proposed_amount ?? job.budget_amount)}</span>
                          </div>
                        </div>
                        <p className="whitespace-pre-line text-sm text-foreground/85">{a.cover_letter}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{formatRelative(a.created_at)}{a.proposed_amount ? " · prix proposé" : ""}</span>
                          <div className="flex flex-wrap gap-2">
                            {a.status !== "withdrawn" && <StartChatButton otherUserId={a.worker_id} jobId={job.id} label="Discuter" variant="ghost" />}
                            {a.status === "pending" && ["published", "reviewing"].includes(job.status) && (
                              <ApplicationActions applicationId={a.id} workerName={w?.first_name ?? "ce candidat"} amount={formatXOF(a.proposed_amount ?? job.budget_amount)} />
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Détails</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p><span className="text-muted-foreground">Mode :</span> {job.work_mode === "remote" ? "À distance" : "Sur place"}</p>
              <p><span className="text-muted-foreground">Adresse :</span> {job.address || "—"}</p>
              <p><span className="text-muted-foreground">Début :</span> {formatDate(job.start_date)}</p>
              <p><span className="text-muted-foreground">Travailleurs :</span> {job.workers_needed}</p>
              <p><span className="text-muted-foreground">Prix proposés :</span> {job.allow_price_proposal ? "acceptés" : "non"}</p>
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

function PersonLine({ p }: { p: PublicProfile | undefined }) {
  if (!p) return <span className="text-sm text-muted-foreground">Utilisateur</span>;
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-10">
        {p.avatar_url && <AvatarImage src={storagePublicUrl("avatars", p.avatar_url) ?? undefined} alt="" />}
        <AvatarFallback>{p.first_name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="flex items-center gap-1 font-medium">{p.first_name} {p.last_initial}{p.is_verified && <BadgeCheck className="size-4 text-primary" aria-label="Vérifié" />}</p>
        <p className="text-xs text-muted-foreground">
          {p.headline ?? p.city}
          {p.rating_count ? ` · ★ ${Number(p.rating_avg).toFixed(1)} (${p.rating_count})` : ""}
          {p.completed_jobs_count ? ` · ${p.completed_jobs_count} mission${p.completed_jobs_count > 1 ? "s" : ""}` : ""}
        </p>
      </div>
    </div>
  );
}
