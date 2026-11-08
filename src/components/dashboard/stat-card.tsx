import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  href?: string;
  tone?: "default" | "warning";
}) {
  const body = (
    <Card className={cn("h-full p-4 transition-shadow sm:p-5", href && "hover:shadow-md")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg", tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-accent text-primary")}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}
