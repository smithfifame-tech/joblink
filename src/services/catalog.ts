import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { DEFAULT_COMMISSION_RATE, formatRate } from "@/lib/payments/commission";
import type { Category, JobSearchRow, PublicJob } from "@/types/db";
import type { JobSearchParams } from "@/lib/validations/jobs";

export const PAGE_SIZE = 12;

/** Catégories actives (lecture publique). */
export const getCategories = cache(async (): Promise<Category[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
});

export async function getPlatformSetting<T>(key: string, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("platform_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? fallback;
}

/**
 * Taux réellement appliqués (platform_settings), source unique pour tous les textes du site :
 * si le taux change dans les réglages, l'accueil, la FAQ, les CGU et les formulaires suivent.
 */
export const PLATFORM_SETTINGS_TAG = "platform-settings";

/**
 * Lecture sans cookies (réglages publics) et mise en cache 5 min : les pages publiques
 * restent statiques/ISR. Invalidé immédiatement quand un administrateur modifie un réglage.
 */
const readPublicRates = unstable_cache(
  async (): Promise<Record<string, unknown>> => {
    if (!isSupabaseConfigured()) return {};
    const sb = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb
      .from("platform_settings")
      .select("key, value")
      .in("key", ["payments.commission_rate", "payments.provider_fee_rate"]);
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  },
  ["platform-rates"],
  { revalidate: 300, tags: [PLATFORM_SETTINGS_TAG] },
);

export const getCommissionRates = cache(async (): Promise<{ commission: number; providerFee: number }> => {
  const values = await readPublicRates().catch(() => ({}) as Record<string, unknown>);
  const c = Number(values["payments.commission_rate"] ?? DEFAULT_COMMISSION_RATE);
  const f = Number(values["payments.provider_fee_rate"] ?? 0);
  return {
    commission: Number.isFinite(c) && c >= 0 && c <= 0.5 ? c : DEFAULT_COMMISSION_RATE,
    providerFee: Number.isFinite(f) && f >= 0 && f <= 0.5 ? f : 0,
  };
});

/** Taux de commission prêt à afficher (« 5 % »). */
export async function getCommissionLabel(): Promise<string> {
  return formatRate((await getCommissionRates()).commission);
}

/** Recherche de missions ouvertes via la fonction PostGIS search_jobs. */
export async function searchJobs(params: JobSearchParams, pageSize = PAGE_SIZE): Promise<{ rows: JobSearchRow[]; total: number }> {
  if (!isSupabaseConfigured()) return { rows: [], total: 0 };
  const supabase = await getSupabaseServerClient();
  const page = params.page ?? 1;
  const hasGeo = params.lat !== undefined && params.lng !== undefined;
  const { data, error } = await supabase.rpc("search_jobs", {
    p_lat: hasGeo ? params.lat : null,
    p_lng: hasGeo ? params.lng : null,
    p_radius_km: hasGeo ? (params.radius ?? null) : null,
    p_query: params.q ?? null,
    p_category_slug: params.category ?? null,
    p_city: params.city ?? null,
    p_min_budget: params.min ?? null,
    p_max_budget: params.max ?? null,
    p_work_mode: params.mode ?? null,
    p_west: params.west ?? null,
    p_south: params.south ?? null,
    p_east: params.east ?? null,
    p_north: params.north ?? null,
    p_sort: params.sort ?? (hasGeo ? "distance" : "recent"),
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw error;
  const rows = (data ?? []) as JobSearchRow[];
  return { rows, total: rows[0]?.total_count ? Number(rows[0].total_count) : 0 };
}

export async function getRecentJobs(limit = 6): Promise<JobSearchRow[]> {
  const { rows } = await searchJobs({ sort: "recent" }, limit);
  return rows;
}

export async function getPublicJob(id: string): Promise<PublicJob | null> {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("public_jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as PublicJob) ?? null;
}

export async function getPublicStats(): Promise<{ open_jobs: number; workers: number; completed_jobs: number } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.rpc("public_stats");
  return (data as { open_jobs: number; workers: number; completed_jobs: number }) ?? null;
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {};
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("public_jobs").select("category_slug").in("status", ["published", "reviewing"]).limit(2000);
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { category_slug: string }[]) counts[r.category_slug] = (counts[r.category_slug] ?? 0) + 1;
  return counts;
}
