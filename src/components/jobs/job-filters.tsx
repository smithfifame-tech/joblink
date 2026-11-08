import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RADIUS_OPTIONS } from "@/lib/maps/places";
import type { Category } from "@/types/db";
import type { JobSearchParams } from "@/lib/validations/jobs";

/** Filtres en formulaire GET : fonctionnent sans JavaScript (connexions lentes). */
export function JobFilters({ categories, params, action = "/jobs" }: { categories: Category[]; params: JobSearchParams; action?: string }) {
  const hasGeo = params.lat !== undefined && params.lng !== undefined;
  return (
    <form method="get" action={action} className="grid gap-4 rounded-xl border p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <SlidersHorizontal className="size-4" /> Filtres
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="f-q">Mot-clé</Label>
        <Input id="f-q" name="q" defaultValue={params.q} placeholder="ex. électricien" maxLength={100} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="f-cat">Catégorie</Label>
        <NativeSelect id="f-cat" name="category" defaultValue={params.category ?? ""}>
          <option value="">Toutes</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="f-city">Ville ou quartier</Label>
        <Input id="f-city" name="city" defaultValue={params.city} list="jl-cities" placeholder="ex. Cotonou" />
      </div>
      {hasGeo && (
        <div className="grid gap-1.5">
          <Label htmlFor="f-radius">Rayon autour de moi</Label>
          <NativeSelect id="f-radius" name="radius" defaultValue={String(params.radius ?? 10)}>
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </NativeSelect>
          <input type="hidden" name="lat" value={params.lat} />
          <input type="hidden" name="lng" value={params.lng} />
        </div>
      )}
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Budget (FCFA)</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input name="min" type="number" inputMode="numeric" min={0} step={500} defaultValue={params.min} placeholder="Min" aria-label="Budget minimum" />
          <Input name="max" type="number" inputMode="numeric" min={0} step={500} defaultValue={params.max} placeholder="Max" aria-label="Budget maximum" />
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="f-mode">Mode de réalisation</Label>
        <NativeSelect id="f-mode" name="mode" defaultValue={params.mode ?? ""}>
          <option value="">Tous</option>
          <option value="on_site">Sur place</option>
          <option value="remote">À distance</option>
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="f-sort">Trier par</Label>
        <NativeSelect id="f-sort" name="sort" defaultValue={params.sort ?? (hasGeo ? "distance" : "recent")}>
          <option value="recent">Plus récentes</option>
          {hasGeo && <option value="distance">Plus proches</option>}
          <option value="budget_desc">Budget décroissant</option>
          <option value="budget_asc">Budget croissant</option>
          <option value="deadline">Date limite</option>
        </NativeSelect>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Appliquer
        </Button>
        <Button asChild variant="ghost">
          <Link href={action}>Réinitialiser</Link>
        </Button>
      </div>
    </form>
  );
}
