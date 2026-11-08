import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Review } from "@/types/db";

export async function getProfilesMap(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length || !isSupabaseConfigured()) return new Map<string, { first_name: string; last_initial: string; avatar_url: string | null }>();
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("public_profiles").select("id, first_name, last_initial, avatar_url").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id as string, p as { first_name: string; last_initial: string; avatar_url: string | null }]));
}

/** Avis réels (missions terminées), notés 4+ avec commentaire. Aucun témoignage fictif. */
export async function getFeaturedReviews(limit = 3): Promise<(Review & { reviewer_name: string })[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .gte("rating", 4)
    .not("comment", "is", null)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as Review[];
  const names = await getProfilesMap(rows.map((r) => r.reviewer_id));
  return rows.map((r) => {
    const p = names.get(r.reviewer_id);
    return { ...r, reviewer_name: p ? `${p.first_name} ${p.last_initial}` : "Utilisateur JOBLINK" };
  });
}

export async function getReviewsFor(userId: string, limit = 20) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("reviewee_id", userId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as Review[];
  const names = await getProfilesMap(rows.map((r) => r.reviewer_id));
  return rows.map((r) => ({ ...r, reviewer: names.get(r.reviewer_id) ?? null }));
}
