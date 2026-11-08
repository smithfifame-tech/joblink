"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { setLocationAction } from "@/lib/actions/profile";
import { BENIN_CITIES } from "@/lib/maps/places";
import { formatRelative } from "@/lib/utils/format";

export function LocationSetter({ current }: { current: { city: string | null; neighborhood: string | null; source: string; updated_at: string } | null }) {
  const [loading, setLoading] = useState(false);
  async function save(lat: number, lng: number, source: "gps" | "manual", city?: string) {
    setLoading(true);
    const res = await setLocationAction({ lat, lng, source, city });
    setLoading(false);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.error);
    }
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {current ? `Position enregistrée (${current.source === "gps" ? "GPS" : "manuelle"}${current.city ? `, ${current.city}` : ""}) ${formatRelative(current.updated_at)}.` : "Aucune position enregistrée."} Seule une zone d&apos;environ 1 km est utilisée publiquement.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" loading={loading} onClick={() => {
          if (!("geolocation" in navigator)) return toast.error("Géolocalisation indisponible.");
          navigator.geolocation.getCurrentPosition(
            (p) => save(p.coords.latitude, p.coords.longitude, "gps"),
            () => toast.info("Localisation refusée : choisissez votre ville."),
            { timeout: 10000 },
          );
        }}><LocateFixed /> Utiliser ma position</Button>
        <div className="sm:w-56">
          <NativeSelect aria-label="Choisir ma ville" defaultValue="" onChange={(e) => {
            const c = BENIN_CITIES.find((x) => x.name === e.target.value);
            if (c) void save(c.lat, c.lng, "manual", c.name);
          }}>
            <option value="" disabled>Ou choisir ma ville</option>
            {BENIN_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}
