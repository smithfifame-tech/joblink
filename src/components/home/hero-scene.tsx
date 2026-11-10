import Link from "next/link";
import {
  ArrowUpRight, BadgeCheck, Check, CheckCheck, House, Map as MapIcon, MapPin, MessageCircle, Plus, Search, Smartphone, Star, UserRound,
} from "lucide-react";
import { CategoryIcon } from "@/components/layout/category-icon";
import { computeBreakdown } from "@/lib/payments/commission";
import { formatXOF } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/**
 * Scène du hero : le parcours JOBLINK raconté par l'interface elle-même, sans photo.
 * Au centre, l'application sur téléphone ; autour, les 4 moments d'une mission
 * (trouver près de soi, comparer, échanger, payer après validation), reliés au téléphone.
 * Tout le contenu est un exemple illustratif (étiqueté « Exemple »), jamais une vraie annonce.
 */

const BUDGET = 15000;

const MISSIONS = [
  { icon: "scissors", cat: "Couture", title: "Retouche de 3 tenues en pagne", place: "Cadjèhoun", km: "1,2 km", budget: 15000, isNew: true },
  { icon: "wrench", cat: "Plomberie", title: "Réparer une fuite sous l'évier", place: "Fidjrossè", km: "2,4 km", budget: 8000, isNew: false },
  { icon: "zap", cat: "Électricité", title: "Poser 4 prises et un disjoncteur", place: "Akpakpa", km: "3,1 km", budget: 20000, isNew: false },
];

const CHIPS = [
  { icon: "wrench", label: "Plomberie", slug: "plomberie" },
  { icon: "zap", label: "Électricité", slug: "electricite" },
  { icon: "sparkles", label: "Ménage", slug: "menage" },
  { icon: "bike", label: "Livraison", slug: "livraison" },
];

function ExampleTag({ dark }: { dark?: boolean }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", dark ? "bg-white/15 text-white/80" : "bg-accent text-primary-strong")}>
      Exemple
    </span>
  );
}

/** Carte satellite d'une étape, avec son trait de liaison vers le téléphone (grand écran). */
function StepCard({
  n, title, side, delay, className, dark, children,
}: { n: number; title: string; side: "left" | "right"; delay: number; className?: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("jl-rise relative w-full max-w-[21rem]", side === "left" ? "lg:justify-self-end" : "lg:justify-self-start", className)} style={{ animationDelay: `${delay}ms` }}>
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.6rem] p-4 text-left shadow-[var(--shadow-soft)] ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
          dark ? "bg-primary-strong text-white" : "bg-white",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[13px] font-bold">
            <span className={cn("grid size-6 place-items-center rounded-full text-[11px] font-extrabold", dark ? "bg-green-400 text-primary-strong" : "bg-primary text-white")}>{n}</span>
            {title}
          </p>
          <ExampleTag dark={dark} />
        </div>
        {children}
      </div>
      {/* Liaison vers le téléphone */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 hidden h-0 w-10 border-t-2 border-dashed border-primary/45 lg:block",
          side === "left" ? "-right-10" : "-left-10",
        )}
      >
        <span className={cn("absolute -top-[5px] size-2 rounded-full bg-primary ring-4 ring-primary/15", side === "left" ? "-right-1" : "-left-1")} />
      </span>
    </div>
  );
}

