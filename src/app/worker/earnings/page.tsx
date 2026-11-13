import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime, formatXOF } from "@/lib/utils/format";
import { getCommissionLabel } from "@/services/catalog";
import type { Payment } from "@/types/db";

export const metadata = { title: "Revenus" };

const PAYOUT: Record<Payment["payout_status"], [string, "info" | "warning" | "default" | "danger"]> = {
  not_started: ["—", "info"],
  pending: ["Versement en attente", "warning"],
  completed: ["Versé", "default"],
  failed: ["Échec du versement", "danger"],
};

export default async function EarningsPage() {
  const user = await requireRole("worker");
  const rateLabel = await getCommissionLabel();
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("payments").select("*").eq("payee_id", user.id).in("status", ["succeeded", "refunded"]).order("paid_at", { ascending: false }).limit(200);
  const list = (data ?? []) as Payment[];
  const ok = list.filter((p) => p.status === "succeeded");
  const gross = ok.reduce((s, p) => s + Number(p.amount), 0);
  const commission = ok.reduce((s, p) => s + Number(p.commission_amount), 0);
  const net = ok.reduce((s, p) => s + Number(p.net_amount), 0);
  const pending = ok.filter((p) => p.payout_status !== "completed").reduce((s, p) => s + Number(p.net_amount), 0);
  const { data: jobs } = list.length ? await supabase.from("public_jobs").select("id, title").in("id", list.map((p) => p.job_id)) : { data: [] };
  const titles = new Map((jobs ?? []).map((j) => [j.id as string, j.title as string]));

  return (
    <>
      <PageHeader title="Revenus" description={`Montants nets après commission JOBLINK de ${rateLabel} et frais de paiement affichés.`} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Montant brut" value={formatXOF(gross)} icon={Wallet} />
        <StatCard label="Commissions" value={formatXOF(commission)} icon={Wallet} />
        <StatCard label="Revenus nets" value={formatXOF(net)} icon={Wallet} />
        <StatCard label="À verser" value={formatXOF(pending)} icon={Wallet} tone="warning" />
      </div>
      {list.length === 0 ? <EmptyState icon={Wallet} title="Pas encore de revenus" description="Vos paiements apparaîtront ici après validation et paiement par le client." /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>{["Mission", "Payée le", "Brut", "Commission", "Frais", "Net", "Versement"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">{titles.get(p.job_id) ?? "Mission"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(p.paid_at)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatXOF(p.amount)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatXOF(p.commission_amount)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatXOF(p.provider_fee_amount)}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{formatXOF(p.net_amount)}</td>
                  <td className="px-4 py-3">{p.status === "refunded" ? <Badge variant="secondary">Remboursé</Badge> : <Badge variant={PAYOUT[p.payout_status][1]}>{PAYOUT[p.payout_status][0]}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
