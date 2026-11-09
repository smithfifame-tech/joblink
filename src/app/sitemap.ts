import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { getCategories } from "@/services/catalog";

export const revalidate = 3600;

/** Indexation des pages publiques uniquement (jamais des espaces privés). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const now = new Date();
  const statics = ["", "/jobs", "/map", "/categories", "/about", "/how-it-works", "/faq", "/contact", "/terms", "/privacy"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: p === "/jobs" || p === "" ? ("hourly" as const) : ("monthly" as const),
    priority: p === "" ? 1 : p === "/jobs" ? 0.9 : 0.5,
  }));
  // Le détail des missions est réservé aux membres : seules les listes publiques sont indexées.
  // Les pages de connexion / inscription sont en « noindex » : elles ne figurent pas dans le plan du site.
  const categories = await getCategories().catch(() => []);
  return [
    ...statics,
    ...categories.map((c) => ({ url: `${base}/jobs?category=${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}
