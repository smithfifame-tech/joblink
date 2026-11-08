import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Banknote, CheckCircle2, ClipboardList, Handshake, MapPinned, MessageSquare,
  Search, ShieldCheck, Smartphone, Star, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/jobs/search-bar";
import { JobCard } from "@/components/jobs/job-card";
import { NearbyWorkers } from "@/components/jobs/nearby-workers";
import { CategoryIcon } from "@/components/layout/category-icon";
import { CityDatalist } from "@/components/layout/city-datalist";
import { ConfigNotice } from "@/components/layout/config-notice";
import { FaqList, FAQ_ITEMS } from "@/components/layout/faq-list";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getCategories, getCategoryCounts, getPublicStats, getRecentJobs } from "@/services/catalog";
import { getFeaturedReviews } from "@/services/reviews";
import { computeBreakdown } from "@/lib/payments/commission";
import { formatXOF } from "@/lib/utils/format";

export const revalidate = 60;

const STEPS = [
  { icon: ClipboardList, title: "Publiez votre besoin", text: "Décrivez la mission, le budget en FCFA, la date et le lieu. C'est gratuit." },
  { icon: Search, title: "Recevez des candidatures", text: "Les travailleurs proches postulent. Comparez profils, avis et propositions." },
  { icon: Handshake, title: "Choisissez et échangez", text: "Acceptez un candidat et organisez-vous via la messagerie intégrée." },
  { icon: CheckCircle2, title: "Validez puis payez", text: "Une fois le travail validé, réglez par Mobile Money. Le travailleur est payé." },
];

const REASONS = [
  { icon: MapPinned, title: "Près de chez vous", text: "Recherche par quartier et par rayon de 1 à 50 km, avec carte interactive." },
  { icon: ShieldCheck, title: "Sécurisé", text: "Profils vérifiables, adresse exacte partagée seulement avec le travailleur retenu." },
  { icon: Wallet, title: "Transparent", text: "5 % de commission sur les missions payées, frais affichés, aucun coût caché." },
  { icon: Smartphone, title: "Pensé pour le mobile", text: "Léger et rapide, même avec une connexion mobile limitée." },
];

