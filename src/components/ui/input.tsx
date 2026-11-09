import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3.5 py-2 text-base shadow-xs transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground/70 md:text-sm",
        "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/15 disabled:cursor-not-allowed disabled:opacity-50",
        "file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
