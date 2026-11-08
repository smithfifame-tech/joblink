"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import { DEFAULT_CENTER } from "@/lib/maps/places";

export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function markerIcon(label = "", variant: "default" | "active" | "me" = "default") {
  return L.divIcon({
    className: "",
    html: `<span class="jl-marker ${variant === "active" ? "jl-marker--active" : variant === "me" ? "jl-marker--me" : ""}">${label}</span>`,
    iconSize: variant === "me" ? [18, 18] : [30, 30],
    iconAnchor: variant === "me" ? [9, 9] : [15, 15],
  });
}

export function BaseMap({
  center = DEFAULT_CENTER,
  zoom = 12,
  className,
  children,
  scrollWheelZoom = true,
}: {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  children?: React.ReactNode;
  scrollWheelZoom?: boolean;
}) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} className={className} scrollWheelZoom={scrollWheelZoom} preferCanvas>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} detectRetina />
      {children}
    </MapContainer>
  );
}

/** Recentrage programmatique de la carte. */
export function FlyTo({ center, zoom }: { center: { lat: number; lng: number } | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], zoom ?? map.getZoom(), { duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

export function MapEvents({
  onMoveEnd,
  onClick,
}: {
  onMoveEnd?: (b: { north: number; south: number; east: number; west: number; center: { lat: number; lng: number }; zoom: number }) => void;
  onClick?: (p: { lat: number; lng: number }) => void;
}) {
  const map = useMapEvents({
    moveend() {
      if (!onMoveEnd) return;
      const b = map.getBounds();
      const c = map.getCenter();
      onMoveEnd({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest(), center: { lat: c.lat, lng: c.lng }, zoom: map.getZoom() });
    },
    click(e) {
      onClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}
