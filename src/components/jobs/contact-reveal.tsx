"use client";

import { useState } from "react";
import { Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getContactInfoAction } from "@/lib/actions/applications";

/** Coordonnées révélées à la demande, uniquement entre parties d'une mission attribuée. */
export function ContactReveal({ userId }: { userId: string }) {
  const [info, setInfo] = useState<{ email: string; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  if (info) {
    return (
      <div className="grid gap-1 text-sm">
        {info.phone && <a href={`tel:${info.phone}`} className="inline-flex items-center gap-2 text-primary hover:underline"><Phone className="size-4" /> {info.phone}</a>}
        <a href={`mailto:${info.email}`} className="inline-flex items-center gap-2 text-primary hover:underline"><Mail className="size-4" /> {info.email}</a>
      </div>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        const res = await getContactInfoAction(userId);
        setLoading(false);
        if (!res.ok || !res.data[0]) return toast.error(res.ok ? "Coordonnées indisponibles." : res.error);
        setInfo(res.data[0]);
      }}
    >
      <Phone /> Afficher les coordonnées
    </Button>
  );
}
