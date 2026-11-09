import Image from "next/image";
import { BadgeCheck, MapPin, Smartphone, Star } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { computeBreakdown } from "@/lib/payments/commission";
import { formatXOF } from "@/lib/utils/format";
import { PHOTOS } from "@/lib/media/photos";
import { cn } from "@/lib/utils";

const photo = PHOTOS.tailorPhone;

const FADE_MASK: React.CSSProperties = {
  maskImage: "linear-gradient(to right, transparent 42%, #000 64%), linear-gradient(to top, transparent 0%, #000 22%)",
  WebkitMaskImage: "linear-gradient(to right, transparent 42%, #000 64%), linear-gradient(to top, transparent 0%, #000 22%)",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

function MissionCard({ className }: { className?: string }) {
  const example = computeBreakdown(15000);
  return (
    <div className={cn("w-64 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-[var(--shadow-lift)] backdrop-blur-md", className)}>
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-strong">Exemple</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          Ouverte
        </span>
      </div>
      <p className="mt-2.5 text-sm font-semibold leading-snug text-foreground">Retouche de 3 tenues en pagne</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="size-3" /> Couture · Cadjèhoun, Cotonou
      </p>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-base font-bold tabular-nums text-primary-strong">{formatXOF(example.amount)}</p>
        <span className="text-[11px] text-muted-foreground">à 1,2 km</span>
      </div>
    </div>
  );
}

function PaymentCard({ className }: { className?: string }) {
  const example = computeBreakdown(15000);
  return (
    <div className={cn("w-60 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-[var(--shadow-lift)] backdrop-blur-md", className)}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-white shadow-[0_6px_14px_-4px_rgb(22_163_74/0.6)]">
          <Smartphone className="size-4" />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">Paiement Mobile Money</p>
          <p className="text-[11px] text-muted-foreground">Après validation du travail</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-dashed pt-3 text-xs">
        <span className="flex items-center gap-1 font-semibold text-foreground">
          <BadgeCheck className="size-3.5 text-primary" /> Net travailleur
        </span>
        <span className="font-bold tabular-nums text-primary-strong">{formatXOF(example.net)}</span>
      </div>
    </div>
  );
}

function Credit({ className }: { className?: string }) {
  return (
    <a
      href={photo.authorUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur hover:bg-black/50", className)}
    >
      Photo : {photo.author} / Unsplash
    </a>
  );
}

/** Grande photo d'arrière-plan du hero (desktop), fondue dans le blanc côté texte. */
export function HeroBackdrop() {
  return (
    <>
      {/* Calque photo pleine largeur, masqué : la photo n'occupe que la droite et se fond sans arête dans le fond. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden lg:block" style={FADE_MASK}>
        <div className="absolute inset-y-0 right-0 w-[60%]">
          <Image src={photo.src} alt="" fill priority sizes="60vw" className="object-cover object-[35%_center]" />
        </div>
      </div>

    <div className="absolute inset-y-0 right-0 -z-10 hidden w-[56%] lg:block">
      <div aria-hidden className="absolute inset-0">
        <MissionCard className="absolute left-[10%] top-[16%] animate-float" />
        <PaymentCard className="absolute bottom-[18%] right-[8%] animate-float [animation-delay:1.5s]" />
        <div className="absolute right-[10%] top-[12%] flex items-center gap-2 rounded-full border border-white/60 bg-white/85 py-1.5 pl-1.5 pr-3 shadow-lg backdrop-blur-md">
          <LogoMark className="size-7" />
          <span className="text-xs font-semibold text-primary-strong">Près de chez vous</span>
        </div>
        <div className="absolute bottom-[8%] left-[18%] flex items-center gap-1.5 rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md">
          <Star className="size-3.5 fill-amber-400 text-amber-400" /> Avis liés aux missions réalisées
        </div>
      </div>
      <Credit className="absolute bottom-3 right-3" />
    </div>
    </>
  );
}

/** Version mobile / tablette : photo arrondie sous le texte. */
export function HeroPhotoCard() {
  return (
    <div className="relative mt-10 lg:hidden">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] shadow-[var(--shadow-lift)] ring-1 ring-black/5">
        <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 640px) 90vw, 100vw" className="object-cover object-[30%_center]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#14532d]/45 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/90 py-1 pl-1 pr-3 shadow backdrop-blur">
          <LogoMark className="size-6" />
          <span className="text-xs font-semibold text-primary-strong">Près de chez vous</span>
        </div>
        <Credit className="absolute bottom-3 right-3" />
      </div>
      <PaymentCard className="relative -mt-12 ml-auto mr-3 sm:mr-6" />
    </div>
  );
}
