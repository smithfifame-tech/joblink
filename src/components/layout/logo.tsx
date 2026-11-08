import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="#16A34A" />
      <path d="M13.5 9v10.2a3.3 3.3 0 0 1-6.3 1.4" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="21.5" cy="12.5" r="3.4" fill="none" stroke="#fff" strokeWidth="2.4" />
      <path d="M21.5 15.9V23" stroke="#BBF7D0" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)} aria-label="JOBLINK — accueil">
      <LogoMark />
      <span className="text-lg">
        JOB<span className="text-primary">LINK</span>
      </span>
    </Link>
  );
}
