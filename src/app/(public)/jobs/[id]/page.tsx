import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, Clock, Inbox, Share2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApplyForm } from "@/components/jobs/apply-form";
import { ReportButton } from "@/components/jobs/report-button";
import { FavoriteButton } from "@/components/jobs/favorite-button";
import { ApplicationStatusBadge, JobStatusBadge, PAY_TYPE_LABEL } from "@/components/jobs/status-badge";
import { AreaMap } from "@/components/maps/area-map";
import { JobHero } from "@/components/jobs/job-hero";
import { JobCard } from "@/components/jobs/job-card";
import { ShareButtons } from "@/components/jobs/share-buttons";
import { getCommissionRates, getPublicJob, searchJobs } from "@/services/catalog";
import { categoryPhoto } from "@/lib/media/category-photos";
import { requireUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv, storagePublicUrl } from "@/lib/env";
import { formatDate, formatRelative, formatXOF, readableCase } from "@/lib/utils/format";
import type { Application, PublicProfile } from "@/types/db";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const job = await getPublicJob(id).catch(() => null);
  if (!job) return { title: "Mission introuvable", robots: { index: false } };
  const title = readableCase(job.title);
  const description = `${job.category_name} à ${job.city} · ${formatXOF(job.budget_amount)} — ${readableCase(job.description).slice(0, 140)}`;
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${job.id}` },
    openGraph: { title, description, type: "article" },
    robots: job.status === "published" || job.status === "reviewing" ? undefined : { index: false },
  };
}

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const job = await getPublicJob(id);
  if (!job) notFound();

  // Détail réservé aux membres inscrits (profil finalisé) — la liste des missions reste publique.
  const user = await requireUser(`/jobs/${id}`);
  const supabase = await getSupabaseServerClient();
  const [{ data: clientRow }, { data: images }, myApp, fav] = await Promise.all([
    supabase.from("public_profiles").select("*").eq("id", job.client_id).maybeSingle<PublicProfile>(),
    supabase.from("job_images").select("id, storage_path").eq("job_id", job.id).order("sort_order"),
    user?.roles.includes("worker")
      ? supabase.from("applications").select("*").eq("job_id", job.id).eq("worker_id", user.id).maybeSingle<Application>()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("favorites").select("target_id").eq("user_id", user.id).eq("target_type", "job").eq("target_id", job.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const rates = await getCommissionRates();
  const similar = await searchJobs({ category: job.category_slug, sort: "recent" }, 4)
    .then((r) => r.rows.filter((j) => j.id !== job.id).slice(0, 3))
    .catch(() => []);
  const application = myApp.data as Application | null;
  const isOwner = user?.id === job.client_id;
  const firstImage = (images ?? [])[0] as { storage_path: string } | undefined;
  const ownCover = firstImage ? storagePublicUrl("job-images", firstImage.storage_path) : null;
  const illus = categoryPhoto(job.category_slug, job.category_icon);
  const cover = ownCover
    ? { src: ownCover, illustration: false, alt: "Photo de la mission" }
    : { src: illus.src, illustration: true, alt: illus.alt, credit: { author: illus.author, url: illus.authorUrl } };
  const shareUrl = `${publicEnv.siteUrl}/jobs/${job.id}`;
  const isOpen = (job.status === "published" || job.status === "reviewing") && job.deadline >= new Date().toISOString().slice(0, 10);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.published_at ?? job.created_at,
    validThrough: job.deadline,
    employmentType: "CONTRACTOR",
    hiringOrganization: { "@type": "Organization", name: "JOBLINK", sameAs: publicEnv.siteUrl },
    jobLocationType: job.work_mode === "remote" ? "TELECOMMUTE" : undefined,
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.city, addressCountry: job.country_code } },
    baseSalary: { "@type": "MonetaryAmount", currency: "XOF", value: { "@type": "QuantitativeValue", value: job.budget_amount } },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted-foreground">
        <Link href="/jobs" className="hover:text-foreground">Missions</Link> <span aria-hidden>/</span>{" "}
        <Link href={`/jobs?category=${job.category_slug}`} className="hover:text-foreground">{job.category_name}</Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <article className="grid content-start gap-6">
          <JobHero
            priority
            cover={cover}
            categoryName={job.category_name}
            categoryIcon={job.category_icon}
            title={readableCase(job.title)}
            place={job.work_mode === "remote" ? "À distance" : `${job.neighborhood}, ${job.city}`}
            remote={job.work_mode === "remote"}
            startDate={job.start_date}
            deadline={job.deadline}
            workersNeeded={job.workers_needed}
            createdAt={job.published_at ?? job.created_at}
            aside={<JobStatusBadge status={job.status} />}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/70"><Share2 className="size-3.5" /> Partager</span>
              <ShareButtons url={shareUrl} title={job.title} variant="dark" />
            </div>
          </JobHero>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: CalendarDays, label: "Début souhaité", value: formatDate(job.start_date) },
              { icon: Clock, label: "Date limite", value: formatDate(job.deadline) },
              { icon: Inbox, label: "Candidatures", value: String(job.applications_count) },
              { icon: Star, label: "Publiée", value: formatRelative(job.published_at ?? job.created_at) },
            ].map((d) => (
              <div key={d.label} className="rounded-2xl border bg-card p-3 shadow-[var(--shadow-soft)]">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><d.icon className="size-3.5 text-primary" /> {d.label}</dt>
                <dd className="mt-1 text-sm font-semibold">{d.value}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground/90">{readableCase(job.description)}</p>
          </section>

          {job.skills_required.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Compétences recherchées</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.skills_required.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            </section>
          )}

          {(images ?? []).length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Photos</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(images ?? []).map((img) => {
                  const src = storagePublicUrl("job-images", img.storage_path as string);
                  return src ? (
                    <a key={img.id as string} href={src} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-lg border">
                      <Image src={src} alt="Photo de la mission" width={400} height={300} className="aspect-[4/3] w-full object-cover transition-transform hover:scale-105" loading="lazy" />
                    </a>
                  ) : null;
                })}
              </div>
            </section>
          )}

          {job.work_mode === "on_site" && job.approx_lat !== null && job.approx_lng !== null && (
            <section>
              <h2 className="text-lg font-semibold">Zone d&apos;intervention</h2>
              <div className="mt-3 overflow-hidden rounded-xl border">
                <AreaMap lat={job.approx_lat} lng={job.approx_lng} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Zone approximative. L&apos;adresse exacte est communiquée au travailleur retenu.</p>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            {user && !isOwner && <FavoriteButton targetType="job" targetId={job.id} initial={Boolean(fav.data)} />}
            {user && !isOwner && <ReportButton targetType="job" targetId={job.id} label="Signaler la mission" />}
          </div>
        </article>

        <aside className="grid content-start gap-4 lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="text-3xl font-semibold text-primary-strong tabular-nums">
                {formatXOF(job.budget_amount)}
                {job.pay_type !== "fixed" && <span className="text-base font-normal text-muted-foreground"> {PAY_TYPE_LABEL[job.pay_type]}</span>}
              </p>
              {job.allow_price_proposal && <p className="text-xs text-muted-foreground">Le client accepte les propositions de prix.</p>}
            </CardHeader>
            <CardContent className="grid gap-4">
              {isOwner ? (
                <Button asChild size="lg"><Link href={`/client/jobs/${job.id}`}>Gérer ma mission</Link></Button>
              ) : !isOpen ? (
                <Alert variant="info">Cette mission n&apos;accepte plus de candidatures.</Alert>
              ) : !user ? (
                <div className="grid gap-2">
                  <Button asChild size="lg"><Link href={`/login?next=/jobs/${job.id}`}>Se connecter pour postuler</Link></Button>
                  <Button asChild variant="outline"><Link href="/register?type=worker">Créer un compte travailleur</Link></Button>
                </div>
              ) : !user.roles.includes("worker") ? (
                <Alert variant="info">Seuls les comptes travailleurs peuvent postuler.</Alert>
              ) : application ? (
                <div className="grid gap-2">
                  <p className="flex items-center justify-between text-sm">Votre candidature <ApplicationStatusBadge status={application.status} /></p>
                  <Button asChild variant="outline"><Link href="/worker/applications">Suivre mes candidatures</Link></Button>
                </div>
              ) : !user.emailConfirmed ? (
                <Alert variant="warning">Confirmez votre adresse e-mail pour postuler.</Alert>
              ) : (
                <ApplyForm jobId={job.id} budget={job.budget_amount} allowPriceProposal={job.allow_price_proposal} commissionRate={rates.commission} />
              )}
            </CardContent>
          </Card>

          {clientRow && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Publiée par</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-3">
                <Avatar className="size-11">
                  {clientRow.avatar_url && <AvatarImage src={storagePublicUrl("avatars", clientRow.avatar_url) ?? undefined} alt="" />}
                  <AvatarFallback>{clientRow.first_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="flex items-center gap-1 font-medium">{clientRow.first_name} {clientRow.last_initial}<BadgeCheck className="size-4 text-primary" aria-label="E-mail vérifié" /></p>
                  <p className="text-xs text-muted-foreground">Membre depuis {formatDate(clientRow.created_at, "MMMM yyyy")}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
            <Star className="mt-0.5 size-3.5 shrink-0" /> Ne payez jamais en dehors de JOBLINK : vous perdriez la protection du suivi et des litiges.
          </p>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14" aria-labelledby="similar-title">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 id="similar-title" className="text-xl font-bold tracking-tight">Missions similaires</h2>
            <Link href={`/jobs?category=${job.category_slug}`} className="text-sm font-semibold text-primary-strong hover:underline">Tout voir en {job.category_name}</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>
      )}
    </div>
  );
}
