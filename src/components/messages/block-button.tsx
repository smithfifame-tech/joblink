"use client";

import { Ban, Unlock } from "lucide-react";
import { ConfirmAction } from "@/components/dashboard/confirm-action";
import { blockUserAction } from "@/lib/actions/messages";

export function BlockButton({ userId, blocked }: { userId: string; blocked: boolean }) {
  return blocked ? (
    <ConfirmAction label="Débloquer" icon={<Unlock />} size="sm" variant="ghost" title="Débloquer cet utilisateur ?" action={() => blockUserAction(userId, false)} />
  ) : (
    <ConfirmAction label="Bloquer" icon={<Ban />} size="sm" variant="ghost" title="Bloquer cet utilisateur ?" description="Il ne pourra plus vous écrire ni candidater à vos missions." destructive action={() => blockUserAction(userId, true)} />
  );
}
