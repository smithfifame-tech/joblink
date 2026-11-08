import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/layout/category-icon";
import { getCategories, getCategoryCounts } from "@/services/catalog";

export const metadata: Metadata = { title: "Catégories de services", description: "Toutes les catégories de missions disponibles sur JOBLINK.", alternates: { canonical: "/categories" } };
export const revalidate = 300;

export default async function CategoriesPage() {
  const [categories, counts] = await Promise.all([getCategories().catch(() => []), getCategoryCounts().catch(() => ({}) as Record<string, number>)]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold">Catégories</h1>
      <p className="mt-2 text-muted-foreground">Trouvez le bon prestataire ou la bonne mission par domaine.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link key={c.id} href={`/jobs?category=${c.slug}`} className="group flex gap-4 rounded-xl border p-5 transition-all hover:border-primary/40 hover:shadow-sm">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-primary"><CategoryIcon name={c.icon} className="size-6" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{c.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                {counts[c.slug] ?? 0} mission{(counts[c.slug] ?? 0) > 1 ? "s" : ""} ouverte{(counts[c.slug] ?? 0) > 1 ? "s" : ""}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
