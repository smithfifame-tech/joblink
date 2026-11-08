"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { startConversationAction } from "@/lib/actions/messages";

export function StartChatButton({ otherUserId, jobId, label = "Message", variant = "outline" }: { otherUserId: string; jobId: string; label?: string; variant?: ButtonProps["variant"] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="sm"
      variant={variant}
      loading={loading}
      onClick={async () => {
        setLoading(true);
        const res = await startConversationAction(otherUserId, jobId);
        setLoading(false);
        if (!res.ok) return toast.error(res.error);
        router.push(`/messages/${res.data}`);
      }}
    >
      <MessageSquare /> {label}
    </Button>
  );
}
