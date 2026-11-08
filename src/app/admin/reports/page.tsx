import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/admin/data-table";
import { ReportStatusButtons } from "@/components/admin/admin-actions";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/format";
import type { Report } from "@/types/db";

export const metadata = { title: "Signalements" };
const REASON: Record<string, string> = { spam: "Spam", fraud: "Fraude", abuse: "Abus", inappropriate: "Inapproprié", safety: "Sécurité", other: "Autre" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requireRole("admin");
  const all = Boolean((await searchParams).all);
  const supabase = await getSupabaseServerClient();
  let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
  if (!all) q = q.in("status", ["open", "reviewing"]);
  const { data } = await q;
  const list = (data ?? []) as Report[];
  const msgIds = list.filter((r) => r.target_type === "message").map((r) => r.target_id);
  const { data: msgs } = msgIds.length ? await supabase.from("messages").select("id, body").in("id", msgIds) : { data: [] };
  const { data: reporters } = list.length ? await supabase.from("profiles").select("id, first_name, last_name").in("id", list.map((r) => r.reporter_id)) : { data: [] };
  const target = (r: Report) => {
    if (r.target_type === "job") return <Link href={`/jobs/${r.target_id}`} className="text-primary underline">Mission</Link>;
    if (r.target_type === "user") return <Link href={`/admin/users?q=${r.target_id}`} className="text-primary underline">Utilisateur {r.target_id.slice(0, 8)}</Link>;
    if (r.target_type === "message") return <span className="italic">« {((msgs ?? []).find((m) => m.id === r.target_id)?.body as string)?.slice(0, 120) ?? "message"} »</span>;
    return <Link href="/admin/reviews" className="text-primary underline">Avis</Link>;
  };
  return (
    <>
      <PageHeader title="Signalements" actions={<Link href={all ? "/admin/reports" : "/admin/reports?all=1"} className="text-sm text-primary underline">{all ? "Non traités" : "Historique"}</Link>} />
      <DataTable head={["Cible", "Motif", "Détails", "Signalé par", "Quand", "Statut", "Actions"]} minWidth={1000}>
        {list.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground">Aucun signalement.</td></tr>}
        {list.map((r) => {
          const p = (reporters ?? []).find((x) => x.id === r.reporter_id);
          return (
            <tr key={r.id}>
              <td className="max-w-56">{target(r)}</td>
              <td><Badge variant="warning">{REASON[r.reason] ?? r.reason}</Badge></td>
              <td className="max-w-64 text-muted-foreground">{r.details ?? "—"}{r.resolution_note && <p className="mt-1 text-xs italic text-foreground">{r.resolution_note}</p>}</td>
              <td>{p ? `${p.first_name} ${p.last_name}` : "—"}</td>
              <td className="text-muted-foreground">{formatRelative(r.created_at)}</td>
              <td><Badge variant="secondary">{r.status}</Badge></td>
              <td>{["open", "reviewing"].includes(r.status) && <ReportStatusButtons reportId={r.id} />}</td>
            </tr>
          );
        })}
      </DataTable>
    </>
  );
}
