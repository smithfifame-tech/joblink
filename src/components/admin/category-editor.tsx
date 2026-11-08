"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CategoryIcon, CATEGORY_ICON_NAMES } from "@/components/layout/category-icon";
import { adminSaveCategoryAction } from "@/lib/actions/admin";
import type { Category } from "@/types/db";

export function CategoryEditor({ category }: { category?: Category }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({
    slug: category?.slug ?? "",
    name: category?.name ?? "",
    description: category?.description ?? "",
    icon: category?.icon ?? "briefcase",
    sortOrder: category?.sort_order ?? 100,
    isActive: category?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  async function save() {
    setLoading(true);
    const res = await adminSaveCategoryAction({ ...v, id: category?.id });
    setLoading(false);
    if (!res.ok) return toast.error(res.fieldErrors ? Object.values(res.fieldErrors)[0]?.[0] ?? res.error : res.error);
    toast.success(res.message);
    setOpen(false);
    router.refresh();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{category ? <Button size="sm" variant="ghost"><Pencil /> Modifier</Button> : <Button><Plus /> Nouvelle catégorie</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{category ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label htmlFor="c-name">Nom</Label><Input id="c-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value, slug: category ? v.slug : e.target.value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="c-slug">Identifiant (URL)</Label><Input id="c-slug" value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="c-desc">Description</Label><Input id="c-desc" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="c-icon">Icône</Label>
              <div className="flex items-center gap-2"><CategoryIcon name={v.icon} className="size-5 text-primary" />
                <NativeSelect id="c-icon" value={v.icon} onChange={(e) => setV({ ...v, icon: e.target.value })}>{CATEGORY_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}</NativeSelect>
              </div>
            </div>
            <div className="grid gap-1.5"><Label htmlFor="c-order">Ordre</Label><Input id="c-order" type="number" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3"><Label htmlFor="c-active">Active</Label><Switch id="c-active" checked={v.isActive} onCheckedChange={(x) => setV({ ...v, isActive: x })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={save} loading={loading}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
