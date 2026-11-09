"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { PHOTOS, type Photo } from "@/lib/media/photos";

const VARIANTS: { match: (p: string) => boolean; photo: Photo; position: string; title: React.ReactNode; points: string[] }[] = [
  {
    match: (p) => p.startsWith("/register"),
    photo: PHOTOS.carpenter,
    position: "object-[38%_center]",
    title: <>Rejoignez la communauté <span className="text-green-300">JOBLINK.</span></>,
    points: ["Inscription gratuite en 2 minutes", "Clients et travailleurs de votre quartier", "Commission de 5 % uniquement sur les missions payées"],
  },
  {
    match: (p) => p.startsWith("/forgot-password") || p.startsWith("/reset-password") || p.startsWith("/check-email"),
    photo: PHOTOS.electrician,
    position: "object-[60%_center]",
    title: <>Votre compte, <span className="text-green-300">en toute sécurité.</span></>,
    points: ["Mots de passe jamais stockés en clair", "Liens de réinitialisation à usage unique", "Vos données privées restent privées"],
  },
  {
    match: () => true,
    photo: PHOTOS.womanPhone,
    position: "object-[50%_30%]",
    title: <>Le travail près de vous, <span className="text-green-300">les opportunités à portée de main.</span></>,
    points: ["Publiez une mission gratuitement", "Des travailleurs de votre quartier", "Paiement Mobile Money après validation"],
  },
];

export function AuthAside() {
  const pathname = usePathname() ?? "/login";
  const v = VARIANTS.find((x) => x.match(pathname))!;
  return (
    <aside className="relative hidden p-4 lg:block">
      <div className="relative isolate flex h-full min-h-[640px] flex-col justify-between overflow-hidden rounded-[2rem] p-10 text-white shadow-[var(--shadow-lift)]">
        <Image src={v.photo.src} alt={v.photo.alt} fill priority sizes="50vw" className={`-z-10 object-cover ${v.position}`} />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2e1a] via-[#0b2e1a]/45 to-[#0b2e1a]/10" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#14532d]/15 mix-blend-multiply" />

        <Link href="/" className="flex w-fit items-center gap-2 rounded-full bg-white/90 py-1.5 pl-1.5 pr-4 shadow-lg backdrop-blur" aria-label="JOBLINK — accueil">
          <LogoMark className="size-8" />
          <span className="font-logo text-lg font-extrabold leading-none tracking-tight">
            <span className="text-primary-strong">JOB</span>
            <span className="text-primary">LINK</span>
          </span>
        </Link>

        <div className="max-w-lg">
          <p className="text-balance text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] text-white [word-spacing:0.04em]">{v.title}</p>
          <ul className="mt-7 grid gap-3 text-[15px] text-white/90">
            {v.points.map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <CheckCircle2 className="size-5 shrink-0 text-green-300" aria-hidden /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/15 pt-5 text-xs text-white/70">
            <span>Lancé au Bénin · Paiements en FCFA</span>
            <a href={v.photo.authorUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
              Photo : {v.photo.author} / Unsplash
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Bandeau photo compact pour mobile et tablette. */
export function AuthMobileBanner() {
  const pathname = usePathname() ?? "/login";
  const v = VARIANTS.find((x) => x.match(pathname))!;
  return (
    <div className="relative isolate h-40 overflow-hidden rounded-[1.5rem] shadow-[var(--shadow-soft)] sm:h-48 lg:hidden">
      <Image src={v.photo.src} alt={v.photo.alt} fill priority sizes="100vw" className={`-z-10 object-cover ${v.position}`} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2e1a]/80 via-[#0b2e1a]/20 to-transparent" />
      <Link href="/" className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/90 py-1 pl-1 pr-3 shadow backdrop-blur" aria-label="JOBLINK — accueil">
        <LogoMark className="size-7" />
        <span className="font-logo text-base font-extrabold leading-none tracking-tight">
          <span className="text-primary-strong">JOB</span>
          <span className="text-primary">LINK</span>
        </span>
      </Link>
      <a href={v.photo.authorUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-3 text-[10px] text-white/80">
        Photo : {v.photo.author} / Unsplash
      </a>
    </div>
  );
}
