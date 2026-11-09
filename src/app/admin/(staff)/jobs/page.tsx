import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { AdminSearch, DataTable } from "@/components/admin/data-table";
import { ModerateJobButton } from "@/components/admin/admin-actions";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatXOF } from "@/lib/utils/format";
import type { Job, JobStatus } from "@/types/db";

export const metadata = { title: "Missions" };
const PAGE = 25;
const GROUPS: Record<string, JobStatus[]> = { open: ["published", "reviewing"], active: ["assigned", "in_progress"], completed: ["completed"], disputed: ["disputed"], cancelled: ["cancelled"], draft: ["draft"] };

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; hidden?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await getSupabaseServerClient();
  let q = supabase.from("jobs").select("*", { count: "exact" });
  if (sp.status && GROUPS[sp.status]) q = q.in("status", GROUPS[sp.status]!);
  if (sp.hidden === "1") q = q.eq("is_hidden", true);
  if (sp.q) q = q.ilike("title", `%${sp.q.replace(/[%_]/g, "")}%`);
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const jobs = (data ?? []) as Job[];
  const { data: owners } = jobs.length ? await supabase.from("profiles").select("id, first_name, last_name").in("id", jobs.map((j) => j.client_id)) : { data: [] };
  const owner = (id: string) => (owners ?? []).find((o) => o.id === id);

  return (
    <>
      <PageHeader title="Missions" description={`${count ?? 0} mission(s)`} />
      <AdminSearch action="/admin/jobs" placeholder="Titre de mission…" defaultValue={sp.q} extra={
        <select name="status" defaultValue={sp.status ?? ""} className="h-10 rounded-lg border px-2 text-sm" aria-label="Statut">
          <option value="">Tous statuts</option><option value="open">Ouvertes</option><option value="active">En cours</option><option value="completed">Terminées</option><option value="disputed">En litige</option><option value="cancelled">Annulées</option><option value="draft">Brouillons</option>
        </select>
      } />
      <DataTable head={["Mission", "Client", "Budget", "Ville", "Créée", "Statut", "Modération"]}>
        {jobs.map((j) => {
          const o = owner(j.client_id);
          return (
            <tr key={j.id}>
              <td className="max-w-64"><Link href={`/jobs/${j.id}`} className="font-medium hover:text-primary">{j.title}</Link><p className="text-xs text-muted-foreground">{j.applications_count} candidature(s)</p></td>
              <td>{o ? `${o.first_name} ${o.last_name}` : "—"}</td>
              <td className="tabular-nums">{formatXOF(j.budget_amount)}</td>
              <td>{j.city}</td>
              <td className="text-muted-foreground">{formatDate(j.created_at)}</td>
              <td><div className="flex flex-col gap-1"><JobStatusBadge status={j.status} />{j.is_hidden && <Badge variant="danger">Masquée</Badge>}</div></td>
              <td><ModerateJobButton jobId={j.id} hidden={j.is_hidden} /></td>
            </tr>
          );
        })}
      </DataTable>
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/jobs" params={{ q: sp.q, status: sp.status }} />
    </>
  );
}
