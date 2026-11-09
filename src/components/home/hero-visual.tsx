import { BadgeCheck, MapPin, Navigation, Smartphone, Wrench, Zap } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { computeBreakdown } from "@/lib/payments/commission";
import { formatXOF } from "@/lib/utils/format";

/**
 * Illustration du hero : une carte stylisée de quartier, l'épingle JOBLINK au centre,
 * et deux cartes d'exemple (mission et calcul de paiement). Purement décoratif :
 * aucune donnée n'est présentée comme réelle (les cartes sont étiquetées « Exemple »).
 */
export function HeroVisual() {
  const example = computeBreakdown(15000);
  return (
    <div aria-hidden className="relative mx-auto aspect-[1/1] w-full max-w-[540px] select-none">
      {/* Plateau de carte */}
      <div className="absolute inset-[6%] overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-br from-[#f0fdf4] via-white to-[#ecfdf3] shadow-[var(--shadow-lift)]">
        <div className="jl-grid absolute inset-0" />
        <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" preserveAspectRatio="none">
          {/* Routes */}
          <g fill="none" strokeLinecap="round">
            <path d="M-20 300 C 80 260, 140 280, 210 220 S 330 120, 420 140" stroke="#FFFFFF" strokeWidth="22" />
            <path d="M-20 300 C 80 260, 140 280, 210 220 S 330 120, 420 140" stroke="#DCFCE7" strokeWidth="2" strokeDasharray="8 10" />
            <path d="M120 -20 C 140 90, 90 170, 150 260 S 170 380, 140 420" stroke="#FFFFFF" strokeWidth="16" />
            <path d="M-20 90 C 90 110, 260 70, 420 60" stroke="#FFFFFF" strokeWidth="12" />
            <path d="M300 -20 C 280 120, 330 260, 300 420" stroke="#FFFFFF" strokeWidth="12" />
          </g>
          {/* Îlots / parcelles */}
          <g fill="#16A34A" opacity="0.07">
            <rect x="30" y="130" width="70" height="50" rx="10" />
            <rect x="200" y="290" width="80" height="60" rx="12" />
            <rect x="320" y="200" width="60" height="70" rx="12" />
            <rect x="180" y="100" width="70" height="40" rx="10" />
          </g>
          {/* Lagune stylisée */}
          <path d="M0 360 C 60 340, 120 380, 190 370 S 300 340, 400 370 L 400 400 L 0 400 Z" fill="#BBF7D0" opacity="0.45" />
        </svg>

        {/* Rayon de recherche */}
        <div className="absolute left-1/2 top-[52%] size-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25 bg-primary/[0.06]" />
        <div className="absolute left-1/2 top-[52%] size-[36%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/30" />

        {/* Épingle centrale */}
        <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-[78%] animate-float">
          <LogoMark className="size-24 drop-shadow-[0_12px_18px_rgb(20_83_45/0.35)] sm:size-28" />
        </div>

        {/* Prestataires (pastilles) */}
        {[
          { cls: "left-[20%] top-[28%]", icon: Wrench },
          { cls: "right-[18%] top-[30%]", icon: Zap },
          { cls: "left-[27%] bottom-[24%]", icon: Navigation },
        ].map(({ cls, icon: Icon }, i) => (
          <span key={i} className={`absolute ${cls} grid size-10 place-items-center rounded-full border-2 border-white bg-primary-strong text-white shadow-lg`}>
            <Icon className="size-4" />
          </span>
        ))}
      </div>

      {/* Carte « mission » d'exemple */}
      <div className="absolute left-0 top-0 hidden w-[54%] sm:block min-w-[210px] rounded-2xl border border-border/80 bg-white/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur sm:-left-[4%]">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-strong">Exemple</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> Ouverte
          </span>
        </div>
        <p className="mt-2.5 text-sm font-semibold leading-snug text-foreground">Réparer une fuite sous l&apos;évier</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" /> Plomberie · Akpakpa, Cotonou
        </p>
        <p className="mt-3 text-base font-bold tabular-nums text-primary-strong">{formatXOF(example.amount)}</p>
      </div>

      {/* Carte « paiement » d'exemple */}
      <div className="absolute bottom-0 right-0 w-[54%] min-w-[220px] rounded-2xl border border-border/80 bg-white/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur sm:-right-[3%]">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-white">
            <Smartphone className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-foreground">Paiement Mobile Money</p>
            <p className="text-[11px] text-muted-foreground">Après validation du travail</p>
          </div>
        </div>
        <dl className="mt-3 grid gap-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground"><dt>Commission (5 %)</dt><dd className="tabular-nums">− {formatXOF(example.commission)}</dd></div>
          <div className="flex justify-between font-semibold text-foreground"><dt className="flex items-center gap-1"><BadgeCheck className="size-3.5 text-primary" /> Net travailleur</dt><dd className="tabular-nums text-primary-strong">{formatXOF(example.net)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
