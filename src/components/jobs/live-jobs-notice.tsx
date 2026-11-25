"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

const POLL_MS = 30_000;

/**
 * « Nouvelles missions » en direct : interroge discrètement la recherche publique (réponse en cache CDN 30 s)
 * toutes les 30 s, uniquement quand l'onglet est visible. Si des missions plus récentes que celles affichées
 * apparaissent, un bouton propose de les afficher (rafraîchissement sans recharger la page).
 */
export function LiveJobsNotice({ newestCreatedAt }: { newestCreatedAt: string | null }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [pending, startTransition] = useTransition();
  const since = useRef(newestCreatedAt ? Date.parse(newestCreatedAt) : Date.now());

  useEffect(() => {
    since.current = newestCreatedAt ? Date.parse(newestCreatedAt) : Date.now();
    setCount(0);
  }, [newestCreatedAt]);

  useEffect(() => {
    let stopped = false;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/jobs/search?sort=recent&limit=20", { cache: "no-store" });
        if (!res.ok) return;
        const { jobs } = (await res.json()) as { jobs: { created_at: string }[] };
        const fresh = jobs.filter((j) => Date.parse(j.created_at) > since.current).length;
        if (!stopped) setCount(fresh);
      } catch {
        // réseau indisponible : on réessaiera au prochain tour
      }
    }
    const id = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (count === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
      <button
        type="button"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          startTransition(() => router.refresh());
        }}
        className="jl-live-pill pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)] ring-4 ring-primary/15 transition hover:brightness-110"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/80" />
            <span className="relative inline-flex size-2.5 rounded-full bg-white" />
          </span>
        )}
        {count} nouvelle{count > 1 ? "s" : ""} mission{count > 1 ? "s" : ""} — Afficher
        <ArrowUp className="size-4" aria-hidden />
      </button>
    </div>
  );
}
