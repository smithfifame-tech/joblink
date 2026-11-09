import { AuthAside, AuthMobileBanner } from "@/components/auth/auth-aside";
import { LogoMark } from "@/components/layout/logo";

export const metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.1fr_minmax(0,600px)]">
      <AuthAside />
      <main id="contenu" className="relative isolate flex flex-col overflow-hidden px-4 py-8 sm:px-10">
        {/* Filigrane : le logo JOBLINK, très discret, derrière le formulaire */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 grid place-items-center">
          <LogoMark className="size-[min(78vw,560px)] -rotate-[8deg] opacity-[0.06] grayscale-[25%] animate-[watermark-in_1.6s_cubic-bezier(.22,1,.36,1)_both]" />
        </div>
        <div aria-hidden className="pointer-events-none absolute -bottom-6 -right-10 -z-10 select-none font-logo text-[7rem] font-black leading-none tracking-tight text-primary/[0.04] sm:text-[9rem]">
          JOBLINK
        </div>
        <div aria-hidden className="jl-dots pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 opacity-40 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
        <AuthMobileBanner />
        <div className="jl-page relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">{children}</div>
        <p className="relative text-center text-xs text-muted-foreground">© JOBLINK · Commission de 5 % uniquement sur les missions payées</p>
      </main>
    </div>
  );
}
