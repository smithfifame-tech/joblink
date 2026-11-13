"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Scale, Search, Send, ShieldCheck, X } from "lucide-react";
import { recordPayoutAction, resolveDisputeAction, reviewVerificationAction } from "@/app/admin/joblink/actions";
import { cn } from "@/lib/utils";

type Result = { ok: boolean; error?: string };

function useAct() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>, success: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(success);
        after?.();
      } else toast.error(r.error ?? "Action impossible.");
    });
  return { pending, run };
}

const pill =
  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all duration-300 disabled:opacity-60 active:scale-[0.97]";
const input =
  "h-9 w-full rounded-full border bg-white px-3.5 text-xs outline-none transition-shadow focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

/** Recherche dans un onglet du tableau de bord (conserve l'onglet, repart à la page 1). */
export function TabSearch({ tab, placeholder, defaultValue, keep }: { tab: string; placeholder: string; defaultValue?: string; keep?: Record<string, string | undefined> }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue ?? "");
  const [pending, start] = useTransition();
  const submit = (value: string) => {
    const sp = new URLSearchParams({ tab });
    for (const [k, v] of Object.entries(keep ?? {})) if (v) sp.set(k, v);
    if (value.trim()) sp.set("q", value.trim());
    start(() => router.push(`/admin/joblink?${sp.toString()}`));
  };
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit(q);
      }}
      className="flex w-full max-w-md items-center gap-2 rounded-full border border-border/80 bg-white p-1.5 pl-4 shadow-[var(--shadow-soft)] transition-shadow focus-within:ring-4 focus-within:ring-primary/15"
    >
      <Search className="size-4 shrink-0 text-primary" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {q && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => {
            setQ("");
            submit("");
          }}
          className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      )}
      <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-strong">
        {pending && <Loader2 className="size-3.5 animate-spin" />} Rechercher
      </button>
    </form>
  );
}

/** Enregistrement d'un versement Mobile Money effectué au travailleur. */
export function PayoutForm({ paymentId, amount, phone }: { paymentId: string; amount: string; phone: string | null }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(pill, "border-primary bg-primary text-white hover:bg-primary-strong")}>
        <Send className="size-3.5" /> Enregistrer le versement
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => recordPayoutAction(paymentId, ref), "Versement enregistré. Le travailleur est notifié.", () => setOpen(false));
      }}
      className="grid w-full animate-[pop-in_.25s_ease-out_both] gap-2 rounded-2xl border border-primary/20 bg-accent/40 p-3 sm:w-80"
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        Envoyez <strong className="text-foreground">{amount}</strong> par Mobile Money{phone ? <> au <strong className="text-foreground">{phone}</strong></> : null}, puis collez la référence de la transaction.
      </p>
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Référence MTN MoMo / Moov Money" aria-label="Référence de la transaction" className={input} autoFocus required minLength={3} maxLength={120} />
      <div className="flex gap-1.5">
        <button type="submit" disabled={pending} className={cn(pill, "border-primary bg-primary text-white hover:bg-primary-strong")}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Confirmer
        </button>
        <button type="button" onClick={() => setOpen(false)} className={cn(pill, "border-border bg-white text-muted-foreground")}>
          Annuler
        </button>
      </div>
    </form>
  );
}

const DECISIONS = [
  { value: "under_review", label: "Je prends le dossier en charge (examen)" },
  { value: "resolved_worker", label: "En faveur du travailleur : travail considéré comme réalisé" },
  { value: "resolved_client", label: "En faveur du client : contrat annulé" },
  { value: "closed", label: "Clore sans décision" },
];

/** Décision motivée sur un litige (le texte est envoyé aux deux parties). */
export function DisputeDecision({ disputeId, underReview }: { disputeId: string; underReview: boolean }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(underReview ? "resolved_worker" : "under_review");
  const [decision, setDecision] = useState("");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(pill, "border-primary/30 bg-accent text-primary-strong hover:bg-primary hover:text-white")}>
        <Scale className="size-3.5" /> Prendre une décision
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => resolveDisputeAction(disputeId, status, decision), "Décision enregistrée et transmise aux parties.", () => setOpen(false));
      }}
      className="grid animate-[pop-in_.25s_ease-out_both] gap-2 rounded-2xl border bg-muted/40 p-3"
    >
      <label className="grid gap-1 text-xs font-semibold">
        Décision
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-xl border bg-white px-3 text-xs font-medium outline-none focus:border-primary/50">
          {DECISIONS.filter((d) => !(underReview && d.value === "under_review")).map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        {status === "under_review" ? "Note (visible dans le journal)" : "Explication envoyée aux deux parties"}
        <textarea
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          rows={3}
          minLength={5}
          maxLength={2000}
          required
          className="rounded-xl border bg-white p-3 text-sm font-normal outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          placeholder="Ex. : Les photos de fin de chantier montrent un travail conforme à la demande."
        />
      </label>
      {status === "resolved_client" && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Si le client a déjà payé, effectuez le remboursement chez le prestataire de paiement.</p>
      )}
      <div className="flex gap-1.5">
        <button type="submit" disabled={pending} className={cn(pill, "border-primary bg-primary text-white hover:bg-primary-strong")}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Valider la décision
        </button>
        <button type="button" onClick={() => setOpen(false)} className={cn(pill, "border-border bg-white text-muted-foreground")}>
          Annuler
        </button>
      </div>
    </form>
  );
}

/** Approbation / refus motivé d'une pièce d'identité. */
export function VerificationDecision({ requestId, name }: { requestId: string; name: string }) {
  const { pending, run } = useAct();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  if (rejecting) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => reviewVerificationAction(requestId, false, reason), "Demande refusée. Le travailleur est informé.", () => setRejecting(false));
        }}
        className="grid w-full animate-[pop-in_.25s_ease-out_both] gap-2 sm:w-80"
      >
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison communiquée au travailleur" aria-label="Raison du refus" className={input} autoFocus required maxLength={500} />
        <div className="flex gap-1.5">
          <button type="submit" disabled={pending} className={cn(pill, "border-red-200 bg-red-600 text-white hover:bg-red-700")}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />} Refuser
          </button>
          <button type="button" onClick={() => setRejecting(false)} className={cn(pill, "border-border bg-white text-muted-foreground")}>
            Annuler
          </button>
        </div>
      </form>
    );
  }
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => reviewVerificationAction(requestId, true), `${name} reçoit le badge « Vérifié ».`)}
        className={cn(pill, "border-primary bg-primary text-white hover:bg-primary-strong")}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />} Approuver
      </button>
      <button type="button" onClick={() => setRejecting(true)} className={cn(pill, "border-border bg-white text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700")}>
        <X className="size-3.5" /> Refuser
      </button>
    </span>
  );
}
