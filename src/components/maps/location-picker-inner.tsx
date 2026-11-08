"use client";

import { useState } from "react";
import type { Marker as LeafletMarker } from "leaflet";
import { Marker } from "react-leaflet";
import { LocateFixed, Search } from "lucide-react";
import { toast } from "sonner";
import { BaseMap, FlyTo, MapEvents, markerIcon } from "./leaflet-base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_CENTER } from "@/lib/maps/places";

type Point = { lat: number; lng: number };

/** Sélection d'un point sur la carte : clic, géolocalisation ou recherche d'adresse (Nominatim/OSM). */
export default function LocationPickerInner({ value, onChange }: { value: Point | null; onChange: (p: Point) => void }) {
  const [fly, setFly] = useState<Point | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  async function geocode() {
    if (query.trim().length < 3) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=bj,tg,ng,ne,bf&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { Accept: "application/json", "Accept-Language": "fr" } });
      const json = (await res.json()) as { lat: string; lon: string }[];
      if (!json[0]) return toast.info("Adresse introuvable. Cliquez directement sur la carte.");
      const p = { lat: Number(json[0].lat), lng: Number(json[0].lon) };
      onChange(p);
      setFly(p);
    } catch {
      toast.error("Recherche d'adresse indisponible. Cliquez sur la carte.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex flex-col gap-2 border-b p-2 sm:flex-row">
        <div className="flex flex-1 gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void geocode();
              }
            }}
            placeholder="Rechercher un lieu (ex. Carrefour Cadjèhoun, Cotonou)"
            aria-label="Rechercher un lieu"
          />
          <Button type="button" variant="outline" size="icon" onClick={geocode} loading={searching} aria-label="Rechercher">
            {!searching && <Search />}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (pos) => {
                const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                onChange(p);
                setFly(p);
              },
              () => toast.info("Localisation refusée. Cliquez sur la carte pour placer la mission."),
              { enableHighAccuracy: true, timeout: 10000 },
            )
          }
        >
          <LocateFixed /> Ma position
        </Button>
      </div>
      <BaseMap center={value ?? DEFAULT_CENTER} zoom={value ? 15 : 12} className="h-72 w-full">
        <FlyTo center={fly} zoom={15} />
        <MapEvents onClick={onChange} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={markerIcon("", "active")}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as LeafletMarker).getLatLng();
                onChange({ lat: ll.lat, lng: ll.lng });
              },
            }}
          />
        )}
      </BaseMap>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        {value ? "Point placé. Déplacez le marqueur pour ajuster." : "Cliquez sur la carte pour placer la mission."} Le public ne verra qu&apos;une zone approximative (~1 km).
      </p>
    </div>
  );
}
