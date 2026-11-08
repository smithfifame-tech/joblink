import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", Icon: Info },
  success: { box: "border-green-200 bg-accent text-accent-foreground", Icon: CheckCircle2 },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", Icon: TriangleAlert },
  error: { box: "border-red-200 bg-red-50 text-red-800", Icon: AlertCircle },
} as const;

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: keyof typeof styles;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { box, Icon } = styles[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="grid gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}
