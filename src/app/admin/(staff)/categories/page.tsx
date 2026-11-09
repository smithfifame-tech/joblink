import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/admin/data-table";
import { CategoryEditor } from "@/components/admin/category-editor";
import { CategoryIcon } from "@/components/layout/category-icon";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Category } from "@/types/db";

export const metadata = { title: "Catégories" };

export default async function AdminCategoriesPage() {
  await requireRole("admin");
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("categories").select("*").order("sort_order");
  return (
    <>
      <PageHeader title="Catégories" actions={<CategoryEditor />} />
      <DataTable head={["", "Nom", "Identifiant", "Description", "Ordre", "Statut", ""]}>
        {((data ?? []) as Category[]).map((c) => (
          <tr key={c.id}>
            <td><CategoryIcon name={c.icon} className="size-5 text-primary" /></td>
            <td className="font-medium">{c.name}</td>
            <td><code className="text-xs">{c.slug}</code></td>
            <td className="max-w-72 text-muted-foreground">{c.description}</td>
            <td>{c.sort_order}</td>
            <td>{c.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</td>
            <td><CategoryEditor category={c} /></td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
