"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Affiche une sélection de sections, le reste se déploie en douceur sur « Voir plus ».
 * Le contenu est présent dans la page (accessible aux moteurs de recherche), simplement replié.
 */
export function ShowMore({ children, label = "Voir plus", lessLabel = "Voir moins" }: { children: React.ReactNode; label?: string; lessLabel?: string }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  // Lien direct /#decouvrir : ouvre automatiquement
  useEffect(() => {
    if (window.location.hash === "#decouvrir") setOpen(true);
  }, []);

  return (
    <>
      <div ref={anchor} id="decouvrir" className="relative">
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)]",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
          aria-hidden={!open}
          inert={!open}
        >
          <div className="min-h-0 overflow-hidden">{children}</div>
        </div>
      </div>

      <div className={cn("relative mx-auto flex max-w-7xl justify-center px-4 sm:px-6", open ? "pb-16" : "-mt-4 pb-20")}>
        {!open && <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-24 bg-gradient-to-b from-transparent to-white" />}
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (!next) anchor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          aria-expanded={open}
          aria-controls="decouvrir"
          className="group relative inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-7 py-3.5 text-sm font-semibold text-primary-strong shadow-[var(--shadow-lift)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white"
        >
          <span className="absolute inset-0 -z-10 rounded-full bg-primary/20 opacity-0 transition-opacity group-hover:opacity-100 group-hover:animate-ping" aria-hidden />
          {open ? lessLabel : label}
          <ChevronDown className={cn("size-4 transition-transform duration-500", open && "rotate-180")} />
        </button>
      </div>
    </>
  );
}
