"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "@/lib/actions/messages";

export function MarkAllRead() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button variant="outline" loading={loading} onClick={async () => {
      setLoading(true);
      await markNotificationsReadAction();
      setLoading(false);
      router.refresh();
    }}><CheckCheck /> Tout marquer comme lu</Button>
  );
}
