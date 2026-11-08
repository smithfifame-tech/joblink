import { Logo } from "@/components/layout/logo";
import { PrintButton } from "./print-button";
import { formatDateTime, formatXOF } from "@/lib/utils/format";
import type { Payment } from "@/types/db";

export function ReceiptView({ payment, jobTitle, payer, payee }: { payment: Payment; jobTitle: string; payer: string; payee: string }) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex justify-end print:hidden"><PrintButton /></div>
      <div className="rounded-2xl border bg-background p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between">
          <Logo />
          <div className="text-right text-sm">
            <p className="font-semibold">Reçu de paiement</p>
            <p className="text-muted-foreground">{payment.receipt_number}</p>
          </div>
        </div>
        <dl className="mt-8 grid gap-2 text-sm">
          <Row k="Date" v={formatDateTime(payment.paid_at)} />
          <Row k="Mission" v={jobTitle} />
          <Row k="Payé par" v={payer} />
          <Row k="Prestataire" v={payee} />
          <Row k="Moyen" v={`${payment.provider === "sandbox" ? "Sandbox (test)" : payment.provider} · réf. ${payment.provider_reference ?? "—"}`} />
        </dl>
        <dl className="mt-6 grid gap-2 border-t pt-4 text-sm">
          <Row k="Montant de la mission" v={formatXOF(payment.amount)} strong />
          <Row k={`Commission JOBLINK (${(Number(payment.commission_rate) * 100).toLocaleString("fr-FR")} %)`} v={formatXOF(payment.commission_amount)} />
          <Row k="Frais du prestataire de paiement" v={formatXOF(payment.provider_fee_amount)} />
          <Row k="Montant net reversé au prestataire" v={formatXOF(payment.net_amount)} strong />
        </dl>
        {payment.provider === "sandbox" && <p className="mt-6 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Paiement de TEST (sandbox) — aucune somme réelle n&apos;a été débitée.</p>}
        <p className="mt-8 text-xs text-muted-foreground">Document généré par JOBLINK. Devise : franc CFA (XOF).</p>
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{v}</dd>
    </div>
  );
}
