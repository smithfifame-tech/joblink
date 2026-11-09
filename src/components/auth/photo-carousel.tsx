"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Photo } from "@/lib/media/photos";
import { cn } from "@/lib/utils";

export interface Slide {
  photo: Photo;
  /** Cadrage object-position (classe Tailwind) */
  position?: string;
}

/**
 * Diaporama de fond (3 photos au maximum) : fondu enchaîné + effet Ken Burns, points de navigation
 * et crédit du photographe. Défilement automatique désactivé si l'utilisateur préfère réduire les
 * animations, et mis en pause quand l'onglet n'est pas visible.
 */
export function PhotoCarousel({
  slides: all,
  interval = 6000,
  sizes = "50vw",
  priority,
  controlsClassName,
  dark = true,
}: {
  slides: Slide[];
  interval?: number;
  sizes?: string;
  priority?: boolean;
  controlsClassName?: string;
  dark?: boolean;
}) {
  const slides = all.slice(0, 3);
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (slides.length < 2 || !auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => window.clearInterval(t);
  }, [slides.length, interval, auto]);

  const current = slides[index];
  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
        {slides.map((s, i) => (
          <div
            key={s.photo.src}
            className={cn("absolute inset-0 transition-opacity duration-[1400ms] ease-in-out", i === index ? "opacity-100" : "opacity-0")}
          >
            <Image
              // La clé change à chaque affichage : l'effet Ken Burns repart de zéro.
              key={i === index ? `on-${index}` : "off"}
              src={s.photo.src}
              alt=""
              fill
              priority={priority && i === 0}
              // Les 3 photos sont chargées d'emblée : le fondu ne passe jamais sur une image vide.
              loading={priority && i === 0 ? undefined : "eager"}
              sizes={sizes}
              className={cn("object-cover", s.position, i === index && "animate-[kenburns_9s_ease-out_both]")}
            />
          </div>
        ))}
      </div>

      {slides.length > 0 && (
        <div className={cn("flex items-center justify-between gap-3", controlsClassName)}>
          {slides.length > 1 ? (
            <div className="flex items-center gap-1.5" role="group" aria-label="Images d'illustration">
              {slides.map((s, i) => (
                <button
                  key={s.photo.src}
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setAuto(false);
                  }}
                  aria-label={`Image ${i + 1} sur ${slides.length}`}
                  aria-current={i === index}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    i === index ? "w-7" : "w-1.5",
                    dark ? (i === index ? "bg-white" : "bg-white/40 hover:bg-white/70") : i === index ? "bg-primary" : "bg-primary/30",
                  )}
                />
              ))}
            </div>
          ) : (
            <span />
          )}
          <a
            href={current.photo.authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("truncate text-[11px] transition-colors", dark ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground")}
          >
            Photo : {current.photo.author} / Unsplash
          </a>
        </div>
      )}
    </>
  );
}
