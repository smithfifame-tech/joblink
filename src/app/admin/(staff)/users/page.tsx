import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { AdminSearch, DataTable } from "@/components/admin/data-table";
import { SuspendUserButton } from "@/components/admin/admin-actions";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";
import type { AppRole, Profile } from "@/types/db";

export const metadata = { title: "Utilisateurs" };
const PAGE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string; suspended?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await getSupabaseServerClient();
  let ids: string[] | null = null;
  if (sp.role === "client" || sp.role === "worker" || sp.role === "admin") {
    const { data } = await supabase.from("user_roles").select("user_id").eq("role", sp.role).limit(5000);
    ids = (data ?? []).map((r) => r.user_id as string);
  }
  let q = supabase.from("profiles").select("*", { count: "exact" });
  if (ids) q = q.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  if (sp.q) {
    const term = sp.q.replace(/[%,()]/g, " ").trim();
    q = q.or(`email.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%`);
  }
  if (sp.suspended === "1") q = q.eq("is_suspended", true);
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const users = (data ?? []) as Profile[];
  const { data: roles } = users.length ? await supabase.from("user_roles").select("user_id, role").in("user_id", users.map((u) => u.id)) : { data: [] };
  const roleOf = (id: string) => (roles ?? []).filter((r) => r.user_id === id).map((r) => r.role as AppRole);
  const title = sp.role === "client" ? "Clients" : sp.role === "worker" ? "Travailleurs" : sp.role === "admin" ? "Administrateurs" : "Utilisateurs";

  return (
    <>
      <PageHeader title={title} description={`${count ?? 0} compte(s)`} />
      <AdminSearch
        action="/admin/users"
        placeholder="Nom, e-mail, téléphone, ville…"
        defaultValue={sp.q}
        extra={
          <select name="role" defaultValue={sp.role ?? ""} className="h-10 rounded-lg border px-2 text-sm" aria-label="Rôle">
            <option value="">Tous les rôles</option><option value="client">Clients</option><option value="worker">Travailleurs</option><option value="admin">Admins</option>
          </select>
        }
      />
      <DataTable head={["Utilisateur", "Contact", "Rôles", "Localité", "Inscrit le", "Statut", "Actions"]}>
        {users.map((u) => (
          <tr key={u.id}>
            <td><p className="font-medium">{u.first_name} {u.last_name}</p><p className="text-xs text-muted-foreground">{u.id.slice(0, 8)}</p></td>
            <td><p>{u.email}</p><p className="text-xs text-muted-foreground">{u.phone ?? "—"}</p></td>
            <td><div className="flex flex-wrap gap-1">{roleOf(u.id).map((r) => <Badge key={r} variant={r === "admin" ? "dark" : "secondary"}>{r}</Badge>)}</div></td>
            <td className="text-muted-foreground">{[u.neighborhood, u.city].filter(Boolean).join(", ") || "—"}</td>
            <td className="text-muted-foreground">{formatDate(u.created_at)}</td>
            <td>{u.is_suspended ? <Badge variant="danger" title={u.suspended_reason ?? ""}>Suspendu</Badge> : <Badge>Actif</Badge>}</td>
            <td>{!roleOf(u.id).includes("admin") && <SuspendUserButton userId={u.id} suspended={u.is_suspended} />}</td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/users" params={{ q: sp.q, role: sp.role }} />
      <p className="mt-4 text-xs text-muted-foreground">Le rôle administrateur s&apos;attribue uniquement par procédure sécurisée (voir <Link className="underline" href="/admin/settings">Paramètres</Link> &gt; documentation).</p>
    </>
  );
}
