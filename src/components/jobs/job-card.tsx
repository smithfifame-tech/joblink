import Link from "next/link";
import Image from "next/image";
import { CalendarClock, MapPin, Users, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/layout/category-icon";
import { PAY_TYPE_LABEL } from "./status-badge";
import { storagePublicUrl } from "@/lib/env";
import { formatDate, formatDistanceKm, formatRelative, formatXOF, truncate } from "@/lib/utils/format";
import type { PayType, WorkMode } from "@/types/db";
import { cn } from "@/lib/utils";

export interface JobCardData {
  id: string;
  title: string;
  description: string;
  category_name: string;
  category_icon: string;
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

export function JobCard({ job, href, active, compact }: { job: JobCardData; href?: string; active?: boolean; compact?: boolean }) {
  const img = storagePublicUrl("job-images", job.cover_image);
  const distance = formatDistanceKm(job.distance_km);
  return (
    <Link
      href={href ?? `/jobs/${job.id}`}
      className={cn(
        "group flex h-full flex-col rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-5",
        active && "border-primary ring-2 ring-primary/15",
      )}
    >
      <div className="flex items-start gap-3">
        {img ? (
          <Image src={img} alt="" width={48} height={48} className="size-12 shrink-0 rounded-lg object-cover" loading="lazy" />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent text-primary">
            <CategoryIcon name={job.category_icon} className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{job.category_name}</p>
          <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug group-hover:text-primary-strong">{job.title}</h3>
        </div>
      </div>
      {!compact && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{truncate(job.description, 160)}</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {job.work_mode === "remote" ? <Wifi className="size-3.5" /> : <MapPin className="size-3.5" />}
          {job.work_mode === "remote" ? "À distance" : `${job.neighborhood}, ${job.city}`}
          {distance && <strong className="ml-1 font-medium text-foreground">{distance}</strong>}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="size-3.5" /> Avant le {formatDate(job.deadline, "d MMM")}
        </span>
        {job.workers_needed > 1 && (
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> {job.workers_needed} personnes
          </span>
        )}
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-4">
        <p className="text-lg font-semibold text-primary-strong tabular-nums">
          {formatXOF(job.budget_amount)}
          {job.pay_type !== "fixed" && <span className="text-xs font-normal text-muted-foreground"> {PAY_TYPE_LABEL[job.pay_type]}</span>}
        </p>
        <div className="flex items-center gap-2">
          {job.applications_count > 0 && <Badge variant="secondary">{job.applications_count} candidat{job.applications_count > 1 ? "s" : ""}</Badge>}
          <span className="text-xs text-muted-foreground">{formatRelative(job.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="rounded-xl border p-5">
      <div className="flex gap-3">
        <div className="size-12 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 h-3 w-full animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-5 w-28 animate-pulse rounded bg-muted" />
    </div>
  );
}
