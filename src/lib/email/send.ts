import "server-only";
import { serverEnv } from "@/lib/env.server";

/**
 * Envoi d'e-mails transactionnels via Resend (facultatif).
 * Les e-mails d'authentification (confirmation, réinitialisation) sont envoyés par Supabase Auth :
 * configurez Resend comme SMTP personnalisé dans Supabase pour les personnaliser (voir docs/DEPLOYMENT.md).
 */
export async function sendEmail(msg: { to: string; subject: string; text: string; html?: string; replyTo?: string }): Promise<boolean> {
  if (!serverEnv.resendApiKey) return false;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(serverEnv.resendApiKey);
    const { error } = await resend.emails.send({
      from: serverEnv.emailFrom,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      replyTo: msg.replyTo,
    });
    return !error;
  } catch {
    return false;
  }
}
