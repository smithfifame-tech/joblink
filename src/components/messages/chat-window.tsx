"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, FileText, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { markConversationReadAction, sendMessageAction } from "@/lib/actions/messages";
import { safeStorageName, validateFile } from "@/lib/validations/profile";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import type { Message, MessageAttachment } from "@/types/db";
import { cn } from "@/lib/utils";

type Att = MessageAttachment & { url?: string | null };

export function ChatWindow({
  conversationId,
  meId,
  otherId,
  otherName,
  initialMessages,
  initialAttachments,
  otherLastReadAt,
  blocked,
}: {
  conversationId: string;
  meId: string;
  otherId: string;
  otherName: string;
  initialMessages: Message[];
  initialAttachments: Att[];
  otherLastReadAt: string | null;
  blocked: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [attachments, setAttachments] = useState<Att[]>(initialAttachments);
  const [otherRead, setOtherRead] = useState(otherLastReadAt);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    void markConversationReadAction(conversationId);
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as Message;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.sender_id !== meId) void markConversationReadAction(conversationId);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const row = payload.new as { user_id: string; last_read_at: string | null };
        if (row.user_id === otherId) setOtherRead(row.last_read_at);
      })
      .subscribe();
    // Pièces jointes des nouveaux messages (liens signés, bucket privé)
    const attChannel = supabase
      .channel(`attachments:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_attachments", filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
        const a = payload.new as MessageAttachment;
        const { data } = await supabase.storage.from("message-attachments").createSignedUrl(a.storage_path, 3600);
        setAttachments((prev) => (prev.some((x) => x.id === a.id) ? prev : [...prev, { ...a, url: data?.signedUrl ?? null }]));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
      void supabase.removeChannel(attChannel);
    };
  }, [conversationId, meId, otherId, supabase]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim() || (file ? `📎 ${file.name}` : "");
    if (!text) return;
    setSending(true);
    let attachment: { storagePath: string; fileName: string; mimeType: string; sizeBytes: number } | undefined;
    if (file) {
      const err = validateFile(file, "attachment");
      if (err) {
        setSending(false);
        return toast.error(err);
      }
      const path = `${conversationId}/${meId}/${safeStorageName(file.name, file.type)}`;
      const { error } = await supabase.storage.from("message-attachments").upload(path, file, { contentType: file.type });
      if (error) {
        setSending(false);
        return toast.error("Envoi de la pièce jointe impossible.");
      }
      attachment = { storagePath: path, fileName: file.name.slice(0, 200), mimeType: file.type, sizeBytes: file.size };
    }
    const res = await sendMessageAction({ conversationId, body: text }, attachment);
    setSending(false);
    if (!res.ok) return toast.error(res.error);
    setMessages((prev) => (prev.some((x) => x.id === res.data.id) ? prev : [...prev, { id: res.data.id, conversation_id: conversationId, sender_id: meId, body: text, kind: "text", created_at: new Date().toISOString() }]));
    setBody("");
    setFile(null);
  }

  let lastDay = "";
  return (
    <div className="flex h-[calc(100dvh-220px)] min-h-[420px] flex-col rounded-xl border bg-background">
      <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite" aria-label={`Conversation avec ${otherName}`}>
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Commencez la conversation. Restez courtois et ne partagez pas de codes Mobile Money.</p>}
        {messages.map((m) => {
          const day = formatDate(m.created_at, "EEEE d MMMM");
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.sender_id === meId;
          const atts = attachments.filter((a) => a.message_id === m.id);
          const read = mine && otherRead && otherRead >= m.created_at;
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-xs capitalize text-muted-foreground">{day}</p>}
              {m.kind === "system" ? (
                <p className="mx-auto max-w-md rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">{m.body}</p>
              ) : (
                <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-muted")}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    {atts.map((a) => (
                      <a key={a.id} href={a.url ?? "#"} target="_blank" rel="noopener noreferrer" className={cn("mt-1 flex items-center gap-1 underline", mine ? "text-green-50" : "text-primary")}>
                        <FileText className="size-3.5" /> {a.file_name}
                      </a>
                    ))}
                    <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px]", mine ? "text-green-100" : "text-muted-foreground")} title={formatDateTime(m.created_at)}>
                      {formatDate(m.created_at, "HH:mm")}
                      {mine && (read ? <CheckCheck className="size-3" aria-label="Lu" /> : <Check className="size-3" aria-label="Envoyé" />)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {blocked ? (
        <p className="border-t p-4 text-center text-sm text-muted-foreground">Vous ne pouvez plus échanger dans cette conversation (utilisateur bloqué).</p>
      ) : (
        <form onSubmit={send} className="grid gap-2 border-t p-3">
          {file && (
            <p className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
              <span className="truncate">📎 {file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="Retirer la pièce jointe"><X className="size-3.5" /></button>
            </p>
          )}
          <div className="flex items-end gap-2">
            <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Joindre un fichier">
              <Paperclip className="size-5" />
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(e);
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Écrire un message…"
              aria-label="Message"
              className="min-h-10 resize-none"
            />
            <Button type="submit" size="icon" loading={sending} aria-label="Envoyer">{!sending && <Send />}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
