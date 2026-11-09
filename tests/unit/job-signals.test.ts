import { describe, expect, it } from "vitest";
import { daysLeft, deadlineLabel, isNew, isUrgent, jobQuality } from "@/lib/jobs/signals";
import { categoryPhoto, CATEGORY_PHOTOS, TITLE_IDEAS } from "@/lib/media/category-photos";

// 9 novembre 2026, 23 h 30 à Porto-Novo (22 h 30 UTC) : la date du jour reste le 9.
const now = new Date("2026-11-09T22:30:00Z");

describe("signaux des missions", () => {
  it("compte les jours restants dans le fuseau Africa/Porto-Novo", () => {
    expect(daysLeft("2026-11-09", now)).toBe(0);
    expect(daysLeft("2026-11-10", now)).toBe(1);
    expect(daysLeft("2026-11-08", now)).toBe(-1);
    // 23 h 30 UTC = 0 h 30 le 10 novembre à Porto-Novo
    expect(daysLeft("2026-11-10", new Date("2026-11-09T23:30:00Z"))).toBe(0);
    expect(daysLeft("n'importe quoi", now)).toBeNull();
  });

  it("libellés de date limite", () => {
    expect(deadlineLabel("2026-11-09", now)).toBe("Clôture aujourd'hui");
    expect(deadlineLabel("2026-11-10", now)).toBe("Clôture demain");
    expect(deadlineLabel("2026-11-14", now)).toBe("Plus que 5 jours");
    expect(deadlineLabel("2026-11-01", now)).toBe("Date limite dépassée");
    expect(deadlineLabel("2027-03-01", now)).toBeNull();
  });

  it("urgence et nouveauté", () => {
    expect(isUrgent("2026-11-11", now)).toBe(true);
    expect(isUrgent("2026-11-12", now)).toBe(false);
    expect(isUrgent("2026-11-01", now)).toBe(false);
    expect(isNew("2026-11-09T10:00:00Z", now)).toBe(true);
    expect(isNew("2026-11-06T10:00:00Z", now)).toBe(false);
  });

  it("indice de qualité de l'annonce", () => {
    const weak = jobQuality({ title: "Aide" });
    expect(weak.level).toBe("faible");
    expect(weak.tips.length).toBeGreaterThan(0);
    const great = jobQuality({
      title: "Réparer une fuite sous l'évier de la cuisine",
      categoryId: "x",
      description: "a".repeat(200),
      skills: ["Plomberie"],
      budget: "15000",
      deadline: "2026-11-20",
      photos: 1,
      located: true,
    });
    expect(great.score).toBe(100);
    expect(great.level).toBe("excellente");
  });
});

describe("photos de catégories", () => {
  it("chaque catégorie a une photo et des idées de titres", () => {
    for (const slug of Object.keys(TITLE_IDEAS)) {
      expect(CATEGORY_PHOTOS[slug], slug).toBeDefined();
      expect(CATEGORY_PHOTOS[slug].src).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
    }
  });
  it("retombe sur l'icône puis sur une photo par défaut", () => {
    expect(categoryPhoto(null, "wrench")).toBe(CATEGORY_PHOTOS.plomberie);
    expect(categoryPhoto("inconnue", null)).toBe(CATEGORY_PHOTOS.autres);
  });
});
