import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ChatWindow } from "@/components/messages/chat-window";
import { BlockButton } from "@/components/messages/block-button";
import { ReportButton } from "@/components/jobs/report-button";
import { requireUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Conversation, ConversationMember, Message, MessageAttachment } from "@/types/db";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const supabase = await getSupabaseServerClient();
  const { data: conv } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle<Conversation>();
  if (!conv) notFound();
  const [{ data: members }, { data: msgs }, { data: atts }] = await Promise.all([
    supabase.from("conversation_members").select("*").eq("conversation_id", id),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("message_attachments").select("*").eq("conversation_id", id).limit(200),
  ]);
  const other = ((members ?? []) as ConversationMember[]).find((m) => m.user_id !== user.id);
  if (!other) notFound();
  const [{ data: profile }, { data: job }, { data: blocks }] = await Promise.all([
    supabase.from("public_profiles").select("first_name, last_initial").eq("id", other.user_id).maybeSingle(),
    conv.job_id ? supabase.from("public_jobs").select("id, title").eq("id", conv.job_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", other.user_id),
  ]);
  const attachments = (atts ?? []) as MessageAttachment[];
  const signed = attachments.length ? (await supabase.storage.from("message-attachments").createSignedUrls(attachments.map((a) => a.storage_path), 3600)).data ?? [] : [];
  const withUrls = attachments.map((a) => ({ ...a, url: signed.find((s) => s.path === a.storage_path)?.signedUrl ?? null }));
  const name = profile ? `${profile.first_name} ${profile.last_initial}` : "Utilisateur";
  const iBlocked = (blocks ?? []).length > 0;
  const backToJob = job ? (user.roles.includes("client") ? `/client/jobs/${job.id}` : `/jobs/${job.id}`) : null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="grid size-9 place-items-center rounded-lg hover:bg-muted" aria-label="Retour aux messages"><ArrowLeft className="size-4" /></Link>
          <div>
            <h1 className="font-semibold">{name}</h1>
            {job && backToJob && <Link href={backToJob} className="text-xs text-primary hover:underline">{job.title as string}</Link>}
          </div>
        </div>
        <div className="flex gap-1">
          <ReportButton targetType="user" targetId={other.user_id} />
          <BlockButton userId={other.user_id} blocked={iBlocked} />
        </div>
      </div>
      <ChatWindow
        conversationId={id}
        meId={user.id}
        otherId={other.user_id}
        otherName={name}
        initialMessages={((msgs ?? []) as Message[]).reverse()}
        initialAttachments={withUrls}
        otherLastReadAt={other.last_read_at}
        blocked={iBlocked}
      />
    </div>
  );
}
