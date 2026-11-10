"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bouton « retour en haut », visible après un écran de défilement. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      aria-label="Revenir en haut de la page"
      tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-30 grid size-11 place-items-center rounded-full border bg-background text-primary-strong shadow-[var(--shadow-lift)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 lg:bottom-6 lg:right-6",
        show ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-5" />
    </button>
  );
}
