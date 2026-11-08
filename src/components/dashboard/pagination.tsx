import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | number | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== "" && k !== "page") sp.set(k, String(v));
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-2">
      <Link
        href={href(page - 1)}
        aria-disabled={page <= 1}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-40")}
      >
        <ChevronLeft /> Précédent
      </Link>
      <span className="text-sm text-muted-foreground">
        Page {page} sur {pages}
      </span>
      <Link
        href={href(page + 1)}
        aria-disabled={page >= pages}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= pages && "pointer-events-none opacity-40")}
      >
        Suivant <ChevronRight />
      </Link>
    </nav>
  );
}
