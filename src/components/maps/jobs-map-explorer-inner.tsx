"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Marker, Popup } from "react-leaflet";
import { LocateFixed, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { BaseMap, FlyTo, MapEvents, markerIcon } from "./leaflet-base";
import { JobCard } from "@/components/jobs/job-card";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { BENIN_CITIES, DEFAULT_CENTER, RADIUS_OPTIONS, type RadiusKm } from "@/lib/maps/places";
import { formatXOF } from "@/lib/utils/format";
import type { Category, JobSearchRow } from "@/types/db";

type Point = { lat: number; lng: number };

export default function JobsMapExplorerInner({ categories, basePath = "/jobs" }: { categories: Category[]; basePath?: string }) {
  const [origin, setOrigin] = useState<Point>(DEFAULT_CENTER);
  const [me, setMe] = useState<Point | null>(null);
  const [flyTarget, setFlyTarget] = useState<Point | null>(null);
  const [radius, setRadius] = useState<RadiusKm>(10);
  const [category, setCategory] = useState("");
  const [jobs, setJobs] = useState<JobSearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingCenter, setPendingCenter] = useState<Point | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (center: Point, r: number, cat: string) => {
      setLoading(true);
      setError(false);
      try {
        const sp = new URLSearchParams({ lat: center.lat.toFixed(4), lng: center.lng.toFixed(4), radius: String(r), sort: "distance", limit: "100" });
        if (cat) sp.set("category", cat);
        const res = await fetch(`/api/jobs/search?${sp}`);
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { jobs: JobSearchRow[] };
        setJobs(json.jobs);
        setPendingCenter(null);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(origin, radius, category);
  }, [origin, radius, category, load]);

  function locate() {
    if (!("geolocation" in navigator)) return toast.error("Géolocalisation indisponible. Choisissez une ville.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pt = { lat: p.coords.latitude, lng: p.coords.longitude };
        setMe(pt);
        setOrigin(pt);
        setFlyTarget(pt);
      },
      () => toast.info("Localisation refusée : la carte reste centrée sur la ville choisie."),
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  const markers = useMemo(() => jobs.filter((j) => j.approx_lat !== null && j.approx_lng !== null), [jobs]);
  const zoom = radius <= 1 ? 15 : radius <= 5 ? 13 : radius <= 10 ? 12 : radius <= 20 ? 11 : 9;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      <div className="relative order-1 overflow-hidden rounded-2xl border">
        <div className="absolute left-3 right-3 top-3 z-[500] flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="bg-background shadow-sm" onClick={locate}>
            <LocateFixed /> Ma position
          </Button>
          <div className="w-36">
            <NativeSelect aria-label="Ville" className="h-8 bg-background text-sm shadow-sm" defaultValue="" onChange={(e) => {
              const c = BENIN_CITIES.find((x) => x.name === e.target.value);
              if (c) { setOrigin(c); setFlyTarget(c); }
            }}>
              <option value="" disabled>Ville…</option>
              {BENIN_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </NativeSelect>
          </div>
          <div className="w-28">
            <NativeSelect aria-label="Rayon" className="h-8 bg-background text-sm shadow-sm" value={radius} onChange={(e) => setRadius(Number(e.target.value) as RadiusKm)}>
              {RADIUS_OPTIONS.map((r) => <option key={r} value={r}>{r} km</option>)}
            </NativeSelect>
          </div>
          <div className="w-44">
            <NativeSelect aria-label="Catégorie" className="h-8 bg-background text-sm shadow-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Toutes catégories</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </NativeSelect>
          </div>
        </div>
        {pendingCenter && (
          <div className="absolute bottom-4 left-1/2 z-[500] -translate-x-1/2">
            <Button size="sm" className="shadow-lg" onClick={() => setOrigin(pendingCenter)}>
              <RefreshCw /> Rechercher dans cette zone
            </Button>
          </div>
        )}
        <BaseMap center={origin} zoom={zoom} className="h-[60dvh] min-h-[380px] w-full lg:h-[calc(100dvh-180px)]">
          <FlyTo center={flyTarget} zoom={zoom} />
          <MapEvents
            onMoveEnd={({ center }) => {
              const moved = Math.abs(center.lat - origin.lat) > 0.005 || Math.abs(center.lng - origin.lng) > 0.005;
              setPendingCenter(moved ? center : null);
            }}
          />
          <Circle center={[origin.lat, origin.lng]} radius={radius * 1000} pathOptions={{ color: "#16A34A", weight: 1, fillOpacity: 0.05 }} />
          {me && <Marker position={[me.lat, me.lng]} icon={markerIcon("", "me")} />}
          {markers.map((j) => (
            <Marker
              key={j.id}
              position={[j.approx_lat!, j.approx_lng!]}
              icon={markerIcon("", selected === j.id ? "active" : "default")}
              eventHandlers={{
                click: () => {
                  setSelected(j.id);
                  document.getElementById(`map-job-${j.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                },
              }}
            >
              <Popup>
                <p className="font-semibold">{j.title}</p>
                <p className="text-sm">{formatXOF(j.budget_amount)} · {j.neighborhood}</p>
                <Link href={`${basePath}/${j.id}`} className="text-sm font-medium text-primary">Voir la mission</Link>
              </Popup>
            </Marker>
          ))}
        </BaseMap>
        <p className="border-t bg-background px-3 py-2 text-xs text-muted-foreground">Positions approximatives (~1 km) pour protéger la vie privée.</p>
      </div>

      <div ref={listRef} className="order-2 grid max-h-none content-start gap-3 lg:max-h-[calc(100dvh-140px)] lg:overflow-y-auto lg:pr-1" aria-live="polite">
        <p className="text-sm text-muted-foreground">
          {loading ? "Recherche…" : `${jobs.length} mission${jobs.length > 1 ? "s" : ""} dans un rayon de ${radius} km`}
        </p>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Chargement impossible. Vérifiez votre connexion.</p>}
        {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        {!loading && !error && jobs.length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Aucune mission dans cette zone. Agrandissez le rayon.</p>
        )}
        {!loading &&
          jobs.map((j) => (
            <div key={j.id} id={`map-job-${j.id}`} onMouseEnter={() => setSelected(j.id)}>
              <JobCard job={j} href={`${basePath}/${j.id}`} active={selected === j.id} compact />
            </div>
          ))}
      </div>
    </div>
  );
}
