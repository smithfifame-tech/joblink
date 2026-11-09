import Image from "next/image";
import type { Photo } from "@/lib/media/photos";
import { cn } from "@/lib/utils";

/** Bandeau photo pour les pages de contenu (titre en surimpression). */
export function PhotoBanner({
  photo,
  eyebrow,
  title,
  subtitle,
  position = "object-center",
  className,
}: {
  photo: Photo;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  position?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] ring-1 ring-black/5", className)}>
      <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 1280px) 1200px, 100vw" className={cn("-z-10 object-cover", position)} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b2e1a]/90 via-[#0b2e1a]/55 to-[#0b2e1a]/5" />
      <div className="flex min-h-[260px] flex-col justify-end p-7 sm:min-h-[340px] sm:p-12">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-300">{eyebrow}</p>}
        <h1 className="mt-2 max-w-2xl text-balance text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl text-pretty text-base text-white/85 sm:text-lg">{subtitle}</p>}
      </div>
      <a
        href={photo.authorUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-4 text-[10px] text-white/70 hover:text-white"
      >
        Photo : {photo.author} / Unsplash
      </a>
    </div>
  );
}
