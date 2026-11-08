import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/admin/data-table";
import { ToggleReviewButton } from "@/components/admin/admin-actions";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/format";
import type { Review } from "@/types/db";

export const metadata = { title: "Avis" };

export default async function AdminReviewsPage() {
  await requireRole("admin");
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(200);
  const list = (data ?? []) as Review[];
  const ids = [...new Set(list.flatMap((r) => [r.reviewer_id, r.reviewee_id]))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, first_name, last_name").in("id", ids) : { data: [] };
  const name = (id: string) => { const p = (people ?? []).find((x) => x.id === id); return p ? `${p.first_name} ${p.last_name}` : "—"; };
  return (
    <>
      <PageHeader title="Avis" description="Modérez les avis contraires aux conditions d'utilisation." />
      <DataTable head={["Note", "Commentaire", "Auteur → Destinataire", "Date", "Visibilité", ""]}>
        {list.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap">{"★".repeat(r.rating)}<span className="text-gray-300">{"★".repeat(5 - r.rating)}</span></td>
            <td className="max-w-80">{r.comment ?? <span className="text-muted-foreground">—</span>}</td>
            <td>{name(r.reviewer_id)} → {name(r.reviewee_id)}</td>
            <td className="text-muted-foreground">{formatRelative(r.created_at)}</td>
            <td>{r.is_hidden ? <Badge variant="danger">Masqué</Badge> : <Badge>Visible</Badge>}</td>
            <td><ToggleReviewButton reviewId={r.id} hidden={r.is_hidden} /></td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
