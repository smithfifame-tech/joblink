import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarClock, Flame, MapPin, Sparkles, Users, Wifi } from "lucide-react";
import { CategoryIcon } from "@/components/layout/category-icon";
import { PAY_TYPE_LABEL } from "./status-badge";
import { storagePublicUrl } from "@/lib/env";
import { categoryPhoto } from "@/lib/media/category-photos";
import { deadlineLabel, isNew, isUrgent } from "@/lib/jobs/signals";
import { formatDate, formatDistanceKm, formatRelative, formatXOF, readableCase, truncate } from "@/lib/utils/format";
import type { PayType, WorkMode } from "@/types/db";
import { cn } from "@/lib/utils";

export interface JobCardData {
  id: string;
  title: string;
  description: string;
  category_name: string;
  category_icon: string;
  category_slug?: string;
  budget_amount: number;
  pay_type: PayType;
  city: string;
  neighborhood: string;
  work_mode: WorkMode;
  deadline: string;
  workers_needed: number;
  applications_count: number;
  created_at: string;
  distance_km?: number | null;
  cover_image?: string | null;
}

/** Hauteur du talon du ticket (zone budget) : les encoches sont alignées dessus. */
const STUB = 68;
// Deux masques imbriqués (un par encoche) : pas de dépendance à mask-composite.
const NOTCH_L: React.CSSProperties = {
  maskImage: `radial-gradient(circle 11px at 0 calc(100% - ${STUB}px), transparent 10.5px, #000 11px)`,
  WebkitMaskImage: `radial-gradient(circle 11px at 0 calc(100% - ${STUB}px), transparent 10.5px, #000 11px)`,
};
const NOTCH_R: React.CSSProperties = {
  maskImage: `radial-gradient(circle 11px at 100% calc(100% - ${STUB}px), transparent 10.5px, #000 11px)`,
  WebkitMaskImage: `radial-gradient(circle 11px at 100% calc(100% - ${STUB}px), transparent 10.5px, #000 11px)`,
};

/** Image de la mission : photo du client, sinon illustration de la catégorie (signalée comme telle). */
export function jobCover(job: Pick<JobCardData, "cover_image" | "category_slug" | "category_icon">) {
  const own = storagePublicUrl("job-images", job.cover_image);
  if (own) return { src: own, illustration: false as const, alt: "" };
  const p = categoryPhoto(job.category_slug, job.category_icon);
  return { src: p.src, illustration: true as const, alt: p.alt };
}

function Signals({ job, className }: { job: JobCardData; className?: string }) {
  const urgent = isUrgent(job.deadline);
  const fresh = isNew(job.created_at);
  if (!urgent && !fresh) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {urgent && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-amber-950 shadow-sm">
          <Flame className="size-3" aria-hidden /> Urgent
        </span>
      )}
      {fresh && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
          <Sparkles className="size-3" aria-hidden /> Nouveau
        </span>
      )}
    </div>
  );
}

