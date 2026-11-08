/** Décode un point PostGIS renvoyé par PostgREST (GeoJSON ou EWKB hexadécimal). */
export function parsePoint(loc: unknown): { lat: number; lng: number } | null {
  if (!loc) return null;
  if (typeof loc === "object" && loc && "coordinates" in loc) {
    const [lng, lat] = (loc as { coordinates: [number, number] }).coordinates;
    return { lat, lng };
  }
  if (typeof loc === "string" && /^[0-9a-f]+$/i.test(loc) && loc.length >= 42) {
    const bytes = new Uint8Array(loc.match(/../g)!.map((h) => parseInt(h, 16)));
    const view = new DataView(bytes.buffer);
    const le = bytes[0] === 1;
    const type = view.getUint32(1, le);
    const offset = type & 0x20000000 ? 9 : 5; // présence d'un SRID (EWKB)
    const x = view.getFloat64(offset, le);
    const y = view.getFloat64(offset + 8, le);
    return { lat: y, lng: x };
  }
  return null;
}
