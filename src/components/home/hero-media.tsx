"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { SkipForward } from "lucide-react";
import type { Photo } from "@/lib/media/photos";
import { HERO_CLIPS, HERO_CLIP_SECONDS, HERO_VIDEO_TOTAL_SECONDS } from "@/lib/media/videos";
import { cn } from "@/lib/utils";

type Phase = "intro" | "video" | "photo";
type Quality = "sm" | "md" | "lg";

/**
 * Arrière-plan du hero : à chaque chargement de la page, un montage vidéo de 20 s
 * (5 passages de 4 s en fondu enchaîné), puis la photo revient en fondu avec son effet Ken Burns.
 *
 * - Pas de vidéo si l'utilisateur préfère réduire les animations, active l'économie de données
 *   ou a une connexion lente : la photo s'affiche directement.
 * - Si la vidéo ne démarre pas (réseau, lecture automatique bloquée), retour immédiat à la photo.
 * - Bouton « Passer la vidéo » ; les fichiers vidéo sont libérés une fois la photo affichée.
 */
export function HeroMedia({ photo }: { photo: Photo }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(-1); // index du dernier clip dont la source est chargée
  const [quality, setQuality] = useState<Quality>("md");
  const [released, setReleased] = useState(false);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;

  const toPhoto = useCallback(() => setPhase("photo"), []);

  // Démarrage : décide s'il faut jouer la vidéo, et dans quelle qualité.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slow = conn?.saveData === true || /(^|-)(2g|3g)$/.test(conn?.effectiveType ?? "");
    if (reduce || slow) {
      setPhase("photo");
      return;
    }
    const w = window.innerWidth;
    setQuality(w < 768 ? "sm" : w >= 1600 ? "lg" : "md");

    const begin = () => setLoaded(1); // premier clip + préchargement du suivant
    if (!document.hidden) {
      begin();
      return;
    }
    // Onglet ouvert en arrière-plan : on attend qu'il soit visible pour lancer la vidéo.
    const onVisible = () => {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", onVisible);
      begin();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const running = loaded >= 0;
  const isPhoto = phase === "photo";

  // Lecture du clip actif, passage au suivant après HERO_CLIP_SECONDS.
  useEffect(() => {
    if (!running || isPhoto) return;
    const v = refs.current[active];
    const clip = HERO_CLIPS[active];
    if (!v || !clip) return;
    setLoaded((l) => Math.max(l, active + 1));

    let done = false;
    let started = false;
    const next = () => {
      if (done) return;
      done = true;
      v.pause();
      if (active + 1 >= HERO_CLIPS.length) toPhoto();
      else setActive(active + 1);
    };
    const seek = () => {
      try {
        if (v.currentTime < clip.start) v.currentTime = clip.start;
      } catch {
        /* passage non positionnable : lecture depuis le début */
      }
    };
    const onPlaying = () => {
      started = true;
      if (phaseRef.current === "intro") setPhase("video");
    };
    const onTime = () => {
      if (v.currentTime >= clip.start + HERO_CLIP_SECONDS) next();
    };
    const onFail = () => {
      // Échec au tout début : on n'insiste pas, la photo prend le relais.
      if (phaseRef.current === "intro") toPhoto();
      else next();
    };

    v.muted = true;
    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });
    v.addEventListener("playing", onPlaying);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", next);
    v.addEventListener("error", onFail);
    v.play().catch(() => undefined); // lecture automatique refusée : le délai de garde prend le relais

    const watchdog = window.setTimeout(() => {
      if (!started) onFail();
    }, active === 0 ? 4500 : 3500);

    return () => {
      window.clearTimeout(watchdog);
      v.removeEventListener("loadedmetadata", seek);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", next);
      v.removeEventListener("error", onFail);
    };
  }, [active, running, isPhoto, toPhoto]);

  // Garde-fou global : jamais plus de ~20 s de vidéo (onglet masqué, mise en mémoire tampon…).
  useEffect(() => {
    if (phase !== "video") return;
    const t = window.setTimeout(toPhoto, (HERO_VIDEO_TOTAL_SECONDS + 6) * 1000);
    return () => window.clearTimeout(t);
  }, [phase, toPhoto]);

  // Une fois la photo affichée : arrêt des vidéos et libération des téléchargements.
  useEffect(() => {
    if (phase !== "photo") return;
    refs.current.forEach((v) => v?.pause());
    const t = window.setTimeout(() => setReleased(true), 1400);
    return () => window.clearTimeout(t);
  }, [phase]);

  const clip = HERO_CLIPS[active];
  const showVideoCredit = phase === "video" && clip;

  return (
    <>
      <div aria-hidden data-hero-media={phase} className="absolute inset-0 -z-30 overflow-hidden">
        <div
          data-hero-photo
          className={cn(
            "absolute inset-0 transition-opacity duration-[1200ms] ease-out",
            phase === "photo" ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={photo.src}
            alt=""
            fill
            sizes="100vw"
            className={cn("object-cover object-[50%_60%]", phase === "photo" && "animate-[kenburns_18s_ease-out_both]")}
          />
        </div>

        {!released && (
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-[1200ms] ease-out",
              phase === "video" ? "opacity-100" : "opacity-0",
            )}
          >
            {HERO_CLIPS.map((c, i) => (
              <video
                key={c.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                src={i <= loaded ? c.sources[quality] : undefined}
                preload={i <= loaded ? "auto" : "none"}
                muted
                playsInline
                disablePictureInPicture
                disableRemotePlayback
                tabIndex={-1}
                className={cn(
                  "absolute inset-0 size-full scale-[1.04] object-cover object-center transition-opacity duration-700 ease-out",
                  i === active ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
        )}
      </div>
      {/* Sans JavaScript : la photo s'affiche directement. */}
      <noscript>
        <style>{"[data-hero-photo]{opacity:1!important}"}</style>
      </noscript>

      <div className="absolute bottom-3 right-4 z-10 flex items-center gap-2">
        {phase === "video" && (
          <button
            type="button"
            onClick={toPhoto}
            className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur transition-colors hover:bg-black/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <SkipForward className="size-3" aria-hidden /> Passer la vidéo
          </button>
        )}
        <a
          href={showVideoCredit ? clip.pageUrl : photo.authorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] text-white/90 backdrop-blur hover:bg-black/45"
        >
          {showVideoCredit ? `Vidéo : ${clip.author} / Pexels` : `Photo : ${photo.author} / Unsplash`}
        </a>
      </div>
    </>
  );
}
