import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, UserPlus } from "lucide-react";
import { PHOTOS, type Photo } from "@/lib/media/photos";
import { cn } from "@/lib/utils";

const TILES: { photo: Photo; label: string; hint: string; href: string; className: string; position?: string }[] = [
  { photo: PHOTOS.carpenter, label: "Menuiserie", hint: "Meubles, portes, réparations", href: "/jobs?category=menuiserie", className: "sm:col-span-2 lg:row-span-2", position: "object-[40%_center]" },
  { photo: PHOTOS.electrician, label: "Électricité", hint: "Installation et dépannage", href: "/jobs?category=electricite", className: "" },
  { photo: PHOTOS.tailor, label: "Couture & mode", hint: "Retouches, tenues sur mesure", href: "/jobs?category=couture", className: "" },
  { photo: PHOTOS.builder, label: "Maçonnerie & BTP", hint: "Chantiers et petits travaux", href: "/jobs?category=maconnerie", className: "", position: "object-[50%_25%]" },
];

/** Mosaïque photo des savoir-faire. Photos d'illustration (Unsplash), liens vers les vraies missions par catégorie. */
export function TalentMosaic() {
  return (
    <div className="grid auto-rows-[220px] gap-3 sm:grid-cols-2 lg:h-[560px] lg:auto-rows-auto lg:grid-cols-4 lg:grid-rows-2">
      {TILES.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={cn("group relative isolate overflow-hidden rounded-[1.5rem] bg-muted ring-1 ring-black/5", t.className)}
        >
          <Image
            src={t.photo.src}
            alt={t.photo.alt}
            fill
            sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
            className={cn("-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-105", t.position)}
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2e1a]/85 via-[#0b2e1a]/15 to-transparent" />
          <div className="flex h-full flex-col justify-end p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-white">{t.label}</p>
                <p className="mt-0.5 text-sm text-white/80">{t.hint}</p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/95 text-primary-strong transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                <ArrowUpRight className="size-4" />
              </span>
            </div>
          </div>
        </Link>
      ))}
      <Link
        href="/register?type=worker"
        className="group relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] bg-primary p-6 text-white ring-1 ring-black/5"
      >
        <div aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-16 -left-6 size-44 rounded-full bg-primary-strong/40" />
        <span className="relative grid size-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
          <UserPlus className="size-5" />
        </span>
        <div className="relative">
          <p className="text-lg font-bold leading-snug text-white">Votre savoir-faire mérite d&apos;être trouvé.</p>
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-green-100">
            Devenir travailleur <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </p>
        </div>
      </Link>
    </div>
  );
}
