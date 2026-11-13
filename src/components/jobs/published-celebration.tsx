"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Eye, X } from "lucide-react";
import { ShareButtons } from "./share-buttons";

const COLORS = ["#16A34A", "#86EFAC", "#FACC15", "#14532D", "#22C55E", "#FDE68A"];

/** Confettis CSS (désactivés si l'utilisateur préfère réduire les animations). */
function Confetti() {
  return (
    <div aria-hidden className="jl-motion pointer-events-none absolute inset-x-0 top-0 h-0">
      {Array.from({ length: 28 }).map((_, i) => {
        const left = (i * 37) % 100;
        const dx = ((i * 53) % 120) - 60;
        return (
          <span
            key={i}
            className="absolute top-0 block h-2.5 w-1.5 rounded-[2px] animate-[confetti_1.8s_cubic-bezier(.2,.7,.3,1)_both]"
            style={
              {
                left: `${left}%`,
                background: COLORS[i % COLORS.length],
                animationDelay: `${(i % 7) * 70}ms`,
                "--dx": `${dx}px`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/** Bandeau affiché juste après la publication d'une mission : félicitations + partage. */
export function PublishedCelebration({ jobId, title, url }: { jobId: string; title: string; url: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  if (!open) return null;

  function close() {
    setOpen(false);
    router.replace(pathname, { scroll: false });
  }

  return (
    <div
      role="status"
      className="jl-rise relative mb-6 overflow-hidden rounded-[1.5rem] border border-primary/25 bg-[radial-gradient(40rem_16rem_at_0%_0%,rgb(220_252_231)_0%,#fff_60%)] p-5 shadow-[var(--shadow-lift)] sm:p-6"
    >
      <Confetti />
      <button type="button" onClick={close} aria-label="Fermer" className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
        <X className="size-4" />
      </button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_-8px_rgb(22_163_74/0.7)] animate-[pop_.6s_cubic-bezier(.2,1.4,.4,1)_both]">
          <CheckCircle2 className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold tracking-tight text-primary-strong">Votre mission est en ligne !</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Les travailleurs proches de vous peuvent déjà la voir. Partagez-la pour recevoir des candidatures plus vite.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ShareButtons url={url} title={title} />
        <Link href={`/jobs/${jobId}`} className="inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-primary-strong hover:underline">
          <Eye className="size-4" /> Voir l&apos;annonce
        </Link>
      </div>
    </div>
  );
}
