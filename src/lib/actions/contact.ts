"use server";

import { contactSchema } from "@/lib/validations/profile";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { serverEnv } from "@/lib/env.server";
import { fail, type ActionResult } from "@/lib/errors";
import { invalid } from "./_helpers";

export async function contactAction(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.website) return { ok: true, data: undefined, message: "Message envoyé." };
  const ip = await getClientIp();
  if (!(await rateLimit("contact", ip, 5, 3600))) return { ok: false, error: "Trop de messages envoyés. Réessayez plus tard." };
  try {
    const { name, email, subject, message } = parsed.data;
    const { error } = await getSupabaseAdminClient().from("contact_messages").insert({ name, email, subject, message });
    if (error) return fail(error);
    if (serverEnv.contactInbox) {
      await sendEmail({
        to: serverEnv.contactInbox,
        subject: `[Contact JOBLINK] ${subject}`,
        text: `De : ${name} <${email}>\n\n${message}`,
        replyTo: email,
      });
    }
    return { ok: true, data: undefined, message: "Message envoyé. Nous vous répondrons rapidement." };
  } catch (e) {
    return fail(e);
  }
}
