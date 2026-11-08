import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { getCategories, searchJobs } from "@/services/catalog";

export const revalidate = 3600;

/** Indexation des pages publiques uniquement (jamais des espaces privés). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const now = new Date();
  const statics = ["", "/jobs", "/map", "/categories", "/about", "/how-it-works", "/faq", "/contact", "/terms", "/privacy", "/register", "/login"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: p === "/jobs" || p === "" ? ("hourly" as const) : ("monthly" as const),
    priority: p === "" ? 1 : p === "/jobs" ? 0.9 : 0.5,
  }));
  const [categories, jobs] = await Promise.all([
    getCategories().catch(() => []),
    searchJobs({ sort: "recent" }, 100).then((r) => r.rows).catch(() => []),
  ]);
  return [
    ...statics,
    ...categories.map((c) => ({ url: `${base}/jobs?category=${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
    ...jobs.map((j) => ({ url: `${base}/jobs/${j.id}`, lastModified: new Date(j.created_at), changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
