"use client";

import { Circle } from "react-leaflet";
import { BaseMap } from "./leaflet-base";

/** Zone approximative d'une mission (cercle ~1 km, jamais le point exact). */
export default function AreaMapInner({ lat, lng }: { lat: number; lng: number }) {
  return (
    <BaseMap center={{ lat, lng }} zoom={13} className="h-56 w-full" scrollWheelZoom={false}>
      <Circle center={[lat, lng]} radius={900} pathOptions={{ color: "#16A34A", weight: 1.5, fillOpacity: 0.12 }} />
    </BaseMap>
  );
}
