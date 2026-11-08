"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/db";

/** Compteur de notifications non lues, mis à jour en temps réel (Supabase Realtime, filtré par RLS). */
export function NotificationBell({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new as Notification;
        setUnread((u) => u + 1);
        if (!location.pathname.startsWith("/messages") || n.type !== "new_message") {
          toast(n.title, { description: n.body ?? undefined, action: n.link ? { label: "Voir", onClick: () => (location.href = n.link!) } : undefined });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, async () => {
        const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
        setUnread(count ?? 0);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link href="/notifications" className="relative grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}>
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
