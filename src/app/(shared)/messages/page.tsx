import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { storagePublicUrl } from "@/lib/env";
import { formatRelative } from "@/lib/utils/format";
import type { Conversation, ConversationMember, PublicProfile } from "@/types/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const supabase = await getSupabaseServerClient();
  const { data: convs } = await supabase.from("conversations").select("*").order("last_message_at", { ascending: false, nullsFirst: false }).limit(100);
  const list = (convs ?? []) as Conversation[];
  const ids = list.map((c) => c.id);
  const [{ data: members }, { data: jobs }] = await Promise.all([
    ids.length ? supabase.from("conversation_members").select("*").in("conversation_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("public_jobs").select("id, title").in("id", list.map((c) => c.job_id).filter(Boolean) as string[]) : Promise.resolve({ data: [] }),
  ]);
  const mem = (members ?? []) as ConversationMember[];
  const otherIds = [...new Set(mem.filter((m) => m.user_id !== user.id).map((m) => m.user_id))];
  const { data: profiles } = otherIds.length ? await supabase.from("public_profiles").select("*").in("id", otherIds) : { data: [] };
  const pmap = new Map(((profiles ?? []) as PublicProfile[]).map((p) => [p.id, p]));
  const titles = new Map((jobs ?? []).map((j) => [j.id as string, j.title as string]));

  return (
    <>
      <PageHeader title="Messages" description="Échangez avec vos clients et travailleurs en temps réel." />
      {list.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Aucune conversation" description="Une conversation s'ouvre quand vous échangez au sujet d'une candidature ou d'une mission." />
      ) : (
        <Card className="divide-y">
          {list.map((c) => {
            const other = mem.find((m) => m.conversation_id === c.id && m.user_id !== user.id);
            const me = mem.find((m) => m.conversation_id === c.id && m.user_id === user.id);
            const p = other ? pmap.get(other.user_id) : undefined;
            const unread = c.last_message_at && (!me?.last_read_at || me.last_read_at < c.last_message_at);
            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/50">
                <Avatar className="size-11">
                  {p?.avatar_url && <AvatarImage src={storagePublicUrl("avatars", p.avatar_url) ?? undefined} alt="" />}
                  <AvatarFallback>{p?.first_name.charAt(0) ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>{p ? `${p.first_name} ${p.last_initial}` : "Utilisateur"}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{c.last_message_at ? formatRelative(c.last_message_at) : ""}</span>
                  </div>
                  {c.job_id && <p className="truncate text-xs text-primary">{titles.get(c.job_id) ?? "Mission"}</p>}
                  <p className={cn("truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>{c.last_message_preview ?? "Nouvelle conversation"}</p>
                </div>
                {unread && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="Non lu" />}
              </Link>
            );
          })}
        </Card>
      )}
    </>
  );
}
