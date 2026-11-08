import { describe, expect, it } from "vitest";
import { approximate, BENIN_CITIES, boundsRadiusKm, findCity, haversineKm, toEwkt } from "@/lib/maps/places";
import { parsePoint } from "@/lib/maps/parse-point";
import { formatDistanceKm, formatXOF } from "@/lib/utils/format";

describe("géolocalisation", () => {
  it("calcule la distance Cotonou – Porto-Novo (~30 km)", () => {
    const d = haversineKm(findCity("Cotonou")!, findCity("porto-novo")!);
    expect(d).toBeGreaterThan(25);
    expect(d).toBeLessThan(35);
  });
  it("arrondit les positions (~1 km) avant affichage", () => {
    expect(approximate({ lat: 6.365432, lng: 2.461298 })).toEqual({ lat: 6.37, lng: 2.46 });
  });
  it("calcule le rayon d'une emprise de carte", () => {
    expect(boundsRadiusKm({ north: 6.45, south: 6.35, east: 2.45, west: 2.35 })).toBeGreaterThan(5);
  });
  it("produit un EWKT longitude/latitude pour PostGIS", () => {
    expect(toEwkt(6.37, 2.39)).toBe("SRID=4326;POINT(2.39 6.37)");
  });
  it("décode un point PostGIS (EWKB hex et GeoJSON)", () => {
    // SRID=4326;POINT(2.39 6.37) en EWKB little-endian
    const hex = "0101000020E61000001F85EB51B81E03407B14AE47E17A1940";
    expect(parsePoint(hex)).toEqual({ lat: 6.37, lng: 2.39 });
    expect(parsePoint({ type: "Point", coordinates: [2.39, 6.37] })).toEqual({ lat: 6.37, lng: 2.39 });
    expect(parsePoint(null)).toBeNull();
  });
  it("référence des villes du Bénin pour le mode dégradé", () => {
    expect(BENIN_CITIES.length).toBeGreaterThanOrEqual(15);
    for (const c of BENIN_CITIES) {
      expect(c.lat).toBeGreaterThan(6);
      expect(c.lat).toBeLessThan(12.5);
    }
  });
  it("formate distances et montants en français", () => {
    expect(formatDistanceKm(0.4)).toBe("< 1 km");
    expect(formatDistanceKm(3.25)).toBe("≈ 3,3 km");
    expect(formatDistanceKm(null)).toBeNull();
    expect(formatXOF(10000)).toBe("10 000 FCFA");
  });
});