export default async function HomePage() {
  const [categories, jobs, stats, counts, reviews] = await Promise.all([
    getCategories().catch(() => []),
    getRecentJobs(6).catch(() => []),
    getPublicStats().catch(() => null),
    getCategoryCounts().catch(() => ({}) as Record<string, number>),
    getFeaturedReviews(3).catch(() => []),
  ]);
  const example = computeBreakdown(10000);

  return (
    <>
      <ConfigNotice />
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_70%_-10%,#dcfce7_0%,transparent_60%)]" />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" /> Disponible au Bénin
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              Trouvez du travail. Trouvez les bonnes personnes.{" "}
              <span className="text-primary">Près de chez vous.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
              JOBLINK connecte les personnes qui ont besoin d&apos;un service aux travailleurs disponibles autour d&apos;elles.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/jobs">
                  Trouver une mission <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/client/jobs/new">Publier une mission</Link>
              </Button>
            </div>
          </div>
          <SearchBar className="mx-auto mt-10 max-w-3xl" />
          <CityDatalist />
          {stats && (
            <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-4 text-center">
              {[
                { label: "Missions ouvertes", value: stats.open_jobs },
                { label: "Travailleurs inscrits", value: stats.workers },
                { label: "Missions réalisées", value: stats.completed_jobs },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="text-xs text-muted-foreground sm:text-sm">{s.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value.toLocaleString("fr-FR")}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* CATÉGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-labelledby="cat-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="cat-title" className="text-2xl font-semibold sm:text-3xl">Catégories populaires</h2>
            <p className="mt-2 text-muted-foreground">Du dépannage du quotidien aux projets numériques.</p>
          </div>
          <Link href="/categories" className="hidden text-sm font-medium text-primary hover:underline sm:block">
            Toutes les catégories
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.slice(0, 12).map((c) => (
            <Link
              key={c.id}
              href={`/jobs?category=${c.slug}`}
              className="group flex flex-col gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <CategoryIcon name={c.icon} className="size-5" />
              </span>
              <span className="text-sm font-medium leading-tight">{c.name}</span>
              <span className="text-xs text-muted-foreground">{counts[c.slug] ?? 0} mission{(counts[c.slug] ?? 0) > 1 ? "s" : ""}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* MISSIONS RÉCENTES */}
      <section className="bg-muted/40 py-14" aria-labelledby="recent-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="recent-title" className="text-2xl font-semibold sm:text-3xl">Missions récemment publiées</h2>
              <p className="mt-2 text-muted-foreground">Des opportunités ouvertes, mises à jour en continu.</p>
            </div>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/jobs">Voir toutes les missions</Link>
            </Button>
          </div>
          {jobs.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-8 bg-background"
              icon={ClipboardList}
              title="Aucune mission ouverte pour le moment"
              description="Soyez le premier à publier une mission dans votre quartier."
              action={
                <Button asChild>
                  <Link href="/client/jobs/new">Publier une mission</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="how-title">
        <h2 id="how-title" className="text-center text-2xl font-semibold sm:text-3xl">Comment fonctionne JOBLINK</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border p-6">
              <span className="absolute right-5 top-5 text-sm font-semibold text-muted-foreground/50">0{i + 1}</span>
              <s.icon className="size-6 text-primary" aria-hidden />
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* POURQUOI */}
      <section className="border-y bg-foreground text-background" aria-labelledby="why-title">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 id="why-title" className="text-2xl font-semibold text-background sm:text-3xl">Pourquoi utiliser JOBLINK</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map((r) => (
              <div key={r.title}>
                <span className="grid size-10 place-items-center rounded-lg bg-primary/20 text-green-300">
                  <r.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold text-background">{r.title}</h3>
                <p className="mt-2 text-sm text-gray-300">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAVAILLEURS À PROXIMITÉ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="near-title">
        <h2 id="near-title" className="text-2xl font-semibold sm:text-3xl">Travailleurs disponibles à proximité</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Seuls les travailleurs qui ont accepté d&apos;être visibles apparaissent ici, avec une distance approximative.
        </p>
        <div className="mt-6">
          <NearbyWorkers />
        </div>
      </section>

      {/* PAIEMENTS */}
      <section className="bg-accent/60 py-16" aria-labelledby="pay-title">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 id="pay-title" className="text-2xl font-semibold sm:text-3xl">Comment les paiements fonctionnent</h2>
            <ul className="mt-6 grid gap-4">
              {[
                "Le client paie après la réalisation et la validation du travail.",
                "Paiement via MTN Mobile Money, Moov Money ou autre moyen compatible, par un prestataire agréé.",
                "JOBLINK prélève 5 % de commission. Les frais externes éventuels sont affichés avant confirmation.",
                "Chaque paiement génère un reçu et apparaît dans votre historique.",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border bg-background p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Banknote className="size-4" /> Exemple de calcul
            </p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between"><dt>Montant de la mission</dt><dd className="font-medium tabular-nums">{formatXOF(example.amount)}</dd></div>
              <div className="flex justify-between text-muted-foreground"><dt>Commission JOBLINK (5 %)</dt><dd className="tabular-nums">− {formatXOF(example.commission)}</dd></div>
              <div className="flex justify-between border-t pt-3 text-base"><dt className="font-semibold">Montant net pour le travailleur</dt><dd className="font-semibold text-primary-strong tabular-nums">{formatXOF(example.net)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Avant éventuels frais du prestataire de paiement, toujours affichés avant validation.</p>
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES RÉELS */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="reviews-title">
          <h2 id="reviews-title" className="text-2xl font-semibold sm:text-3xl">Ils ont utilisé JOBLINK</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="rounded-2xl border p-6">
                <div className="flex gap-0.5" aria-label={`${r.rating} sur 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`size-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} aria-hidden />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed">« {r.comment} »</blockquote>
                <figcaption className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
                  {r.reviewer_name} <BadgeCheck className="size-3.5 text-primary" aria-label="Avis vérifié (mission réalisée)" />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary-strong px-6 py-12 text-center text-white sm:px-12">
          <div aria-hidden className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/40 blur-3xl" />
          <h2 className="relative text-2xl font-semibold text-white sm:text-3xl">Prêt à commencer ?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-green-100">
            Inscrivez-vous gratuitement en moins de deux minutes, comme client ou comme travailleur.
          </p>
          <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-primary-strong hover:bg-green-50">
              <Link href="/register?type=client">Je cherche un prestataire</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/register?type=worker">Je cherche du travail</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-center text-2xl font-semibold sm:text-3xl">Questions fréquentes</h2>
        <div className="mt-8">
          <FaqList items={FAQ_ITEMS.slice(0, 4)} />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/faq" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <MessageSquare className="size-4" /> Toutes les questions
          </Link>
        </p>
      </section>
    </>
  );
}
