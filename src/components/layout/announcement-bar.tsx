"use client";

import { useEffect, useState } from "react";
import { AnnouncementView, type Announcement } from "./announcement-view";

const KEY = "jl_announcement_closed";

/** Charge l'annonce du site (si le propriétaire en a publié une) ; le visiteur peut la fermer. */
export function AnnouncementBar() {
  const [a, setA] = useState<Announcement | null>(null);
  useEffect(() => {
    let stop = false;
    fetch("/api/announcement")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { announcement: Announcement | null } | null) => {
        const ann = j?.announcement;
        if (stop || !ann?.message) return;
        let closed: string | null = null;
        try {
          closed = window.localStorage.getItem(KEY);
        } catch {
          /* stockage indisponible */
        }
        if (closed !== (ann.updated_at ?? ann.message)) setA(ann);
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, []);
  if (!a) return null;
  const close = () => {
    try {
      window.localStorage.setItem(KEY, a.updated_at ?? a.message);
    } catch {
      /* ignoré */
    }
    setA(null);
  };
  return <AnnouncementView a={a} onClose={close} className="animate-[fade-in_.4s_ease-out_both]" />;
}
