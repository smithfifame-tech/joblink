import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

/** Logo JOBLINK en tête des pages de connexion (site et espace propriétaire). */
export function AuthBrand({ href = "/", subtitle, className }: { href?: string; subtitle?: string; className?: string }) {
  return (
    <Link href={href} aria-label="JOBLINK — accueil" className={cn("jl-rise group mx-auto flex w-fit flex-col items-center gap-2", className)}>
      <span className="relative grid size-16 place-items-center rounded-[1.4rem] bg-white shadow-[0_14px_30px_-12px_rgb(20_83_45/0.45)] ring-1 ring-primary/10 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
        <LogoMark className="size-12" />
      </span>
      <span className="font-logo text-[1.7rem] font-black leading-none tracking-tight">
        <span className="text-primary-strong">JOB</span>
        <span className="text-primary">LINK</span>
      </span>
      {subtitle && <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{subtitle}</span>}
    </Link>
  );
}

/** Filigrane : grand logo très discret + mot JOBLINK, derrière le formulaire. */
export function AuthWatermark() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 grid place-items-center">
        <LogoMark className="size-[min(78vw,560px)] -rotate-[8deg] opacity-[0.06] grayscale-[25%] animate-[watermark-in_1.6s_cubic-bezier(.22,1,.36,1)_both]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute -bottom-6 -right-10 -z-10 select-none font-logo text-[7rem] font-black leading-none tracking-tight text-primary/[0.04] sm:text-[9rem]">
        JOBLINK
      </div>
      <div aria-hidden className="jl-dots pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 opacity-40 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
    </>
  );
}
