import { Percent } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { DataTable } from "@/components/admin/data-table";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatXOF } from "@/lib/utils/format";

export const metadata = { title: "Commissions" };

export default async function AdminCommissionsPage() {
  await requireRole("admin");
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("payments").select("amount, commission_amount, provider_fee_amount, net_amount, paid_at").eq("status", "succeeded").order("paid_at", { ascending: false }).limit(5000);
  const rows = (data ?? []) as { amount: number; commission_amount: number; provider_fee_amount: number; net_amount: number; paid_at: string }[];
  const byMonth = new Map<string, { count: number; volume: number; commission: number; fees: number; net: number }>();
  for (const r of rows) {
    const k = r.paid_at.slice(0, 7);
    const m = byMonth.get(k) ?? { count: 0, volume: 0, commission: 0, fees: 0, net: 0 };
    m.count += 1; m.volume += Number(r.amount); m.commission += Number(r.commission_amount); m.fees += Number(r.provider_fee_amount); m.net += Number(r.net_amount);
    byMonth.set(k, m);
  }
  const total = rows.reduce((s, r) => s + Number(r.commission_amount), 0);
  const volume = rows.reduce((s, r) => s + Number(r.amount), 0);
  const monthLabel = (k: string) => new Date(`${k}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Commissions" description="5 % prélevés sur chaque mission payée." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Commissions totales" value={formatXOF(total)} icon={Percent} />
        <StatCard label="Volume payé" value={formatXOF(volume)} icon={Percent} />
        <StatCard label="Taux effectif" value={volume ? `${((total / volume) * 100).toFixed(2).replace(".", ",")} %` : "—"} icon={Percent} />
      </div>
      <DataTable head={["Mois", "Paiements", "Volume", "Commissions", "Frais prestataire", "Reversé aux travailleurs"]}>
        {[...byMonth.entries()].map(([k, m]) => (
          <tr key={k}>
            <td className="capitalize">{monthLabel(k)}</td><td>{m.count}</td><td className="tabular-nums">{formatXOF(m.volume)}</td>
            <td className="font-medium tabular-nums">{formatXOF(m.commission)}</td><td className="tabular-nums">{formatXOF(m.fees)}</td><td className="tabular-nums">{formatXOF(m.net)}</td>
          </tr>
        ))}
        {byMonth.size === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground">Aucun paiement confirmé.</td></tr>}
      </DataTable>
    </>
  );
}
