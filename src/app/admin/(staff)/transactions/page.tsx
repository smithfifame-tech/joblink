import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { DataTable } from "@/components/admin/data-table";
import { PayoutButtons } from "@/components/admin/admin-actions";
import { PaymentStatusBadge } from "@/components/jobs/status-badge";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime, formatXOF } from "@/lib/utils/format";
import type { Payment, PaymentStatus } from "@/types/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Transactions" };
const PAGE = 25;

export default async function AdminTransactionsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; payout?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await getSupabaseServerClient();
  let q = supabase.from("payments").select("*", { count: "exact" });
  if (sp.status === "pending") q = q.in("status", ["pending", "processing"]);
  else if (sp.status) q = q.eq("status", sp.status as PaymentStatus);
  if (sp.payout === "pending") q = q.eq("status", "succeeded").eq("payout_status", "pending");
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const list = (data ?? []) as Payment[];
  const ids = [...new Set(list.flatMap((p) => [p.payer_id, p.payee_id]))];
  const [{ data: people }, { data: jobs }] = await Promise.all([
    ids.length ? supabase.from("profiles").select("id, first_name, last_name, phone").in("id", ids) : Promise.resolve({ data: [] }),
    list.length ? supabase.from("jobs").select("id, title").in("id", list.map((p) => p.job_id)) : Promise.resolve({ data: [] }),
  ]);
  const name = (id: string) => {
    const p = (people ?? []).find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : "—";
  };
  const tabs = [["", "Toutes"], ["pending", "En attente"], ["succeeded", "Réussies"], ["failed", "Échouées"], ["refunded", "Remboursées"]];

  return (
    <>
      <PageHeader title="Transactions" description="Paiements confirmés uniquement par webhook signé. Montants issus des contrats en base." />
      <nav className="mb-4 flex flex-wrap gap-1" aria-label="Filtrer">
        {tabs.map(([k, l]) => <Link key={k} href={`/admin/transactions${k ? `?status=${k}` : ""}`} className={cn("rounded-full border px-3 py-1.5 text-sm", (sp.status ?? "") === k && !sp.payout ? "border-primary bg-accent font-medium" : "text-muted-foreground hover:bg-muted")}>{l}</Link>)}
        <Link href="/admin/transactions?payout=pending" className={cn("rounded-full border px-3 py-1.5 text-sm", sp.payout ? "border-primary bg-accent font-medium" : "text-muted-foreground hover:bg-muted")}>Versements à effectuer</Link>
      </nav>
      <DataTable head={["Date", "Mission", "Payeur → Bénéficiaire", "Montant", "Commission", "Net", "Prestataire", "Statut", "Versement"]} minWidth={1100}>
        {list.map((p) => (
          <tr key={p.id}>
            <td className="whitespace-nowrap text-muted-foreground">{formatDateTime(p.paid_at ?? p.created_at)}</td>
            <td className="max-w-48 truncate">{((jobs ?? []).find((j) => j.id === p.job_id)?.title as string) ?? "—"}</td>
            <td>{name(p.payer_id)} → {name(p.payee_id)}</td>
            <td className="tabular-nums">{formatXOF(p.amount)}</td>
            <td className="tabular-nums">{formatXOF(p.commission_amount)}</td>
            <td className="font-medium tabular-nums">{formatXOF(p.net_amount)}</td>
            <td><p>{p.provider}</p><p className="text-xs text-muted-foreground">{p.provider_reference ?? "—"}</p>{p.receipt_number && <p className="text-xs text-muted-foreground">{p.receipt_number}</p>}</td>
            <td><PaymentStatusBadge status={p.status} />{p.failure_reason && <p className="mt-1 text-xs text-muted-foreground">{p.failure_reason}</p>}</td>
            <td>
              {p.status === "succeeded" && p.payout_status === "completed" && <Badge>Versé · {p.payout_reference}</Badge>}
              {p.status === "succeeded" && p.payout_status !== "completed" && <PayoutButtons paymentId={p.id} />}
            </td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/transactions" params={{ status: sp.status, payout: sp.payout }} />
    </>
  );
}
