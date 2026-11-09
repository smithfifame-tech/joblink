import { cn } from "@/lib/utils";

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const center = align === "center";
  return (
    <div className={cn("flex flex-col gap-4", !center && "sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
        {eyebrow && (
          <p className={cn("inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary", center && "justify-center")}>
            <span className="h-px w-6 bg-primary/50" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="mt-3 text-balance text-3xl font-extrabold leading-[1.1] tracking-[-0.025em] sm:text-4xl">
          {title}
        </h2>
        {description && <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
