"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, EyeOff, Eye, Loader2, Ban, RotateCcw, X, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  markContactAction,
  moderateJobAction,
  setIncidentAction,
  setSuspensionAction,
  updateReportAction,
} from "@/app/admin/joblink/actions";
import { Bot, CheckCheck, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = { ok: boolean; error?: string };

function useAct() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>, success: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(success);
      else toast.error(r.error ?? "Action impossible.");
    });
  return { pending, run };
}

const pill =
  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all duration-300 disabled:opacity-60 active:scale-[0.97]";

/** Suspendre / réactiver, avec confirmation intégrée (pas de boîte de dialogue navigateur). */
export function SuspendToggle({ userId, suspended, name }: { userId: string; suspended: boolean; name: string }) {
  const { pending, run } = useAct();
  const [confirming, setConfirming] = useState(false);
  if (suspended) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setSuspensionAction(userId, false), `${name} est réactivé·e.`)}
        className={cn(pill, "border-primary/30 bg-accent text-primary-strong hover:bg-primary hover:text-white")}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />} Réactiver
      </button>
    );
  }
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={cn(pill, "border-border bg-white text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700")}>
        <Ban className="size-3.5" /> Suspendre
      </button>
    );
  }
  return (
    <span className="inline-flex animate-[pop-in_.25s_ease-out_both] items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setSuspensionAction(userId, true, "Suspendu depuis le tableau de bord propriétaire"), `${name} est suspendu·e.`)}
        className={cn(pill, "border-red-200 bg-red-600 text-white hover:bg-red-700")}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Confirmer
      </button>
      <button type="button" onClick={() => setConfirming(false)} className={cn(pill, "border-border bg-white px-2 text-muted-foreground")} aria-label="Annuler">
        <X className="size-3.5" />
      </button>
    </span>
  );
}

export function JobVisibilityToggle({ jobId, hidden }: { jobId: string; hidden: boolean }) {
  const { pending, run } = useAct();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => moderateJobAction(jobId, !hidden), hidden ? "Mission de nouveau visible." : "Mission masquée.")}
      className={cn(
        pill,
        hidden
          ? "border-primary/30 bg-accent text-primary-strong hover:bg-primary hover:text-white"
          : "border-border bg-white text-muted-foreground hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800",
      )}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {hidden ? "Rendre visible" : "Masquer"}
    </button>
  );
}

export function ReportActions({ reportId }: { reportId: string }) {
  const { pending, run } = useAct();
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <button type="button" disabled={pending} onClick={() => run(() => updateReportAction(reportId, "resolved"), "Signalement résolu.")} className={cn(pill, "border-primary/30 bg-accent text-primary-strong hover:bg-primary hover:text-white")}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Résolu
      </button>
      <button type="button" disabled={pending} onClick={() => run(() => updateReportAction(reportId, "dismissed"), "Signalement classé.")} className={cn(pill, "border-border bg-white text-muted-foreground hover:bg-muted")}>
        <X className="size-3.5" /> Classer
      </button>
    </span>
  );
}

export function ContactHandled({ id }: { id: string }) {
  const { pending, run } = useAct();
  return (
    <button type="button" disabled={pending} onClick={() => run(() => markContactAction(id), "Message marqué comme traité.")} className={cn(pill, "border-border bg-white text-muted-foreground hover:border-primary/30 hover:bg-accent hover:text-primary-strong")}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Traité
    </button>
  );
}

export function UserSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        start(() => router.push(`/admin/joblink?tab=users${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`));
      }}
      className="flex w-full max-w-md items-center gap-2 rounded-full border border-border/80 bg-white p-1.5 pl-4 shadow-[var(--shadow-soft)] transition-shadow focus-within:ring-4 focus-within:ring-primary/15"
    >
      <Search className="size-4 shrink-0 text-primary" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nom, e-mail, téléphone, ville…"
        aria-label="Rechercher un utilisateur"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-strong">
        {pending && <Loader2 className="size-3.5 animate-spin" />} Rechercher
      </button>
    </form>
  );
}

/** Décision du propriétaire sur un incident : autoriser l'IA, ignorer, marquer résolu, rouvrir. */
export function IncidentActions({ id, status }: { id: string; status: "open" | "approved" | "fixing" | "resolved" | "dismissed" }) {
  const { pending, run } = useAct();
  const [confirming, setConfirming] = useState(false);
  if (status === "approved" || status === "fixing") {
    return (
      <button type="button" disabled={pending} onClick={() => run(() => setIncidentAction(id, "reopen"), "Autorisation retirée.")} className={cn(pill, "border-border bg-white text-muted-foreground hover:text-foreground")}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />} Retirer l&apos;autorisation
      </button>
    );
  }
  if (status === "resolved" || status === "dismissed") {
    return (
      <button type="button" disabled={pending} onClick={() => run(() => setIncidentAction(id, "reopen"), "Incident rouvert.")} className={cn(pill, "border-border bg-white text-muted-foreground hover:text-foreground")}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />} Rouvrir
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {confirming ? (
        <span className="inline-flex animate-[pop-in_.25s_ease-out_both] items-center gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setIncidentAction(id, "approve"), "Autorisé : l'IA va prendre en charge cet incident.")}
            className={cn(pill, "border-primary bg-primary text-white hover:bg-primary-strong")}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Confirmer
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={cn(pill, "border-border bg-white text-muted-foreground")} aria-label="Annuler">
            <X className="size-3.5" />
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={cn(pill, "border-primary/30 bg-accent text-primary-strong hover:bg-primary hover:text-white")}>
          <Bot className="size-3.5" /> Autoriser l&apos;IA à corriger
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => run(() => setIncidentAction(id, "resolve"), "Marqué comme résolu.")} className={cn(pill, "border-border bg-white text-muted-foreground hover:text-foreground")}>
        <CheckCheck className="size-3.5" /> Résolu
      </button>
      <button type="button" disabled={pending} onClick={() => run(() => setIncidentAction(id, "dismiss"), "Incident ignoré.")} className={cn(pill, "border-border bg-white text-muted-foreground hover:border-red-200 hover:text-red-700")}>
        <EyeOff className="size-3.5" /> Ignorer
      </button>
    </span>
  );
}
