import { PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { DataTable } from "@/components/admin/data-table";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/format";
import type { AuditLog } from "@/types/db";

export const metadata = { title: "Journaux d'activité" };
const PAGE = 50;

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireRole("admin");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await getSupabaseServerClient();
  const { data, count } = await supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const logs = (data ?? []) as AuditLog[];
  const actors = [...new Set(logs.map((l) => l.actor_id).filter(Boolean) as string[])];
  const { data: people } = actors.length ? await supabase.from("profiles").select("id, first_name, last_name").in("id", actors) : { data: [] };
  return (
    <>
      <PageHeader title="Journaux d'activité" description="Trace append-only de toutes les actions administratives et financières sensibles." />
      <DataTable head={["Date", "Acteur", "Action", "Entité", "Détails"]} minWidth={900}>
        {logs.map((l) => {
          const p = (people ?? []).find((x) => x.id === l.actor_id);
          return (
            <tr key={l.id}>
              <td className="whitespace-nowrap text-muted-foreground">{formatDateTime(l.created_at)}</td>
              <td>{p ? `${p.first_name} ${p.last_name}` : l.actor_id ? l.actor_id.slice(0, 8) : "Système"}</td>
              <td><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{l.action}</code></td>
              <td className="text-muted-foreground">{l.entity_type} {l.entity_id?.slice(0, 8)}</td>
              <td className="max-w-80 truncate font-mono text-xs text-muted-foreground">{JSON.stringify(l.metadata)}</td>
            </tr>
          );
        })}
      </DataTable>
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/audit-logs" />
    </>
  );
}
