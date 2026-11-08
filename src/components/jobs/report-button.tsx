"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { reportAction } from "@/lib/actions/applications";

const REASONS = [
  ["spam", "Spam ou publicité"],
  ["fraud", "Arnaque ou fraude"],
  ["abuse", "Harcèlement ou propos abusifs"],
  ["inappropriate", "Contenu inapproprié"],
  ["safety", "Problème de sécurité"],
  ["other", "Autre"],
] as const;

export function ReportButton({ targetType, targetId, label = "Signaler" }: { targetType: "user" | "job" | "message" | "review"; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>("spam");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await reportAction({ targetType, targetId, reason, details });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    setOpen(false);
    setDetails("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler un contenu</DialogTitle>
          <DialogDescription>Votre signalement est confidentiel et examiné par l&apos;équipe de modération.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="report-reason">Motif</Label>
            <NativeSelect id="report-reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
              {REASONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="report-details">Détails (facultatif)</Label>
            <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} loading={loading}>Envoyer le signalement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
