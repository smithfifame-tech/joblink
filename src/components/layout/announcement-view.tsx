import Link from "next/link";
import { ArrowRight, CircleCheck, Megaphone, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AnnouncementTone = "info" | "success" | "warning";
export type Announcement = { message: string; tone: AnnouncementTone; link_url: string | null; link_label: string | null; updated_at?: string };

const TONES: Record<AnnouncementTone, { wrap: string; icon: typeof Megaphone }> = {
  info: { wrap: "bg-primary-strong text-white", icon: Megaphone },
  success: { wrap: "bg-primary text-white", icon: CircleCheck },
  warning: { wrap: "bg-amber-100 text-amber-950", icon: TriangleAlert },
};

/** Bandeau d'annonce (affichage seul) : utilisé sur le site et pour l'aperçu dans le tableau de bord. */
export function AnnouncementView({ a, onClose, className }: { a: Announcement; onClose?: () => void; className?: string }) {
  const t = TONES[a.tone] ?? TONES.info;
  return (
    <div role="status" className={cn("relative text-sm", t.wrap, className)}>
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-3 gap-y-1 px-11 py-2.5 text-center sm:px-14">
        <p className="text-pretty font-medium">
          <t.icon aria-hidden className="mr-2 inline size-4 -translate-y-px" />
          {a.message}
          {a.link_url && (
            <Link href={a.link_url} className="ml-2 inline-flex items-center gap-1 font-bold underline decoration-2 underline-offset-4">
              {a.link_label || "En savoir plus"} <ArrowRight className="size-3.5" />
            </Link>
          )}
        </p>
      </div>
      {onClose && (
        <button type="button" aria-label="Fermer l'annonce" onClick={onClose} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full opacity-80 transition hover:bg-black/10 hover:opacity-100 sm:right-4">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
