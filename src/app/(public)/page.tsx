import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Banknote, Briefcase, CheckCircle2, ClipboardList, Handshake, Lock,
  MapPinned, MessageSquare, Search, ShieldCheck, Smartphone, Star, UserRound, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/jobs/search-bar";
import { JobCard } from "@/components/jobs/job-card";
import { NearbyWorkers } from "@/components/jobs/nearby-workers";
import { CategoryIcon } from "@/components/layout/category-icon";
import { CityDatalist } from "@/components/layout/city-datalist";
import { ConfigNotice } from "@/components/layout/config-notice";
import { FaqList, FAQ_ITEMS } from "@/components/layout/faq-list";
import { LogoMark } from "@/components/layout/logo";
import { EmptyState } from "@/components/dashboard/empty-state";
import { HeroOrbit } from "@/components/home/hero-orbit";
import { HeroMedia } from "@/components/home/hero-media";
import { CountUp } from "@/components/motion/count-up";
import { SectionHeading } from "@/components/home/section-heading";
import { ShowMore } from "@/components/home/show-more";
import { TalentMosaic } from "@/components/home/talent-mosaic";
import { getCategories, getCategoryCounts, getPublicStats, getRecentJobs } from "@/services/catalog";
import { getFeaturedReviews } from "@/services/reviews";
import { computeBreakdown } from "@/lib/payments/commission";
import { formatXOF } from "@/lib/utils/format";
import { PHOTOS } from "@/lib/media/photos";

export const revalidate = 60;

const CLIENT_STEPS = [
  { icon: ClipboardList, title: "Publiez votre besoin", text: "Décrivez la mission, le budget en FCFA, la date et le quartier. C'est gratuit." },
  { icon: Search, title: "Comparez les candidatures", text: "Les travailleurs proches postulent : profils, avis et propositions côte à côte." },
  { icon: Handshake, title: "Choisissez et échangez", text: "Acceptez un candidat et organisez-vous via la messagerie intégrée." },
  { icon: CheckCircle2, title: "Validez, puis payez", text: "Le travail est validé ? Réglez par Mobile Money, reçu à l'appui." },
];

const WORKER_STEPS = [
  { icon: UserRound, title: "Créez votre profil", text: "Métiers, compétences, tarifs et zone de déplacement." },
  { icon: MapPinned, title: "Trouvez des missions", text: "Par quartier, par catégorie ou sur la carte, dans votre rayon." },
  { icon: Briefcase, title: "Réalisez le travail", text: "Suivi clair de la mission, de l'acceptation à la validation." },
  { icon: Wallet, title: "Soyez payé", text: "Montant convenu moins 5 % de commission, frais externes affichés." },
];

const TRUST = [
  { icon: Smartphone, label: "MTN MoMo & Moov Money" },
  { icon: Lock, label: "Adresse exacte protégée" },
  { icon: BadgeCheck, label: "Avis liés à des missions réalisées" },
  { icon: Wallet, label: "5 % seulement, aucun frais caché" },
];