/** 1 · Plan de quartier stylisé : vous au centre, les travailleurs autour, reliés par des traits. */
function MapStep() {
  const pins = [
    { x: 18, y: 26, icon: "scissors" },
    { x: 80, y: 22, icon: "wrench" },
    { x: 86, y: 70, icon: "zap" },
    { x: 24, y: 76, icon: "sparkles" },
  ];
  return (
    <>
      <div className="relative h-36 overflow-hidden rounded-2xl bg-[#eef7f0]">
        <svg aria-hidden viewBox="0 0 100 60" preserveAspectRatio="none" className="absolute inset-0 size-full">
          {/* Îlots */}
          <rect x="4" y="5" width="26" height="18" rx="2" fill="#fff" opacity=".8" />
          <rect x="38" y="4" width="24" height="12" rx="2" fill="#fff" opacity=".8" />
          <rect x="70" y="6" width="26" height="16" rx="2" fill="#fff" opacity=".8" />
          <rect x="4" y="32" width="20" height="24" rx="2" fill="#fff" opacity=".8" />
          <rect x="72" y="32" width="24" height="22" rx="2" fill="#fff" opacity=".8" />
          <rect x="34" y="40" width="30" height="16" rx="2" fill="#dcfce7" />
          {/* Rues */}
          <path d="M0 27h100M33 0v60M67 0v60" stroke="#fff" strokeWidth="3.2" fill="none" />
          <path d="M0 27h100M33 0v60M67 0v60" stroke="#d1d5db" strokeWidth=".35" strokeDasharray="1.6 1.6" fill="none" />
          {/* Liens vers les travailleurs */}
          {pins.map((p) => (
            <line
              key={p.icon}
              x1="50" y1="30" x2={p.x} y2={p.y * 0.6}
              stroke="#16a34a" strokeWidth="1.6" strokeDasharray="5 5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
              className="animate-[orbit-dash_14s_linear_infinite]"
            />
          ))}
        </svg>
        {/* Vous */}
        <span className="absolute left-1/2 top-1/2">
          <span aria-hidden className="absolute left-0 top-0 size-20 rounded-full bg-primary/25 animate-[radar_3.2s_ease-out_infinite]" />
          <span className="absolute left-0 top-0 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-foreground text-white shadow-lg ring-4 ring-white">
            <UserRound className="size-4" />
          </span>
          <span className="absolute left-0 top-5 -translate-x-1/2 rounded-full bg-foreground px-1.5 py-px text-[9px] font-bold text-white">Vous</span>
        </span>
        {pins.map((p, i) => (
          <span
            key={p.icon}
            className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-white shadow-md ring-[3px] ring-white animate-[pop_.5s_cubic-bezier(.2,1.4,.4,1)_both]"
            style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${900 + i * 180}ms` }}
          >
            <CategoryIcon name={p.icon} className="size-4" />
          </span>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="size-3.5 text-primary" /> Les travailleurs disponibles <strong className="font-semibold text-foreground">autour de vous</strong>
      </p>
    </>
  );
}

/** 2 · Candidatures côte à côte. */
function CandidatesStep() {
  const rows = [
    { initials: "A", job: "Couturière", km: "0,8 km", note: "4,9", price: 15000, chosen: true },
    { initials: "K", job: "Couturier", km: "1,5 km", note: "4,7", price: 14000, chosen: false },
    { initials: "S", job: "Styliste", km: "2,1 km", note: "4,6", price: 17000, chosen: false },
  ];
  return (
    <ul className="grid gap-2">
      {rows.map((r, i) => (
        <li
          key={r.initials}
          className={cn(
            "flex items-center gap-2.5 rounded-2xl border p-2 pr-2.5 animate-[pop-in_.5s_cubic-bezier(.22,1,.36,1)_both]",
            r.chosen ? "border-primary/40 bg-accent" : "border-border/70",
          )}
          style={{ animationDelay: `${1000 + i * 160}ms` }}
        >
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold", r.chosen ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>{r.initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-tight">{r.job} · {r.km}</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Star className="size-3 fill-amber-400 text-amber-400" /> {r.note} · {formatXOF(r.price)}
            </span>
          </span>
          {r.chosen ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white"><Check className="size-3" /> Choisi</span>
          ) : (
            <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Voir</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** 3 · Messagerie intégrée. */
function ChatStep() {
  return (
    <div className="grid gap-2 text-[13px]">
      <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 animate-[pop-in_.5s_cubic-bezier(.22,1,.36,1)_1.2s_both]">
        Bonjour, je suis disponible demain à 9&nbsp;h.
      </p>
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-white animate-[pop-in_.5s_cubic-bezier(.22,1,.36,1)_1.6s_both]">
        Parfait, à demain !
        <CheckCheck className="ml-1.5 inline size-3.5 text-green-200" />
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessageCircle className="size-3.5 text-primary" /> Messagerie intégrée, sans donner votre numéro
      </p>
    </div>
  );
}

/** 4 · Reçu de paiement, calculé avec la vraie règle de commission. */
function ReceiptStep() {
  const b = computeBreakdown(BUDGET);
  return (
    <div className="relative">
      <div aria-hidden className="jl-dots pointer-events-none absolute -inset-4 opacity-[0.07]" />
      <dl className="relative grid gap-1.5 text-[13px]">
        <div className="flex justify-between text-white/75"><dt>Montant convenu</dt><dd className="tabular-nums">{formatXOF(BUDGET)}</dd></div>
        <div className="flex justify-between text-white/75"><dt>Commission JOBLINK (5 %)</dt><dd className="tabular-nums">− {formatXOF(BUDGET - b.net)}</dd></div>
        <div className="mt-1 flex items-center justify-between border-t border-dashed border-white/25 pt-2.5 font-bold">
          <dt>Le travailleur reçoit</dt>
          <dd className="text-lg tabular-nums text-green-300">{formatXOF(b.net)}</dd>
        </div>
      </dl>
      <p className="relative mt-3 flex items-center gap-2 text-xs text-white/70">
        <span className="grid size-6 place-items-center rounded-full bg-green-400 text-primary-strong animate-[pop_.5s_cubic-bezier(.2,1.4,.4,1)_1.9s_both]"><BadgeCheck className="size-3.5" /></span>
        Mobile Money, seulement après validation
      </p>
    </div>
  );
}

/** Le téléphone : l'écran « Missions près de vous ». */
function Phone() {
  return (
    <div className="jl-rise relative mx-auto w-[min(19rem,100%)]" style={{ animationDelay: "350ms" }}>
      <div aria-hidden className="absolute -inset-x-10 -bottom-6 top-16 -z-10 rounded-full bg-primary/25 blur-3xl" />
      <div className="rounded-[2.9rem] bg-[#0c1f15] p-2.5 shadow-[0_40px_80px_-30px_rgb(20_83_45/0.55)] ring-1 ring-black/20">
        <div className="relative overflow-hidden rounded-[2.3rem] bg-[#f6faf7] text-left">
          <span aria-hidden className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0c1f15]" />

          {/* En-tête de l'application */}
          <div className="relative bg-primary-strong px-4 pb-4 pt-10 text-white">
            <div aria-hidden className="jl-dots pointer-events-none absolute inset-0 opacity-[0.08]" />
            <div className="relative flex items-center justify-between">
              <p className="font-logo text-sm font-extrabold tracking-tight">JOB<span className="text-green-300">LINK</span></p>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-semibold"><MapPin className="size-3" /> Cotonou · 5 km</span>
            </div>
            <p className="relative mt-3 text-[17px] font-extrabold leading-tight">Missions près de vous</p>
            <div className="relative mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-muted-foreground">
              <Search className="size-3.5" /> Plombier, couturier, ménage…
            </div>
          </div>

          {/* Métiers */}
          <div className="flex gap-1.5 overflow-hidden px-3 pt-3">
            {CHIPS.map((c, i) => (
              <Link
                key={c.slug}
                href={`/jobs?category=${c.slug}`}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  i === 0 ? "bg-primary text-white" : "bg-white text-foreground ring-1 ring-border hover:ring-primary/50",
                )}
              >
                <CategoryIcon name={c.icon} className="size-3" /> {c.label}
              </Link>
            ))}
          </div>

          {/* Annonces d'exemple */}
          <ul className="grid gap-2 p-3">
            {MISSIONS.map((m, i) => (
              <li
                key={m.title}
                className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-[0_1px_2px_rgb(17_24_39/0.05)] ring-1 ring-black/[0.04] animate-[pop-in_.55s_cubic-bezier(.22,1,.36,1)_both]"
                style={{ animationDelay: `${650 + i * 170}ms` }}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary-strong"><CategoryIcon name={m.icon} className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.cat}</span>
                    {m.isNew && <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-bold text-white">Nouveau</span>}
                  </span>
                  <span className="block truncate text-[13px] font-bold leading-snug">{m.title}</span>
                  <span className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">{m.place} · {m.km}</span>
                    <strong className="shrink-0 font-extrabold tabular-nums text-primary-strong">{formatXOF(m.budget)}</strong>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="pb-2 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">Aperçu illustratif</p>

          {/* Barre d'onglets */}
          <div className="flex items-end justify-around border-t border-border/70 bg-white px-2 pb-3 pt-2 text-[9px] font-semibold text-muted-foreground">
            <span className="grid place-items-center gap-0.5 text-primary"><House className="size-4" /> Accueil</span>
            <span className="grid place-items-center gap-0.5"><MapIcon className="size-4" /> Carte</span>
            <span className="-mt-6 grid size-11 place-items-center rounded-full bg-primary text-white shadow-[0_10px_20px_-8px_rgb(22_163_74/0.9)] ring-4 ring-white"><Plus className="size-5" /></span>
            <span className="grid place-items-center gap-0.5"><MessageCircle className="size-4" /> Messages</span>
            <span className="grid place-items-center gap-0.5"><UserRound className="size-4" /> Profil</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroScene() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid items-center gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_19rem_1fr] lg:gap-x-10 lg:gap-y-6">
        {/* Téléphone : en premier sur mobile, au centre sur grand écran */}
        <div className="sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Phone />
        </div>

        <StepCard n={1} title="Trouvez près de vous" side="left" delay={500} className="mx-auto lg:col-start-1 lg:row-start-1 lg:mx-0">
          <MapStep />
        </StepCard>
        <StepCard n={2} title="Comparez les candidatures" side="right" delay={600} className="mx-auto hidden sm:block lg:col-start-3 lg:row-start-1 lg:mx-0">
          <CandidatesStep />
        </StepCard>
        <StepCard n={3} title="Échangez en direct" side="left" delay={700} className="mx-auto hidden sm:block lg:col-start-1 lg:row-start-2 lg:mx-0">
          <ChatStep />
        </StepCard>
        <StepCard n={4} title="Payez après validation" side="right" delay={800} dark className="mx-auto lg:col-start-3 lg:row-start-2 lg:mx-0">
          <ReceiptStep />
        </StepCard>
      </div>

      <div className="jl-rise mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:1s]">
        <Link
          href="/client/jobs/new"
          prefetch={false}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_-10px_rgb(22_163_74/0.9)] transition-transform hover:-translate-y-0.5"
        >
          Publier une mission <ArrowUpRight className="size-4" />
        </Link>
        <Link href="/how-it-works" className="inline-flex items-center gap-1.5 rounded-full border bg-white px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary-strong">
          <Smartphone className="size-4" /> Comment ça marche
        </Link>
      </div>
    </div>
  );
}
