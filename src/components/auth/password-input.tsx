"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

export const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function PasswordInput(props, ref) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? "text" : "password"} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

/** Indicateur visuel de robustesse (la validation réelle est faite par Zod côté serveur). */
export function PasswordStrength({ value }: { value: string }) {
  const checks = [value.length >= 10, /[a-z]/.test(value) && /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)];
  const score = checks.filter(Boolean).length;
  const labels = ["Très faible", "Faible", "Moyen", "Bon", "Robuste"];
  const colors = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-primary"];
  if (!value) return null;
  return (
    <div className="grid gap-1" aria-live="polite">
      <div className="grid grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1 rounded-full ${i < score ? colors[score] : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Robustesse : {labels[score]}</p>
    </div>
  );
}
