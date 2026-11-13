import Link from "next/link";
import { Receipt, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PayButton } from "@/components/jobs/pay-button";
import { PaymentStatusBadge } from "@/components/jobs/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCommissionRates } from "@/services/catalog";
import { reconcilePayment } from "@/services/payments";
import { computeBreakdown } from "@/lib/payments/commission";
import { getActiveAdapter, isPaymentConfigured } from "@/lib/payments/registry";
import { formatDateTime, formatXOF } from "@/lib/utils/format";
import type { Contract, Payment } from "@/types/db";

export const metadata = { title: "Paiements" };

export default async function ClientPaymentsPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const user = await requireRole("client");
  const { payment: returned } = await searchParams;
  const supabase = await getSupabaseServerClient();
  if (returned && /^[0-9a-f-]{36}$/i.test(returned)) {
    // Rapprochement uniquement pour un paiement de cet utilisateur (lecture soumise à RLS)
    const { data: mine } = await supabase.from("payments").select("id, provider").eq("id", returned).eq("payer_id", user.id).maybeSingle();
    if (mine) await reconcilePayment(mine.id as string, mine.provider as string);
  }

  const [{ data: payments }, { data: contracts }, rates] = await Promise.all([
    supabase.from("payments").select("*").eq("payer_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("contracts").select("*").eq("client_id", user.id).eq("status", "completed"),
    getCommissionRates(),
  ]);
  const list = (payments ?? []) as Payment[];
  const paid = new Set(list.filter((p) => p.status === "succeeded" || p.status === "refunded").map((p) => p.contract_id));
  const due = ((contracts ?? []) as Contract[]).filter((c) => !paid.has(c.id));
  const jobIds = [...new Set([...list.map((p) => p.job_id), ...due.map((c) => c.job_id)])];
  const { data: jobs } = jobIds.length ? await supabase.from("jobs").select("id, title").in("id", jobIds) : { data: [] };
  const titles = new Map((jobs ?? []).map((j) => [j.id as string, j.title as string]));
  const total = list.filter((p) => p.status === "succeeded").reduce((s, p) => s + Number(p.amount), 0);
  const returnedPayment = list.find((p) => p.id === returned);
  const enabled = isPaymentConfigured();

  return (
    <>
      <PageHeader title="Paiements" description={`Total payé : ${formatXOF(total)}`} />
      {returnedPayment && (
        <Alert className="mb-4" variant={returnedPayment.status === "succeeded" ? "success" : returnedPayment.status === "failed" ? "error" : "info"}>
          {returnedPayment.status === "succeeded" ? "Paiement confirmé. Merci !" : returnedPayment.status === "failed" ? "Le paiement a échoué. Vous pouvez réessayer." : "Paiement en cours de confirmation par le prestataire. Cette page se mettra à jour."}
        </Alert>
      )}
      {due.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>À payer</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {!enabled && <Alert variant="warning">Le paiement en ligne n&apos;est pas encore activé sur cette instance.</Alert>}
            {due.map((c) => {
              const b = computeBreakdown(c.agreed_amount, rates.commission, rates.providerFee);
              return (
                <div key={c.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/client/jobs/${c.job_id}`} className="font-medium hover:text-primary">{titles.get(c.job_id)}</Link>
                    <p className="text-xs text-muted-foreground">Validée le {formatDateTime(c.completed_at)}</p>
                  </div>
                  {enabled && <PayButton contractId={c.id} amount={b.amount} commission={b.commission} providerFee={b.providerFee} net={b.net} rate={rates.commission} methods={getActiveAdapter().methods} />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {list.length === 0 ? (
        <EmptyState icon={Wallet} title="Aucun paiement" description="Vous paierez une mission uniquement après avoir validé le travail réalisé." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">Mission</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Montant</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 font-medium"><span className="sr-only">Reçu</span></th></tr>
            </thead>
            <tbody className="divide-y">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">{titles.get(p.job_id) ?? "Mission"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">{formatXOF(p.amount)}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right">{p.status === "succeeded" && <Link href={`/client/payments/${p.id}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Receipt className="size-4" /> Reçu</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
