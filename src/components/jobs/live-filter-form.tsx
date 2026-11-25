"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Formulaire de filtres « instantané » : les résultats se mettent à jour dès qu'un filtre change
 * (listes immédiatement, champs texte après une courte pause). Reste un vrai formulaire GET :
 * sans JavaScript ou sur réseau très lent, le bouton « Appliquer » fonctionne comme avant.
 */
export function LiveFilterForm({ action, className, children }: { action: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  // Grise les résultats pendant le chargement (zone marquée data-jl-results dans la page).
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-jl-results]");
    if (el) el.dataset.loading = pending ? "true" : "false";
  }, [pending]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function apply() {
    const form = formRef.current;
    if (!form) return;
    const sp = new URLSearchParams();
    for (const [k, v] of new FormData(form)) {
      const value = String(v).trim();
      if (value) sp.set(k, value);
    }
    const url = sp.size ? `${action}?${sp}` : action;
    startTransition(() => router.replace(url, { scroll: false }));
  }

  function onChange(e: React.FormEvent<HTMLFormElement>) {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    if (timer.current) clearTimeout(timer.current);
    // Listes : tout de suite ; saisie : après 450 ms sans frappe
    const delay = target.tagName === "SELECT" ? 0 : 450;
    timer.current = setTimeout(apply, delay);
  }

  return (
    <form
      ref={formRef}
      method="get"
      action={action}
      onChange={onChange}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className={cn("relative", className)}
      aria-busy={pending}
    >
      {children}
      <span
        className={cn(
          "pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity",
          pending ? "opacity-100" : "opacity-0",
        )}
        aria-live="polite"
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> {pending ? "Mise à jour…" : ""}
      </span>
    </form>
  );
}