function AnimatedWords({ text, start = 0, step = 70 }: { text: string; start?: number; step?: number }) {
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <Fragment key={i}>
            <span className="jl-word">
              <span style={{ animationDelay: `${start + i * step}ms` }}>{w}</span>
            </span>
            {i < words.length - 1 ? " " : ""}
          </Fragment>
        ))}
      </span>
    </>
  );
}

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

      {/* ───────────── HERO ───────────── */}
      <section className="relative isolate overflow-hidden bg-white">
        {/* Arrière-plan : montage vidéo de 20 s (artisans et marchés d'Afrique de l'Ouest), puis photo d'un marché du Bénin */}
        <HeroMedia photo={PHOTOS.market} />
        <div aria-hidden className="absolute inset-0 -z-20 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.97)_0%,rgb(255_255_255/0.9)_38%,rgb(255_255_255/0.55)_62%,rgb(240_253_244/0.35)_80%,rgb(255_255_255/0.95)_100%)]" />
        <div aria-hidden className="absolute inset-0 -z-20 bg-[radial-gradient(60rem_34rem_at_50%_-8%,rgb(220_252_231/0.9)_0%,transparent_65%)]" />
        <div aria-hidden className="jl-grid absolute inset-0 -z-20 opacity-50 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_25%,transparent_75%)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-10 text-center sm:px-6 sm:pt-16 lg:pt-20">
          <p className="jl-rise inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 py-1 pl-1 pr-3 text-xs font-medium text-primary-strong shadow-sm backdrop-blur">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">Bénin</span>
            Missions et services géolocalisés
          </p>

          <h1 className="mx-auto mt-6 max-w-6xl text-balance text-[2.3rem] font-extrabold leading-[1.05] tracking-[-0.03em] [word-spacing:0.05em] sm:text-6xl lg:text-[4.1rem]">
            <AnimatedWords text="Le travail près de vous," start={120} />
            <br />
            <span className="relative inline-block text-primary">
              <AnimatedWords text="les opportunités à portée de main." start={420} />
              <svg aria-hidden viewBox="0 0 320 18" preserveAspectRatio="none" className="absolute -bottom-3 left-[6%] h-3.5 w-[88%] text-primary/30">
                <path
                  d="M3 13C90 3 230 1 317 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="320"
                  className="animate-[underline-draw_1.2s_cubic-bezier(.22,1,.36,1)_1.1s_both]"
                />
              </svg>
            </span>
          </h1>

          <p className="jl-rise mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground [animation-delay:700ms]">
            Vous êtes au centre. JOBLINK fait apparaître les plombiers, électriciens, couturiers, aides ménagères
            et talents du numérique disponibles autour de vous.
          </p>

          <div className="jl-rise mx-auto mt-8 max-w-2xl text-left [animation-delay:850ms]">
            <SearchBar />
            <CityDatalist />
          </div>

          <div className="jl-rise mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm [animation-delay:950ms]">
            <Link href="/client/jobs/new" prefetch={false} className="group inline-flex items-center gap-1.5 font-semibold text-primary-strong">
              Publier une mission gratuitement
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
            <Link href="/register?type=worker" className="font-medium text-muted-foreground transition-colors hover:text-foreground">
              Je propose mes services
            </Link>
          </div>
        </div>

        <div className="relative z-0 mt-6 px-2 sm:mt-0 sm:px-6 lg:-mt-2">
          <HeroOrbit />
        </div>

        {stats && (
          <dl className="jl-rise mx-auto mb-12 mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 text-sm text-muted-foreground [animation-delay:1.3s] sm:mt-14">
            <span className="inline-flex items-center gap-2 font-medium text-primary-strong">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              En direct
            </span>
            {[
              { label: "missions ouvertes", value: stats.open_jobs },
              { label: "travailleurs inscrits", value: stats.workers },
              { label: "missions réalisées", value: stats.completed_jobs },
            ].map((s) => (
              <div key={s.label} className="flex items-baseline gap-1.5">
                <dd className="text-lg font-extrabold tabular-nums text-foreground"><CountUp value={s.value} /></dd>
                <dt>{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* ───────────── BANDEAU DÉFILANT ───────────── */}
      <section aria-label="Engagements JOBLINK" className="jl-marquee-wrap relative overflow-hidden border-y border-border/70 bg-white py-4 [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
        <ul className="jl-marquee flex w-max items-center gap-10">
          {[...TRUST, ...TRUST, ...TRUST, ...TRUST].map((t, i) => (
            <li key={i} aria-hidden={i >= TRUST.length} className="flex shrink-0 items-center gap-3 text-sm font-medium text-foreground">
              <span className="grid size-8 place-items-center rounded-full bg-accent text-primary">
                <t.icon className="size-4" aria-hidden />
              </span>
              {t.label}
              <span aria-hidden className="ml-7 text-primary/40">✦</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────────── CATÉGORIES ───────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="cat-title">
        <SectionHeading
          id="cat-title"
          eyebrow="Catégories"
          title="Tous les services du quotidien, au même endroit"
          description="Du dépannage urgent aux projets numériques, trouvez la bonne personne pour chaque besoin."
          action={
            <Link href="/categories" className="group inline-flex items-center gap-1 text-sm font-semibold text-primary-strong">
              Toutes les catégories <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          }
        />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.slice(0, 12).map((c, i) => {
            const n = counts[c.slug] ?? 0;
            return (
              <Link
                key={c.id}
                href={`/jobs?category=${c.slug}`}
                data-reveal="" style={{ "--reveal-delay": `${(i % 6) * 70}ms` } as React.CSSProperties}
                className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/80 bg-white p-4 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary ring-1 ring-primary/10 transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold leading-tight">{c.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{n} mission{n > 1 ? "s" : ""}</span>
                </span>
                <ArrowUpRight className="absolute right-3 top-3 size-4 text-transparent transition-colors duration-300 group-hover:text-primary" aria-hidden />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ───────────── SAVOIR-FAIRE (photos) ───────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6" aria-labelledby="talent-title">
        <SectionHeading
          id="talent-title"
          eyebrow="Savoir-faire"
          title="Des mains expertes, à quelques rues de chez vous"
          description="Artisans, techniciens, couturiers, bâtisseurs : JOBLINK donne de la visibilité aux talents de votre quartier."
        />
        <div className="mt-10" data-reveal="">
          <TalentMosaic />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Photos d&apos;illustration.</p>
      </section>

      {/* ───────────── MISSIONS RÉCENTES ───────────── */}
      <section className="px-2 sm:px-4" aria-labelledby="recent-title">
        <div className="mx-auto max-w-[88rem] rounded-[2rem] bg-[#f5f7f6] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              id="recent-title"
              eyebrow="En direct"
              title="Missions récemment publiées"
              description="Des opportunités ouvertes, mises à jour en continu."
              action={
                <Button asChild variant="outline" className="rounded-full bg-white">
                  <Link href="/jobs">Voir toutes les missions <ArrowRight /></Link>
                </Button>
              }
            />
            {jobs.length > 0 ? (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job, i) => (
                  <div key={job.id} data-reveal="" style={{ "--reveal-delay": `${(i % 3) * 90}ms` } as React.CSSProperties}>
                    <JobCard job={job} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                className="mt-10 rounded-2xl bg-white"
                icon={ClipboardList}
                title="Aucune mission ouverte pour le moment"
                description="Soyez le premier à publier une mission dans votre quartier."
                action={
                  <Button asChild className="rounded-full">
                    <Link href="/client/jobs/new" prefetch={false}>Publier une mission</Link>
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </section>

      {/* ───────────── COMMENT ÇA MARCHE ───────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="how-title">
        <SectionHeading
          id="how-title"
          align="center"
          eyebrow="Comment ça marche"
          title="Simple pour ceux qui cherchent, simple pour ceux qui travaillent"
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {[
            { title: "Vous avez besoin d'un service", tag: "Clients", steps: CLIENT_STEPS, href: "/register?type=client", cta: "Publier une mission" },
            { title: "Vous cherchez du travail", tag: "Travailleurs", steps: WORKER_STEPS, href: "/register?type=worker", cta: "Devenir travailleur" },
          ].map((col, idx) => (
            <div
              key={col.tag}
              data-reveal="" style={{ "--reveal-delay": `${idx * 120}ms` } as React.CSSProperties}
              className={
                idx === 0
                  ? "rounded-[1.75rem] border border-border/80 bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8"
                  : "rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-accent via-white to-accent/40 p-6 shadow-[var(--shadow-soft)] sm:p-8"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold">{col.title}</h3>
                <span className="shrink-0 rounded-full bg-primary-strong px-3 py-1 text-xs font-semibold text-white">{col.tag}</span>
              </div>
              <ol className="relative mt-8 grid gap-6 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-gradient-to-b before:from-primary/40 before:to-primary/5">
                {col.steps.map((s, i) => (
                  <li key={s.title} className="relative flex gap-4">
                    <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-white text-primary shadow-sm">
                      <s.icon className="size-[18px]" aria-hidden />
                    </span>
                    <div className="pt-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Étape {i + 1}</p>
                      <h4 className="mt-0.5 font-semibold">{s.title}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Button asChild className="mt-8 rounded-full" variant={idx === 0 ? "default" : "dark"}>
                <Link href={col.href}>{col.cta} <ArrowRight /></Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── LE RESTE : déployé sur « Voir plus » ───────────── */}
      <ShowMore label="Voir plus sur JOBLINK" lessLabel="Réduire">
      {/* ───────────── POURQUOI (bento) ───────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24" aria-labelledby="why-title">
        <SectionHeading id="why-title" eyebrow="Pourquoi JOBLINK" title="La confiance, conçue dès le départ" />
        <div className="mt-10 grid gap-4 md:grid-cols-6">
          <div data-reveal="" className="relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-[#ecfdf3] to-white p-7 md:col-span-6 lg:col-span-4 lg:row-span-2 md:p-9">
            <div aria-hidden className="jl-grid absolute inset-0 opacity-70" />
            <div className="relative max-w-sm">
              <span className="grid size-11 place-items-center rounded-xl bg-primary text-white shadow-[0_8px_20px_-6px_rgb(22_163_74/0.6)]">
                <MapPinned className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-2xl font-bold tracking-tight">Près de chez vous, vraiment</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Recherche par quartier et par rayon de 1 à 50 km, avec carte interactive. Les positions sont arrondies
                à environ 1 km pour protéger la vie privée de chacun.
              </p>
              <Link href="/map" className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong">
                Explorer la carte <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-10 hidden sm:block">
              <div className="relative size-72">
                <div className="absolute inset-0 rounded-full border border-primary/20 bg-primary/[0.05]" />
                <div className="absolute inset-12 rounded-full border border-dashed border-primary/30" />
                <LogoMark className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-[70%]" />
              </div>
            </div>
          </div>
          {[
            { icon: ShieldCheck, title: "Sécurisé", text: "Données privées protégées, adresse précise partagée uniquement avec le travailleur retenu." },
            { icon: Wallet, title: "Transparent", text: "5 % de commission sur les missions payées. Frais affichés avant toute confirmation." },
            { icon: Smartphone, title: "Pensé pour le mobile", text: "Léger et rapide, même avec une connexion limitée." },
            { icon: MessageSquare, title: "Messagerie intégrée", text: "Échangez sans partager votre numéro avant d'être prêt." },
          ].map((r, i) => (
            <div
              key={r.title}
              data-reveal="" style={{ "--reveal-delay": `${100 + i * 90}ms` } as React.CSSProperties}
              className={`rounded-[1.75rem] border border-border/80 bg-white p-6 shadow-[var(--shadow-soft)] md:col-span-3 ${i < 2 ? "lg:col-span-2" : "lg:col-span-3"}`}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                <r.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-bold">{r.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── TRAVAILLEURS À PROXIMITÉ ───────────── */}
      <section className="border-t border-border/70 bg-[#fbfcfb]" aria-labelledby="near-title">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            id="near-title"
            eyebrow="À proximité"
            title="Travailleurs disponibles autour de vous"
            description="Seuls les travailleurs qui ont accepté d'être visibles apparaissent ici, avec une distance approximative."
          />
          <div className="mt-8">
            <NearbyWorkers />
          </div>
        </div>
      </section>

      {/* ───────────── PAIEMENTS ───────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="pay-title">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="pay-title" eyebrow="Paiements" title="Payé après validation. Sans surprise." />
            <ul className="mt-8 grid gap-4">
              {[
                "Le client paie après la réalisation et la validation du travail.",
                "Paiement via MTN Mobile Money, Moov Money ou autre moyen compatible, par un prestataire agréé.",
                "JOBLINK prélève 5 % de commission. Les frais externes éventuels sont affichés avant confirmation.",
                "Chaque paiement génère un reçu et apparaît dans votre historique.",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-white">
                    <CheckCircle2 className="size-3.5" aria-hidden />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative isolate">
            <div aria-hidden className="absolute -inset-y-6 inset-x-0 -z-10 rounded-[2.5rem] sm:-inset-x-6 bg-gradient-to-br from-accent to-transparent" />
            <div data-reveal="" className="mx-auto max-w-md rounded-[1.75rem] border border-border/80 bg-white p-7 shadow-[var(--shadow-lift)] transition-transform duration-500 hover:-translate-y-1 hover:rotate-[-0.5deg]">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Banknote className="size-4 text-primary" /> Exemple de calcul
                </p>
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary-strong">XOF</span>
              </div>
              <dl className="mt-6 grid gap-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Montant de la mission</dt><dd className="font-semibold tabular-nums">{formatXOF(example.amount)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Commission JOBLINK (5 %)</dt><dd className="tabular-nums text-muted-foreground">− {formatXOF(example.commission)}</dd></div>
                <div className="border-t border-dashed" />
                <div className="flex items-end justify-between gap-3">
                  <dt className="font-semibold">Montant net pour le travailleur</dt>
                  <dd className="text-2xl font-extrabold tracking-tight text-primary-strong tabular-nums">{formatXOF(example.net)}</dd>
                </div>
              </dl>
              <p className="mt-5 rounded-xl bg-muted/70 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                Avant éventuels frais du prestataire de paiement, toujours affichés avant validation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── TÉMOIGNAGES RÉELS ───────────── */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6" aria-labelledby="reviews-title">
          <SectionHeading id="reviews-title" eyebrow="Avis vérifiés" title="Ils ont utilisé JOBLINK" />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} data-reveal="" className="rounded-[1.75rem] border border-border/80 bg-white p-7 shadow-[var(--shadow-soft)]">
                <div className="flex gap-0.5" aria-label={`${r.rating} sur 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`size-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} aria-hidden />
                  ))}
                </div>
                <blockquote className="mt-4 leading-relaxed">« {r.comment} »</blockquote>
                <figcaption className="mt-5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  {r.reviewer_name} <BadgeCheck className="size-4 text-primary" aria-label="Avis vérifié (mission réalisée)" />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ───────────── CTA ───────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div data-reveal="" className="relative isolate overflow-hidden rounded-[2rem] bg-primary-strong px-6 py-14 text-white sm:px-14 sm:py-16">
          <div aria-hidden className="absolute inset-y-0 right-0 -z-10 hidden w-[46%] lg:block">
            <Image src={PHOTOS.ladder.src} alt="" fill sizes="40vw" className="object-cover object-[50%_30%] opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary-strong via-primary-strong/60 to-primary-strong/10" />
          </div>
          <div aria-hidden className="absolute -bottom-24 -left-10 -z-20 size-72 rounded-full bg-primary/40 blur-3xl" />
          <div className="grid max-w-2xl gap-8">
            <div>
              <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Prêt à commencer ?</h2>
              <p className="mt-3 max-w-xl text-lg text-green-100">
                Inscription gratuite en moins de deux minutes, comme client ou comme travailleur.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full bg-white text-primary-strong shadow-lg hover:bg-green-50">
                <Link href="/register?type=client">Je cherche un prestataire</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/register?type=worker">Je cherche du travail</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6" aria-labelledby="faq-title">
        <SectionHeading id="faq-title" align="center" eyebrow="FAQ" title="Questions fréquentes" />
        <div className="mt-10">
          <FaqList items={FAQ_ITEMS.slice(0, 4)} />
        </div>
        <p className="mt-8 text-center text-sm">
          <Link href="/faq" className="inline-flex items-center gap-1.5 font-semibold text-primary-strong hover:underline">
            <MessageSquare className="size-4" /> Toutes les questions
          </Link>
        </p>
      </section>
      </ShowMore>
    </>
  );
}
