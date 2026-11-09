import Image from "next/image";
import { CalendarClock, Flame, MapPin, Sparkles, Users, Wifi } from "lucide-react";
import { CategoryIcon } from "@/components/layout/category-icon";
import { deadlineLabel, isNew, isUrgent } from "@/lib/jobs/signals";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export interface JobHeroProps {
  cover: { src: string; illustration: boolean; alt?: string; credit?: { author: string; url: string } };
  categoryName?: string;
  categoryIcon?: string;
  title: string;
  place: string;
  remote?: boolean;
  startDate?: string;
  deadline?: string;
  workersNeeded?: number;
  createdAt?: string;
  /** Contenu ajouté en haut à droite (statut, badges…) */
  aside?: React.ReactNode;
  /** Contenu ajouté sous les informations (boutons de partage…) */
  children?: React.ReactNode;
  /** Image locale (blob:) : pas d'optimisation Next */
  unoptimized?: boolean;
  className?: string;
  priority?: boolean;
  /** Niveau du titre (h1 sur la page de la mission, h2 dans le formulaire) */
  headingLevel?: "h1" | "h2";
}

/** Bannière d'annonce : image de la mission (ou illustration de la catégorie) en arrière-plan, titre en surimpression. */
export function JobHero({
  cover,
  categoryName,
  categoryIcon,
  title,
  place,
  remote,
  startDate,
  deadline,
  workersNeeded,
  createdAt,
  aside,
  children,
  unoptimized,
  className,
  priority,
  headingLevel = "h1",
}: JobHeroProps) {
  const Heading = headingLevel;
  const urgent = isUrgent(deadline);
  const fresh = isNew(createdAt);
  const countdown = deadlineLabel(deadline);
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-[1.75rem] bg-primary-strong text-white shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      <Image
        src={cover.src}
        alt={cover.alt ?? ""}
        fill
        priority={priority}
        unoptimized={unoptimized}
        sizes="(min-width: 1024px) 1100px, 100vw"
        className="-z-20 object-cover animate-[kenburns_14s_ease-out_both]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(11_46_26/0.94)_0%,rgb(11_46_26/0.78)_42%,rgb(11_46_26/0.25)_100%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2e1a]/80 via-transparent to-transparent" />
      <div aria-hidden className="jl-dots absolute inset-0 -z-10 opacity-[0.12] [mask-image:linear-gradient(to_right,#000,transparent_60%)]" />

      <div className={cn("flex min-h-[15rem] flex-col justify-end gap-4 p-5 sm:min-h-[17rem] sm:p-8", cover.illustration && "pb-8 sm:pb-10")}>
        <div className="flex flex-wrap items-center gap-2">
          {categoryName && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 py-1 pl-1 pr-3 text-xs font-semibold text-primary-strong shadow-sm">
              <span className="grid size-6 place-items-center rounded-full bg-primary text-white">
                <CategoryIcon name={categoryIcon} className="size-3.5" />
              </span>
              {categoryName}
            </span>
          )}
          {urgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950">
              <Flame className="size-3.5" aria-hidden /> Urgent
            </span>
          )}
          {fresh && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white ring-1 ring-white/30">
              <Sparkles className="size-3.5" aria-hidden /> Nouveau
            </span>
          )}
          {aside && <div className="ml-auto flex items-center gap-2">{aside}</div>}
        </div>

        <Heading
          className={cn(
            "max-w-3xl text-balance text-2xl font-extrabold leading-tight tracking-[-0.02em] text-white drop-shadow-sm sm:text-4xl",
            !title && "text-white/55",
          )}
        >
          {title || "Titre de votre mission"}
        </Heading>

        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/90">
          <li className="inline-flex items-center gap-1.5">
            {remote ? <Wifi className="size-4" /> : <MapPin className="size-4" />} {place}
          </li>
          {startDate && deadline && (
            <li className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4" /> Du {formatDate(startDate, "d MMM")} au {formatDate(deadline, "d MMM")}
              {countdown && <span className={cn("rounded-full px-2 py-px text-xs font-semibold", urgent ? "bg-amber-400 text-amber-950" : "bg-white/15")}>{countdown}</span>}
            </li>
          )}
          {workersNeeded !== undefined && workersNeeded > 1 && (
            <li className="inline-flex items-center gap-1.5"><Users className="size-4" /> {workersNeeded} personnes</li>
          )}
        </ul>

        {children}
      </div>

      {cover.illustration && (
        <p className="absolute bottom-2 right-3 text-[10px] text-white/60">
          Illustration{cover.credit && <> · <a href={cover.credit.url} target="_blank" rel="noopener noreferrer" className="hover:text-white">{cover.credit.author} / Unsplash</a></>}
        </p>
      )}
    </section>
  );
}
