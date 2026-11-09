import { CheckCircle2 } from "lucide-react";
import { Logo, LogoMark } from "@/components/layout/logo";

export const metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,600px)]">
      <aside className="relative hidden overflow-hidden border-r border-primary/10 bg-gradient-to-br from-[#ecfdf3] via-white to-[#f0fdf4] p-12 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="jl-grid absolute inset-0 opacity-80" />
        <div aria-hidden className="absolute -bottom-40 -right-40 size-[34rem] rounded-full border border-primary/15 bg-primary/[0.04]" />
        <div aria-hidden className="absolute -bottom-20 -right-20 size-[22rem] rounded-full border border-dashed border-primary/25" />
        <LogoMark className="pointer-events-none absolute bottom-24 right-24 size-40 animate-float drop-shadow-[0_18px_24px_rgb(20_83_45/0.3)]" />
        <Logo className="relative" />
        <div className="relative max-w-md">
          <p className="text-balance text-4xl font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
            Le travail près de vous, <span className="text-primary">les opportunités à portée de main.</span>
          </p>
          <ul className="mt-8 grid gap-3 text-[15px] text-muted-foreground">
            {[
              "Publiez une mission gratuitement",
              "Des travailleurs de votre quartier",
              "Paiement Mobile Money après validation",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <CheckCircle2 className="size-5 text-primary" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm font-medium text-primary-strong">Commission de 5 % uniquement sur les missions payées.</p>
      </aside>
      <main id="contenu" className="flex flex-col bg-white px-4 py-8 sm:px-10">
        <Logo className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">{children}</div>
      </main>
    </div>
  );
}
