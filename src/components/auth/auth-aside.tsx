"use client";

import { usePathname } from "next/navigation";
import { CheckCircle2, MapPin } from "lucide-react";
import { PHOTOS } from "@/lib/media/photos";
import { CATEGORY_PHOTOS } from "@/lib/media/category-photos";
import { PhotoCarousel, type Slide } from "./photo-carousel";
import { withRate } from "@/lib/payments/commission";

const VARIANTS: { match: (p: string) => boolean; slides: Slide[]; title: React.ReactNode; points: string[] }[] = [
  {
    match: (p) => p.startsWith("/register") || p.startsWith("/onboarding"),
    slides: [
      { photo: PHOTOS.carpenter, position: "object-[38%_center]" },
      { photo: PHOTOS.tailor, position: "object-[45%_center]" },
      { photo: PHOTOS.builder, position: "object-[60%_30%]" },
    ],
    title: <>Rejoignez la communauté <span className="text-green-300">JOBLINK.</span></>,
    points: ["Inscription gratuite en 2 minutes", "Clients et travailleurs de votre quartier", "Commission de {taux} uniquement sur les missions payées"],
  },
  {
    match: (p) => p.startsWith("/forgot-password") || p.startsWith("/reset-password") || p.startsWith("/check-email"),
    slides: [
      { photo: PHOTOS.electrician, position: "object-[60%_center]" },
      { photo: PHOTOS.ladder, position: "object-[50%_30%]" },
      { photo: CATEGORY_PHOTOS.informatique, position: "object-center" },
    ],
    title: <>Votre compte, <span className="text-green-300">en toute sécurité.</span></>,
    points: ["Mots de passe jamais stockés en clair", "Liens de réinitialisation à usage unique", "Vos données privées restent privées"],
  },
  {
    match: () => true,
    slides: [
      { photo: PHOTOS.womanPhone, position: "object-[50%_30%]" },
      { photo: PHOTOS.tailorPhone, position: "object-[40%_center]" },
      { photo: PHOTOS.market, position: "object-[50%_60%]" },
    ],
    title: <>Le travail près de vous, <span className="text-green-300">les opportunités à portée de main.</span></>,
    points: ["Publiez une mission gratuitement", "Des travailleurs de votre quartier", "Paiement Mobile Money après validation"],
  },
];

function useVariant() {
  const pathname = usePathname() ?? "/login";
  return VARIANTS.find((x) => x.match(pathname))!;
}

export function AuthAside({ rateLabel }: { rateLabel: string }) {
  const v = useVariant();
  return (
    <aside className="relative hidden p-4 lg:block">
      <div className="sticky top-4 isolate flex h-[calc(100dvh-2rem)] min-h-[560px] flex-col justify-between overflow-hidden rounded-[2rem] p-10 text-white shadow-[var(--shadow-lift)]">
        <PhotoCarousel slides={v.slides} priority sizes="50vw" controlsClassName="absolute inset-x-10 bottom-8 z-10 border-t border-white/15 pt-5" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2e1a] via-[#0b2e1a]/45 to-[#0b2e1a]/10" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#14532d]/15 mix-blend-multiply" />

        <p className="jl-rise inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold ring-1 ring-white/25 backdrop-blur">
          <MapPin className="size-3.5 text-green-300" aria-hidden /> Missions et services près de chez vous · Bénin
        </p>

        <div className="jl-rise max-w-lg pb-14 [animation-delay:200ms]">
          <p className="text-balance text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] text-white [word-spacing:0.04em]">{v.title}</p>
          <ul className="mt-7 grid gap-3 text-[15px] text-white/90">
            {v.points.map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <CheckCircle2 className="size-5 shrink-0 text-green-300" aria-hidden /> {withRate(t, rateLabel)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

/** Bandeau photo compact (mobile et tablette), avec le même diaporama. */
export function AuthMobileBanner() {
  const v = useVariant();
  return (
    <div className="relative isolate flex h-44 flex-col justify-end overflow-hidden rounded-[1.5rem] p-3 shadow-[var(--shadow-soft)] sm:h-52 lg:hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2e1a]/85 via-[#0b2e1a]/20 to-transparent" />
      <PhotoCarousel slides={v.slides} priority sizes="100vw" />
    </div>
  );
}