export function JobCard({
  job,
  href,
  active,
  compact,
  preview,
  coverOverride,
}: {
  job: JobCardData;
  href?: string;
  active?: boolean;
  compact?: boolean;
  /** Aperçu (formulaire de publication) : pas de lien */
  preview?: boolean;
  coverOverride?: { src: string; illustration: boolean; alt?: string };
}) {
  const cover = coverOverride ? { alt: "", ...coverOverride } : jobCover(job);
  const localImage = cover.src.startsWith("blob:");
  const distance = formatDistanceKm(job.distance_km);
  const place = job.work_mode === "remote" ? "À distance" : `${job.neighborhood}, ${job.city}`;
  const countdown = deadlineLabel(job.deadline);
  const link = href ?? `/jobs/${job.id}`;

  if (compact) {
    return (
      <Link
        href={link}
        className={cn(
          "group flex h-full gap-3 rounded-2xl border border-border/80 bg-card p-2.5 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]",
          active && "border-primary ring-2 ring-primary/15",
        )}
      >
        <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
          <Image src={cover.src} alt="" fill sizes="96px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
          <span className="absolute bottom-1 left-1 grid size-6 place-items-center rounded-full bg-white/90 text-primary shadow-sm">
            <CategoryIcon name={job.category_icon} className="size-3.5" />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-0.5 pr-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{job.category_name}</p>
            {isUrgent(job.deadline) && <Flame className="size-3 shrink-0 text-amber-500" aria-label="Urgent" />}
          </div>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary-strong">{readableCase(job.title)}</h3>
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            {job.work_mode === "remote" ? <Wifi className="size-3 shrink-0" /> : <MapPin className="size-3 shrink-0" />}
            <span className="truncate">{place}</span>
            {distance && <strong className="shrink-0 font-medium text-foreground">· {distance}</strong>}
          </p>
          <p className="mt-auto pt-1 text-sm font-bold tabular-nums text-primary-strong">
            {formatXOF(job.budget_amount)}
            {job.pay_type !== "fixed" && <span className="text-[11px] font-normal text-muted-foreground"> {PAY_TYPE_LABEL[job.pay_type]}</span>}
          </p>
        </div>
      </Link>
    );
  }

  const Root = (preview ? "div" : Link) as React.ElementType;
  return (
    <Root
      {...(preview ? {} : { href: link })}
      data-job-card
      className={cn(
        "group block h-full rounded-[1.4rem] transition-[transform,filter] duration-300 ease-out hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
        "[filter:drop-shadow(0_1px_1px_rgb(17_24_39/0.06))_drop-shadow(0_10px_22px_rgb(20_83_45/0.09))]",
        "hover:[filter:drop-shadow(0_1px_1px_rgb(17_24_39/0.08))_drop-shadow(0_18px_32px_rgb(20_83_45/0.16))]",
        active && "[filter:drop-shadow(0_0_1.5px_#16a34a)_drop-shadow(0_0_1.5px_#16a34a)_drop-shadow(0_10px_22px_rgb(20_83_45/0.12))]",
      )}
    >
      <div style={NOTCH_L} className="h-full">
        <div style={NOTCH_R} className="flex h-full flex-col overflow-hidden rounded-[1.4rem] bg-card">
          {/* Couverture */}
          <div className="relative aspect-[16/9] overflow-hidden bg-muted">
            <Image
              src={cover.src}
              alt={cover.alt}
              fill
              unoptimized={localImage}
              sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0b2e1a]/80 via-[#0b2e1a]/15 to-black/10" />
            <span className="absolute left-3 top-3 inline-flex max-w-[60%] items-center gap-1.5 rounded-full bg-white/92 py-1 pl-1 pr-2.5 text-[11px] font-semibold text-primary-strong shadow-sm backdrop-blur">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-white">
                <CategoryIcon name={job.category_icon} className="size-3" />
              </span>
              <span className="truncate">{job.category_name}</span>
            </span>
            <Signals job={job} className="absolute right-3 top-3 justify-end" />
            <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2 text-white">
              <span className="inline-flex min-w-0 items-center gap-1 text-xs font-medium drop-shadow">
                {job.work_mode === "remote" ? <Wifi className="size-3.5 shrink-0" /> : <MapPin className="size-3.5 shrink-0" />}
                <span className="truncate">{place}</span>
                {distance && <strong className="shrink-0 rounded-full bg-white/20 px-1.5 py-px text-[11px] font-semibold backdrop-blur">{distance}</strong>}
              </span>
              {cover.illustration && <span className="shrink-0 text-[9px] uppercase tracking-wider text-white/70">Illustration</span>}
            </div>
          </div>

          {/* Corps */}
          <div className="flex flex-1 flex-col px-5 pb-4 pt-4">
            <h3 className="line-clamp-2 text-[1.05rem] font-bold leading-snug tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary-strong">
              {readableCase(job.title)}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{truncate(readableCase(job.description), 160)}</p>
            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3.5 text-xs text-muted-foreground">
              <span className={cn("inline-flex items-center gap-1", countdown && isUrgent(job.deadline) && "font-semibold text-amber-700")}>
                <CalendarClock className="size-3.5" /> {countdown ?? (job.deadline ? `Avant le ${formatDate(job.deadline, "d MMM")}` : "Date limite à définir")}
              </span>
              {job.workers_needed > 1 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" /> {job.workers_needed} personnes
                </span>
              )}
              <span className="ml-auto">{formatRelative(job.created_at)}</span>
            </div>
          </div>

          {/* Talon du ticket */}
          <div style={{ height: STUB }} className="relative mx-[15px] flex items-center justify-between gap-3 border-t-2 border-dashed border-border">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {job.applications_count > 0 ? `${job.applications_count} candidat${job.applications_count > 1 ? "s" : ""} · Budget` : "Budget"}
              </p>
              <p className="truncate text-lg font-extrabold tabular-nums tracking-tight text-primary-strong">
                {formatXOF(job.budget_amount)}
                {job.pay_type !== "fixed" && <span className="text-xs font-medium text-muted-foreground"> {PAY_TYPE_LABEL[job.pay_type]}</span>}
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-primary-strong transition-all duration-300 group-hover:rotate-45 group-hover:bg-primary group-hover:text-white"
            >
              <ArrowUpRight className="size-5" />
            </span>
          </div>
        </div>
      </div>
    </Root>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.4rem] border bg-card">
      <div className="aspect-[16/9] animate-pulse bg-muted" />
      <div className="space-y-2 p-5">
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="mx-4 flex items-center justify-between border-t-2 border-dashed py-4">
        <div className="h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="size-10 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
