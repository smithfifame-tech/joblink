import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Pictogramme JOBLINK (vectorisé d'après le logo officiel) :
 * épingle de localisation, orbite et trois travailleurs (dont un avec casque).
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 132" aria-hidden className={cn("size-9", className)}>
      <defs>
        <linearGradient id={`pin-${id}`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="0.45" stopColor="#16A34A" />
          <stop offset="1" stopColor="#14532D" />
        </linearGradient>
        <linearGradient id={`orbit-${id}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0" stopColor="#16A34A" />
          <stop offset="1" stopColor="#86EFAC" />
        </linearGradient>
      </defs>
      {/* Ombre au sol */}
      <ellipse cx="58" cy="126" rx="22" ry="3.5" fill="#16A34A" opacity="0.18" />
      {/* Épingle */}
      <path
        d="M58 8c-24.3 0-44 19.7-44 44 0 17.5 10.3 32.3 24.6 41.9L58 124l19.4-30.1C91.7 84.3 102 69.5 102 52 102 27.7 82.3 8 58 8Z"
        fill={`url(#pin-${id})`}
      />
      {/* Disque intérieur */}
      <circle cx="58" cy="52" r="29" fill="#FFFFFF" />
      {/* Travailleurs */}
      <g fill="#14532D">
        <circle cx="42.5" cy="47" r="5.2" />
        <path d="M33 70c0-7.2 4.3-12.5 9.5-12.5S52 62.8 52 70v2H33z" />
        <circle cx="73.5" cy="47" r="5.2" />
        <path d="M64 70c0-7.2 4.3-12.5 9.5-12.5S83 62.8 83 70v2H64z" />
      </g>
      <g fill="#16A34A">
        <circle cx="58" cy="44" r="6.2" />
        {/* Casque de chantier */}
        <path d="M50.6 41.2c0-4.8 3.3-8.2 7.4-8.2s7.4 3.4 7.4 8.2h1.8v2.3H48.8v-2.3z" />
        <path d="M46.5 72c0-9 5.2-15.2 11.5-15.2S69.5 63 69.5 72v2h-23z" />
      </g>
      {/* Orbite (passe devant l'épingle) */}
      <path
        transform="translate(58 62) rotate(-24)"
        d="M-60 0A60 20 0 0 0 60 0A60 12 0 0 1 -60 0Z"
        fill={`url(#orbit-${id})`}
        stroke="#FFFFFF"
        strokeWidth="2"
        paintOrder="stroke"
      />
    </svg>
  );
}

export function Wordmark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("font-logo text-[1.35rem] font-extrabold leading-none tracking-tight", className)}>
      <span className={inverted ? "text-white" : "text-primary-strong"}>JOB</span>
      <span className="text-primary">LINK</span>
    </span>
  );
}

export function Logo({ className, href = "/", inverted = false }: { className?: string; href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)} aria-label="JOBLINK — accueil">
      <LogoMark />
      <Wordmark inverted={inverted} />
    </Link>
  );
}
