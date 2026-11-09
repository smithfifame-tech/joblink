import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/admin/data-table";
import { DisputeButtons } from "@/components/admin/admin-actions";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/format";
import type { Dispute } from "@/types/db";

export const metadata = { title: "Litiges" };
const LABEL: Record<Dispute["status"], string> = { open: "Ouvert", under_review: "En examen", resolved_client: "Résolu (client)", resolved_worker: "Résolu (travailleur)", closed: "Clos" };

export default async function AdminDisputesPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requireRole("admin");
  const all = Boolean((await searchParams).all);
  const supabase = await getSupabaseServerClient();
  let q = supabase.from("disputes").select("*").order("created_at", { ascending: false }).limit(200);
  if (!all) q = q.in("status", ["open", "under_review"]);
  const { data } = await q;
  const list = (data ?? []) as Dispute[];
  const ids = [...new Set(list.flatMap((d) => [d.opened_by, d.against_id]))];
  const [{ data: people }, { data: jobs }] = await Promise.all([
    ids.length ? supabase.from("profiles").select("id, first_name, last_name").in("id", ids) : Promise.resolve({ data: [] }),
    list.length ? supabase.from("jobs").select("id, title").in("id", list.map((d) => d.job_id)) : Promise.resolve({ data: [] }),
  ]);
  const name = (id: string) => { const p = (people ?? []).find((x) => x.id === id); return p ? `${p.first_name} ${p.last_name}` : "—"; };
  return (
    <>
      <PageHeader title="Litiges" actions={<Link href={all ? "/admin/disputes" : "/admin/disputes?all=1"} className="text-sm text-primary underline">{all ? "Litiges actifs" : "Historique complet"}</Link>} />
      <DataTable head={["Mission", "Ouvert par", "Contre", "Motif", "Depuis", "Statut", "Décision"]} minWidth={1000}>
        {list.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground">Aucun litige.</td></tr>}
        {list.map((d) => (
          <tr key={d.id}>
            <td className="max-w-48"><Link href={`/jobs/${d.job_id}`} className="font-medium hover:text-primary">{((jobs ?? []).find((j) => j.id === d.job_id)?.title as string) ?? "—"}</Link></td>
            <td>{name(d.opened_by)}</td><td>{name(d.against_id)}</td>
            <td className="max-w-64"><p>{d.reason}</p>{d.details && d.details !== d.reason && <p className="text-xs text-muted-foreground">{d.details}</p>}{d.resolution_note && <p className="mt-1 text-xs italic">Décision : {d.resolution_note}</p>}</td>
            <td className="text-muted-foreground">{formatRelative(d.created_at)}</td>
            <td><Badge variant={d.status === "open" ? "danger" : d.status === "under_review" ? "warning" : "secondary"}>{LABEL[d.status]}</Badge></td>
            <td>{["open", "under_review"].includes(d.status) && <DisputeButtons disputeId={d.id} />}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
