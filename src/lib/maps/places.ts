/** Pays : le Bénin est ouvert au lancement, les pays voisins sont prévus pour l'extension. */
export const COUNTRIES = [
  { code: "BJ", name: "Bénin", dialCode: "+229", enabled: true, center: { lat: 6.3703, lng: 2.3912 } },
  { code: "TG", name: "Togo", dialCode: "+228", enabled: false, center: { lat: 6.1319, lng: 1.2228 } },
  { code: "NG", name: "Nigeria", dialCode: "+234", enabled: false, center: { lat: 6.5244, lng: 3.3792 } },
  { code: "NE", name: "Niger", dialCode: "+227", enabled: false, center: { lat: 13.5116, lng: 2.1254 } },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", enabled: false, center: { lat: 12.3714, lng: -1.5197 } },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];
export const ENABLED_COUNTRIES = COUNTRIES.filter((c) => c.enabled);
export const DEFAULT_CENTER = { lat: 6.3703, lng: 2.3912 }; // Cotonou

/** Principales villes du Bénin (centres approximatifs) pour la saisie manuelle et le mode dégradé. */
export const BENIN_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Cotonou", lat: 6.3703, lng: 2.3912 },
  { name: "Porto-Novo", lat: 6.4969, lng: 2.6289 },
  { name: "Abomey-Calavi", lat: 6.4485, lng: 2.3557 },
  { name: "Sèmè-Kpodji", lat: 6.3667, lng: 2.6167 },
  { name: "Ouidah", lat: 6.3631, lng: 2.0851 },
  { name: "Allada", lat: 6.6650, lng: 2.1514 },
  { name: "Bohicon", lat: 7.1782, lng: 2.0667 },
  { name: "Abomey", lat: 7.1829, lng: 1.9912 },
  { name: "Lokossa", lat: 6.6386, lng: 1.7167 },
  { name: "Comè", lat: 6.4000, lng: 1.8833 },
  { name: "Pobè", lat: 6.9800, lng: 2.6650 },
  { name: "Dassa-Zoumè", lat: 7.7500, lng: 2.1833 },
  { name: "Savalou", lat: 7.9281, lng: 1.9756 },
  { name: "Savè", lat: 8.0342, lng: 2.4866 },
  { name: "Parakou", lat: 9.3370, lng: 2.6303 },
  { name: "Djougou", lat: 9.7085, lng: 1.6660 },
  { name: "Natitingou", lat: 10.3042, lng: 1.3796 },
  { name: "Nikki", lat: 9.9401, lng: 3.2108 },
  { name: "Kandi", lat: 11.1342, lng: 2.9386 },
  { name: "Malanville", lat: 11.8619, lng: 3.3862 },
];

export const RADIUS_OPTIONS = [1, 5, 10, 20, 50] as const;
export type RadiusKm = (typeof RADIUS_OPTIONS)[number];

export function findCity(name: string | null | undefined) {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  return BENIN_CITIES.find((c) => c.name.toLowerCase() === n);
}

/** Distance à vol d'oiseau (formule de Haversine), en km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Arrondit une position (~1,1 km) avant tout affichage ou partage. */
export function approximate(p: { lat: number; lng: number }) {
  return { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 };
}

/** Rayon (km) couvrant une emprise de carte, depuis son centre. */
export function boundsRadiusKm(b: { north: number; south: number; east: number; west: number }): number {
  const center = { lat: (b.north + b.south) / 2, lng: (b.east + b.west) / 2 };
  return haversineKm(center, { lat: b.north, lng: b.east });
}

export function toEwkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
