"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.06c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.76-1.09-4.5-3.92-4.64-4.1-.13-.18-1.1-1.47-1.1-2.81 0-1.33.7-1.99.95-2.26.24-.27.53-.34.71-.34h.51c.16 0 .38-.06.6.46.23.54.77 1.87.84 2 .07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.28-.12.55.16.27.7 1.16 1.51 1.88 1.04.93 1.92 1.22 2.19 1.35.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.33Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M13.5 21.95V14.5h2.5l.38-2.9H13.5V9.75c0-.84.24-1.41 1.44-1.41h1.53V5.75a20.6 20.6 0 0 0-2.23-.11c-2.2 0-3.72 1.35-3.72 3.82v2.14H8v2.9h2.52v7.45a10 10 0 1 1 2.98 0Z" />
    </svg>
  );
}

/** Partage d'une mission : WhatsApp (très utilisé au Bénin), Facebook, lien à copier, partage natif. */
export function ShareButtons({
  url,
  title,
  className,
  variant = "light",
}: {
  url: string;
  title: string;
  className?: string;
  variant?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);
  const message = `${title} — mission sur JOBLINK : ${url}`;
  const base =
    "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const neutral = variant === "dark" ? "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25" : "bg-white text-foreground ring-1 ring-border hover:ring-primary/40";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copie impossible : sélectionnez le lien manuellement.");
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text: `${title} — mission sur JOBLINK`, url });
    } catch {
      /* partage annulé */
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(base, "bg-[#25D366] text-[#0b3d1f] shadow-[0_8px_18px_-8px_rgb(37_211_102/0.8)] hover:bg-[#2ee06f]")}
      >
        <WhatsAppIcon className="size-4" /> WhatsApp
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(base, "bg-[#1877F2] text-white hover:bg-[#2d86f5]")}
      >
        <FacebookIcon className="size-4" /> Facebook
      </a>
      <button type="button" onClick={copy} className={cn(base, neutral)}>
        {copied ? <Check className="size-4 text-primary" /> : <Link2 className="size-4" />} {copied ? "Copié" : "Copier le lien"}
      </button>
      {canShare && (
        <button type="button" onClick={nativeShare} className={cn(base, neutral, "sm:hidden")} aria-label="Plus d'options de partage">
          <Share2 className="size-4" />
        </button>
      )}
    </div>
  );
}
