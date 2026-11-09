import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight, BadgeCheck, CalendarClock, Check, FilePlus2, MapPin, ShieldCheck, Smartphone, Sparkles, UserRoundCheck,
} from "lucide-react";
import { CategoryIcon } from "@/components/layout/category-icon";
import { PHOTOS } from "@/lib/media/photos";
import { CATEGORY_PHOTOS } from "@/lib/media/category-photos";
import { computeBreakdown } from "@/lib/payments/commission";
import { formatXOF } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/**
 * Vitrine du hero : une mosaïque (« bento ») qui montre le produit tel qu'il est —
 * une annonce en ticket, le paiement Mobile Money, les métiers et le parcours en 3 étapes.
 * Tout est statique (aucune rotation) : apparition en cascade puis légers mouvements au survol.
 * Les contenus marqués « Exemple » sont des illustrations, pas de vraies annonces.
 */

const EXAMPLE_BUDGET = 15000;

function Tile({ className, delay, children }: { className?: string; delay: number; children: React.ReactNode }) {
  return (
    <div
      className={cn("jl-rise relative overflow-hidden rounded-[1.6rem] shadow-[var(--shadow-soft)] ring-1 ring-black/5", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const NOTCH = (side: "0" | "100%"): React.CSSProperties => ({
  maskImage: `radial-gradient(circle 10px at ${side} calc(100% - 62px), transparent 9.5px, #000 10px)`,
  WebkitMaskImage: `radial-gradient(circle 10px at ${side} calc(100% - 62px), transparent 9.5px, #000 10px)`,
});

/** Annonce d'exemple, au même format « ticket » que les vraies cartes de mission. */
function TicketTile() {
  return (
    <div style={NOTCH("0")} className="h-full">
      <div style={NOTCH("100%")} className="grid h-full grid-cols-[38%_1fr] bg-white">
        <div className="relative">
          <Image src={PHOTOS.tailor.src} alt="" fill sizes="(min-width: 1024px) 220px, 40vw" className="object-cover object-[45%_center]" />
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/92 py-0.5 pl-0.5 pr-2 text-[10px] font-semibold text-primary-strong shadow-sm">
            <span className="grid size-4 place-items-center rounded-full bg-primary text-white"><CategoryIcon name="scissors" className="size-2.5" /></span>
            Couture
          </span>
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-strong">Exemple</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                <Sparkles className="size-3" aria-hidden /> Nouveau
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-foreground sm:text-base">Retouche de 3 tenues en pagne</p>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" /> Cadjèhoun, Cotonou · <strong className="font-semibold text-foreground">1,2 km</strong>
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700">
              <CalendarClock className="size-3.5 shrink-0" /> Clôture demain
            </p>
          </div>
          <div className="mx-[13px] flex h-[62px] items-center justify-between gap-2 border-t-2 border-dashed border-border px-1">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Budget</p>
              <p className="text-base font-extrabold tabular-nums text-primary-strong sm:text-lg">{formatXOF(EXAMPLE_BUDGET)}</p>
            </div>
            <span aria-hidden className="grid size-9 place-items-center rounded-full bg-accent text-primary-strong transition-all duration-300 group-hover/show:rotate-45 group-hover/show:bg-primary group-hover/show:text-white">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentTile() {
  const b = computeBreakdown(EXAMPLE_BUDGET);
  const steps = [
    { icon: BadgeCheck, text: "Le client valide le travail" },
    { icon: ShieldCheck, text: "Paiement Mobile Money sécurisé" },
    { icon: Check, text: `Le travailleur reçoit ${formatXOF(b.net)}` },
  ];
  return (
    <div className="flex h-full flex-col bg-primary-strong p-5 text-white">
      <div aria-hidden className="jl-dots pointer-events-none absolute inset-0 opacity-[0.08]" />
      <p className="relative flex items-center gap-2 text-sm font-bold">
        <span className="grid size-8 place-items-center rounded-xl bg-white/15"><Smartphone className="size-4" /></span>
        Paiement après validation
      </p>
      <ol className="relative mt-4 grid gap-2.5">
        {steps.map((s, i) => (
          <li key={s.text} className="flex items-center gap-2.5 text-[13px] text-white/90">
            <span
              className="grid size-6 shrink-0 place-items-center rounded-full bg-green-400 text-primary-strong animate-[pop_.5s_cubic-bezier(.2,1.4,.4,1)_both]"
              style={{ animationDelay: `${1100 + i * 350}ms` }}
            >
              <s.icon className="size-3.5" />
            </span>
            {s.text}
          </li>
        ))}
      </ol>
      <p className="relative mt-auto pt-3 text-[11px] text-white/60">Exemple sur {formatXOF(EXAMPLE_BUDGET)} · commission JOBLINK de 5 %</p>
    </div>
  );
}

const CATS = [
  { slug: "plomberie", name: "Plomberie", icon: "wrench" },
  { slug: "electricite", name: "Électricité", icon: "zap" },
  { slug: "menage", name: "Ménage", icon: "sparkles" },
  { slug: "livraison", name: "Livraison", icon: "bike" },
];

function CategoriesTile() {
  return (
    <div className="grid h-full grid-cols-2 gap-1.5 bg-white p-1.5">
      {CATS.map((c) => (
        <Link key={c.slug} href={`/jobs?category=${c.slug}`} className="group/cat relative isolate flex items-end overflow-hidden rounded-[1.1rem] p-2.5 text-white">
          <Image src={CATEGORY_PHOTOS[c.slug].src} alt="" fill sizes="160px" className="-z-20 object-cover transition-transform duration-500 group-hover/cat:scale-110" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent transition-colors group-hover/cat:from-primary-strong/90" />
          <span className="flex items-center gap-1.5 text-xs font-bold">
            <span className="grid size-5 place-items-center rounded-full bg-white/20 backdrop-blur"><CategoryIcon name={c.icon} className="size-3" /></span>
            {c.name}
          </span>
        </Link>
      ))}
    </div>
  );
}

function StepsTile() {
  const steps = [
    { icon: FilePlus2, title: "Publiez", text: "Votre besoin en 2 minutes" },
    { icon: UserRoundCheck, title: "Choisissez", text: "Un travailleur proche de vous" },
    { icon: BadgeCheck, title: "Payez", text: "Seulement après validation" },
  ];
  return (
    <div className="flex h-full flex-col justify-between bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-foreground">Comment ça marche</p>
        <Link href="/client/jobs/new" prefetch={false} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_-8px_rgb(22_163_74/0.8)] transition-transform hover:-translate-y-0.5">
          Publier une mission <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <ol className="relative mt-4 grid grid-cols-3 gap-3">
        {/* Ligne qui relie les étapes, tracée à l'apparition */}
        <svg aria-hidden className="absolute left-[16%] right-[16%] top-5 h-1 w-[68%] overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 2">
          <line x1="0" y1="1" x2="100" y2="1" stroke="#16a34a" strokeOpacity=".35" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" className="origin-left animate-[chart-reveal_1.4s_cubic-bezier(.22,1,.36,1)_.9s_both]" />
        </svg>
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex flex-col items-center text-center">
            <span
              className="grid size-10 place-items-center rounded-2xl bg-accent text-primary-strong ring-4 ring-white animate-[pop_.5s_cubic-bezier(.2,1.4,.4,1)_both]"
              style={{ animationDelay: `${700 + i * 250}ms` }}
            >
              <s.icon className="size-5" />
            </span>
            <p className="mt-2 text-sm font-bold">{i + 1}. {s.title}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PhotoTile() {
  const p = PHOTOS.electrician;
  return (
    <Link href="/jobs?category=electricite" className="group/photo relative isolate flex h-full flex-col justify-between p-4 text-white">
      <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 280px, 50vw" className="-z-20 object-cover object-[30%_center] transition-transform duration-700 group-hover/photo:scale-105" />
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2e1a]/90 via-[#0b2e1a]/20 to-transparent" />
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/92 py-1 pl-1 pr-2.5 text-[11px] font-semibold text-primary-strong shadow-sm">
        <span className="grid size-5 place-items-center rounded-full bg-primary text-white"><CategoryIcon name="zap" className="size-3" /></span>
        Électricité
      </span>
      <span>
        <span className="block text-lg font-extrabold leading-tight">Des pros près de chez vous</span>
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-green-200">
          Voir les missions <ArrowUpRight className="size-3.5 transition-transform group-hover/photo:translate-x-0.5 group-hover/photo:-translate-y-0.5" />
        </span>
        <span className="mt-1 block text-[9px] uppercase tracking-wider text-white/55">Illustration · {p.author} / Unsplash</span>
      </span>
    </Link>
  );
}

export function HeroShowcase() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12 lg:grid-rows-[214px_214px]">
        <Tile delay={350} className="col-span-1 min-h-[280px] lg:col-span-3 lg:row-span-2 lg:min-h-0">
          <PhotoTile />
        </Tile>
        <Link
          href="/jobs"
          aria-label="Voir les missions publiées"
          className="group/show order-first col-span-2 block min-h-[190px] rounded-[1.6rem] transition-transform duration-300 hover:-translate-y-1 [filter:drop-shadow(0_1px_1px_rgb(17_24_39/0.06))_drop-shadow(0_12px_24px_rgb(20_83_45/0.12))] lg:order-none lg:col-span-6 lg:min-h-0"
        >
          <div className="jl-rise h-full overflow-hidden rounded-[1.6rem]" style={{ animationDelay: "450ms" }}>
            <TicketTile />
          </div>
        </Link>
        <Tile delay={550} className="col-span-1 min-h-[280px] lg:col-span-3 lg:min-h-0">
          <PaymentTile />
        </Tile>
        <Tile delay={650} className="col-span-2 hidden min-h-[200px] sm:block lg:col-span-4 lg:min-h-0">
          <CategoriesTile />
        </Tile>
        <Tile delay={750} className="col-span-2 min-h-[190px] lg:col-span-5 lg:min-h-0">
          <StepsTile />
        </Tile>
      </div>
    </div>
  );
}
