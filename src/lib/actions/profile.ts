"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { profileSchema, workerProfileSchema } from "@/lib/validations/profile";
import { normalizePhone } from "@/lib/validations/common";
import { fail, type ActionResult } from "@/lib/errors";
import { authed, callRpc, invalid } from "./_helpers";

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Session expirée." };
    const v = parsed.data;
    // Seules les colonnes autorisées (privilèges SQL par colonne) sont modifiables
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: v.firstName,
        last_name: v.lastName,
        phone: normalizePhone(v.phone, v.country),
        country_code: v.country,
        city: v.city,
        neighborhood: v.neighborhood,
        bio: v.bio || null,
        notify_email: v.notifyEmail,
        notify_new_jobs: v.notifyNewJobs,
      })
      .eq("id", user.id);
    if (error) return fail(error);
    revalidatePath("/", "layout");
    return { ok: true, data: undefined, message: "Profil enregistré." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateAvatarAction(path: string | null): Promise<ActionResult> {
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Session expirée." };
    if (path && !path.startsWith(`${user.id}/`)) return { ok: false, error: "Fichier invalide." };
    const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    if (error) return fail(error);
    revalidatePath("/", "layout");
    return { ok: true, data: undefined, message: "Photo mise à jour." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateWorkerProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = workerProfileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Session expirée." };
    const v = parsed.data;
    const { error } = await supabase
      .from("worker_profiles")
      .update({
        headline: v.headline || null,
        experience_years: v.experienceYears === "" || v.experienceYears === undefined ? null : v.experienceYears,
        experiences: v.experiences || null,
        rate_min: v.rateMin,
        rate_max: v.rateMax,
        rate_unit: v.rateUnit,
        travel_radius_km: v.travelRadiusKm,
        availability: v.availability,
        availability_notes: v.availabilityNotes || null,
        portfolio_urls: v.portfolioUrls,
        show_on_map: v.showOnMap,
      })
      .eq("user_id", user.id);
    if (error) return fail(error);

    // Synchronisation des catégories
    const { data: current } = await supabase.from("worker_categories").select("category_id").eq("worker_id", user.id);
    const have = new Set((current ?? []).map((r) => r.category_id as string));
    const want = new Set(v.categoryIds);
    const toAdd = [...want].filter((c) => !have.has(c)).map((category_id) => ({ worker_id: user.id, category_id }));
    const toRemove = [...have].filter((c) => !want.has(c));
    if (toAdd.length) {
      const { error: e1 } = await supabase.from("worker_categories").insert(toAdd);
      if (e1) return fail(e1);
    }
    if (toRemove.length) {
      const { error: e2 } = await supabase.from("worker_categories").delete().eq("worker_id", user.id).in("category_id", toRemove);
      if (e2) return fail(e2);
    }
    revalidatePath("/worker", "layout");
    return { ok: true, data: undefined, message: "Profil professionnel enregistré." };
  } catch (e) {
    return fail(e);
  }
}

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  source: z.enum(["gps", "manual"]),
  city: z.string().trim().max(120).optional(),
  neighborhood: z.string().trim().max(120).optional(),
});

export async function setLocationAction(input: unknown) {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return callRpc("set_my_location", {
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
    p_source: parsed.data.source,
    p_city: parsed.data.city ?? null,
    p_neighborhood: parsed.data.neighborhood ?? null,
  }, { message: "Position enregistrée (seule une position approximative est partagée)." });
}

const verificationSchema = z.object({
  documentType: z.enum(["cni", "passport", "driver_license", "cip", "other"]),
  documentPath: z.string().max(300),
  note: z.string().trim().max(1000).optional(),
});

export async function submitVerificationAction(input: unknown): Promise<ActionResult> {
  const parsed = verificationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Session expirée." };
    const { error } = await supabase.from("verification_requests").insert({
      user_id: user.id,
      document_type: parsed.data.documentType,
      document_path: parsed.data.documentPath,
      note: parsed.data.note || null,
    });
    if (error) {
      if (/duplicate|unique/i.test(error.message)) return { ok: false, error: "Une demande est déjà en cours d'examen." };
      return fail(error);
    }
    revalidatePath("/worker/profile");
    return { ok: true, data: undefined, message: "Demande envoyée. Réponse sous 48 h ouvrées." };
  } catch (e) {
    return fail(e);
  }
}
