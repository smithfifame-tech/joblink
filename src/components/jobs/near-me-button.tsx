"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LocateFixed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Ajoute la position approximative du navigateur à la recherche (mode dégradé : saisie manuelle de la ville). */
export function NearMeButton() {
  const router = useRouter();
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);
  const active = sp.has("lat") && sp.has("lng");

  function apply(lat?: number, lng?: number) {
    const next = new URLSearchParams(sp.toString());
    next.delete("page");
    if (lat === undefined || lng === undefined) {
      next.delete("lat");
      next.delete("lng");
      next.delete("radius");
      if (next.get("sort") === "distance") next.delete("sort");
    } else {
      next.set("lat", lat.toFixed(3));
      next.set("lng", lng.toFixed(3));
      if (!next.get("radius")) next.set("radius", "10");
      next.set("sort", "distance");
    }
    router.push(`/jobs?${next}`);
  }

  if (active) {
    return (
      <Button type="button" variant="secondary" onClick={() => apply()}>
        <X /> Retirer ma position
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      loading={loading}
      onClick={() => {
        if (!("geolocation" in navigator)) return toast.error("Géolocalisation indisponible : indiquez votre ville.");
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          (p) => {
            setLoading(false);
            apply(p.coords.latitude, p.coords.longitude);
          },
          () => {
            setLoading(false);
            toast.info("Localisation refusée. Vous pouvez filtrer par ville ou quartier.");
          },
          { timeout: 10000, maximumAge: 600000 },
        );
      }}
    >
      <LocateFixed /> Près de moi
    </Button>
  );
}
