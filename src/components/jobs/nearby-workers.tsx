"use client";

import { useState } from "react";
import { BadgeCheck, LocateFixed, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { BENIN_CITIES } from "@/lib/maps/places";
import { storagePublicUrl } from "@/lib/env";
import { NativeSelect } from "@/components/ui/native-select";

interface NearbyWorker {
  id: string;
  first_name: string;
  last_initial: string;
  avatar_url: string | null;
  neighborhood: string | null;
  city: string | null;
  headline: string | null;
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  distance_km: number;
  categories: string[];
}

/** Travailleurs proches : uniquement ceux ayant accepté d'apparaître (consentement show_on_map). */
export function NearbyWorkers() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [workers, setWorkers] = useState<NearbyWorker[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load(lat: number, lng: number) {
    setState("loading");
    try {
      const res = await fetch(`/api/workers/nearby?lat=${lat.toFixed(3)}&lng=${lng.toFixed(3)}&radius=20`);
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { workers: NearbyWorker[] };
      setWorkers(json.workers);
      setState("done");
    } catch {
      setState("error");
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setMessage("La géolocalisation n'est pas disponible : choisissez une ville.");
      return;
    }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => {
        setState("idle");
        setMessage("Localisation refusée : choisissez votre ville ci-dessous.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={locate} variant="outline" loading={state === "loading"}>
          <LocateFixed /> Utiliser ma position
        </Button>
        <div className="sm:w-56">
          <NativeSelect
            aria-label="Choisir une ville"
            defaultValue=""
            onChange={(e) => {
              const c = BENIN_CITIES.find((x) => x.name === e.target.value);
              if (c) load(c.lat, c.lng);
            }}
          >
            <option value="" disabled>
              Ou choisissez une ville
            </option>
            {BENIN_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {state === "loading" && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        {state === "error" && <p className="text-sm text-destructive">Impossible de charger les travailleurs. Réessayez.</p>}
        {state === "done" && workers.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun travailleur visible dans cette zone pour le moment.
          </p>
        )}
        {state === "done" &&
          workers.map((w) => (
            <div key={w.id} className="flex gap-3 rounded-xl border p-4">
              <Avatar className="size-11">
                {w.avatar_url && <AvatarImage src={storagePublicUrl("avatars", w.avatar_url) ?? undefined} alt="" />}
                <AvatarFallback>{w.first_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-medium">
                  {w.first_name} {w.last_initial}
                  {w.is_verified && <BadgeCheck className="size-4 text-primary" aria-label="Profil vérifié" />}
                </p>
                <p className="truncate text-sm text-muted-foreground">{w.headline ?? w.categories.join(", ")}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" /> ≈ {w.distance_km} km
                  </span>
                  {w.rating_count > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3 fill-amber-400 text-amber-400" /> {Number(w.rating_avg).toFixed(1)} ({w.rating_count})
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
