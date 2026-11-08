"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { jobSchema } from "@/lib/validations/jobs";
import { toEwkt } from "@/lib/maps/places";
import { fail, type ActionResult } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { authed, callRpc, invalid } from "./_helpers";

function toRow(v: z.output<typeof jobSchema>) {
  return {
    category_id: v.categoryId,
    title: v.title,
    description: v.description,
    skills_required: v.skills,
    budget_amount: v.budget,
    pay_type: v.payType,
    allow_price_proposal: v.allowPriceProposal,
    start_date: v.startDate,
    deadline: v.deadline,
    country_code: v.country,
    city: v.city,
    neighborhood: v.neighborhood,
    address: v.address || null,
    location: v.lat !== null && v.lng !== null ? toEwkt(v.lat, v.lng) : null,
    work_mode: v.workMode,
    workers_needed: v.workersNeeded,
  };
}

export async function createJobAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Votre session a expiré." };
    if (!(await rateLimit("job:create", user.id, 10, 3600))) {
      return { ok: false, error: "Limite de publication atteinte (10 par heure)." };
    }
    const { data, error } = await supabase
      .from("jobs")
      .insert({ ...toRow(parsed.data), client_id: user.id, status: parsed.data.intent === "draft" ? "draft" : "published" })
      .select("id")
      .single();
    if (error) return fail(error);
    revalidatePath("/jobs");
    revalidatePath("/");
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateJobAction(jobId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!z.string().uuid().safeParse(jobId).success) return { ok: false, error: "Mission invalide." };
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Votre session a expiré." };
    // RLS : seul le propriétaire peut modifier une mission non attribuée (draft/published/reviewing)
    const { data, error } = await supabase.from("jobs").update(toRow(parsed.data)).eq("id", jobId).select("id, status");
    if (error) return fail(error);
    if (!data?.length) return { ok: false, error: "Cette mission ne peut plus être modifiée (déjà attribuée ou introuvable)." };
    if (parsed.data.intent === "publish" && data[0]!.status === "draft") {
      const { error: pErr } = await supabase.rpc("publish_job", { p_job_id: jobId });
      if (pErr) return fail(pErr);
    }
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath(`/client/jobs/${jobId}`);
    return { ok: true, data: { id: jobId }, message: "Mission mise à jour." };
  } catch (e) {
    return fail(e);
  }
}

export async function publishJobAction(jobId: string) {
  return callRpc("publish_job", { p_job_id: jobId }, { revalidate: ["/client/jobs", "/jobs"], message: "Mission publiée." });
}

export async function cancelJobAction(jobId: string, reason: string) {
  const r = z.string().trim().min(3, "Indiquez un motif").max(500).safeParse(reason);
  if (!r.success) return { ok: false as const, error: r.error.issues[0]!.message };
  return callRpc("cancel_job", { p_job_id: jobId, p_reason: r.data }, { revalidate: ["/client/jobs", "/jobs"], message: "Mission annulée." });
}

export async function deleteDraftAction(jobId: string): Promise<ActionResult> {
  try {
    const { supabase } = await authed();
    const { error } = await supabase.from("jobs").delete().eq("id", jobId).eq("status", "draft");
    if (error) return fail(error);
    revalidatePath("/client/jobs");
    return { ok: true, data: undefined, message: "Brouillon supprimé." };
  } catch (e) {
    return fail(e);
  }
}

/** Enregistre les images déjà envoyées dans Storage (dossier de l'utilisateur, contrôlé par RLS). */
export async function addJobImagesAction(jobId: string, paths: string[]): Promise<ActionResult> {
  const parsed = z.array(z.string().max(300)).max(6).safeParse(paths);
  if (!parsed.success) return { ok: false, error: "Images invalides." };
  if (!parsed.data.length) return { ok: true, data: undefined };
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Session expirée." };
    const { count } = await supabase.from("job_images").select("id", { count: "exact", head: true }).eq("job_id", jobId);
    if ((count ?? 0) + parsed.data.length > 6) return { ok: false, error: "6 photos maximum par mission." };
    const rows = parsed.data.map((p, i) => ({ job_id: jobId, storage_path: p, sort_order: (count ?? 0) + i }));
    const { error } = await supabase.from("job_images").insert(rows);
    if (error) return fail(error);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function removeJobImageAction(imageId: string, jobId: string): Promise<ActionResult> {
  try {
    const { supabase } = await authed();
    const { data } = await supabase.from("job_images").select("storage_path").eq("id", imageId).maybeSingle();
    const { error } = await supabase.from("job_images").delete().eq("id", imageId);
    if (error) return fail(error);
    if (data?.storage_path) await supabase.storage.from("job-images").remove([data.storage_path as string]);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleFavoriteAction(targetType: "job" | "worker", targetId: string): Promise<ActionResult<{ favorite: boolean }>> {
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Connectez-vous pour ajouter des favoris." };
    const { data: existing } = await supabase
      .from("favorites")
      .select("target_id")
      .eq("user_id", user.id)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .maybeSingle();
    if (existing) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_type", targetType).eq("target_id", targetId);
      return { ok: true, data: { favorite: false } };
    }
    const { error } = await supabase.from("favorites").insert({ user_id: user.id, target_type: targetType, target_id: targetId });
    if (error) return fail(error);
    return { ok: true, data: { favorite: true } };
  } catch (e) {
    return fail(e);
  }
}
