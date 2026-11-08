"use server";

import { z } from "zod";
import { messageSchema, validateFile } from "@/lib/validations/profile";
import { fail, type ActionResult } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { authed, callRpc, invalid } from "./_helpers";

export async function startConversationAction(otherUserId: string, jobId: string) {
  const ok = z.string().uuid().safeParse(otherUserId).success && z.string().uuid().safeParse(jobId).success;
  if (!ok) return { ok: false as const, error: "Conversation invalide." };
  return callRpc<string>("start_conversation", { p_other: otherUserId, p_job: jobId });
}

const attachmentSchema = z.object({
  storagePath: z.string().max(300),
  fileName: z.string().max(200),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
});

export async function sendMessageAction(input: unknown, attachment?: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Session expirée." };
    if (!(await rateLimit("message", user.id, 40, 60))) return { ok: false, error: "Vous envoyez trop de messages. Patientez un instant." };

    let att: z.output<typeof attachmentSchema> | null = null;
    if (attachment) {
      const a = attachmentSchema.safeParse(attachment);
      if (!a.success) return { ok: false, error: "Pièce jointe invalide." };
      const err = validateFile({ size: a.data.sizeBytes, type: a.data.mimeType }, "attachment");
      if (err) return { ok: false, error: err };
      if (!a.data.storagePath.startsWith(`${parsed.data.conversationId}/${user.id}/`)) return { ok: false, error: "Pièce jointe invalide." };
      att = a.data;
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: parsed.data.conversationId, sender_id: user.id, body: parsed.data.body })
      .select("id")
      .single();
    if (error) return fail(error);
    if (att) {
      const { error: aErr } = await supabase.from("message_attachments").insert({
        message_id: data.id,
        conversation_id: parsed.data.conversationId,
        storage_path: att.storagePath,
        file_name: att.fileName,
        mime_type: att.mimeType,
        size_bytes: att.sizeBytes,
      });
      if (aErr) return fail(aErr);
    }
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    return fail(e);
  }
}

export async function markConversationReadAction(conversationId: string) {
  return callRpc("mark_conversation_read", { p_conversation_id: conversationId });
}

export async function blockUserAction(userId: string, block: boolean): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(userId).success) return { ok: false, error: "Utilisateur invalide." };
  try {
    const { supabase, user } = await authed();
    if (!user) return { ok: false, error: "Session expirée." };
    const { error } = block
      ? await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: userId })
      : await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", userId);
    if (error && !/duplicate/i.test(error.message)) return fail(error);
    return { ok: true, data: undefined, message: block ? "Utilisateur bloqué." : "Utilisateur débloqué." };
  } catch (e) {
    return fail(e);
  }
}

export async function markNotificationsReadAction(ids?: string[]) {
  const parsed = z.array(z.string().uuid()).max(200).optional().safeParse(ids);
  if (!parsed.success) return { ok: false as const, error: "Requête invalide." };
  return callRpc("mark_notifications_read", { p_ids: parsed.data ?? null }, { revalidate: ["/notifications"] });
}
