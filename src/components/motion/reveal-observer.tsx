"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Observe tous les éléments marqués `data-reveal` (y compris ceux ajoutés plus tard)
 * et les fait apparaître en douceur lorsqu'ils entrent dans l'écran.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const show = (el: Element) => {
      const h = el as HTMLElement;
      h.dataset.reveal = "in";
      // Une fois l'apparition terminée, on retire l'attribut : les effets de survol reprennent la main.
      const delay = parseInt(getComputedStyle(h).getPropertyValue("--reveal-delay") || "0", 10) || 0;
      window.setTimeout(() => h.removeAttribute("data-reveal"), 950 + delay);
    };
    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll("[data-reveal]").forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    const scan = (root: ParentNode) =>
      root.querySelectorAll('[data-reveal]:not([data-reveal="in"])').forEach((el) => io.observe(el));
    scan(document);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && (n.matches("[data-reveal]") ? io.observe(n) : scan(n)));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}
