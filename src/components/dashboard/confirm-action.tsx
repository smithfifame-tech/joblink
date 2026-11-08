"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/errors";

/**
 * Bouton d'action avec modale de confirmation (et champ texte facultatif).
 * `action` reçoit la valeur saisie et retourne un ActionResult.
 */
export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel = "Confirmer",
  action,
  input,
  variant = "default",
  size,
  icon,
  destructive,
  onDone,
}: {
  label: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  action: (text: string) => Promise<ActionResult<unknown>>;
  input?: { label: string; placeholder?: string; required?: boolean; minLength?: number };
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  icon?: React.ReactNode;
  destructive?: boolean;
  onDone?: (data: unknown) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const invalid = Boolean(input?.required) && text.trim().length < (input?.minLength ?? 3);

  async function run() {
    setLoading(true);
    const res = await action(text);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message ?? "C'est fait.");
    setOpen(false);
    setText("");
    onDone?.(res.data);
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size}>{icon}{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {input && (
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-input">{input.label}{input.required && <span className="text-destructive">*</span>}</Label>
            <Textarea id="confirm-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={input.placeholder} rows={3} maxLength={2000} />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <Button variant={destructive ? "destructive" : "default"} onClick={run} loading={loading} disabled={invalid}>{confirmLabel}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
