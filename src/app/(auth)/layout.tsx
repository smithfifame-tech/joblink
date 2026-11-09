import { AuthAside, AuthMobileBanner } from "@/components/auth/auth-aside";

export const metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.1fr_minmax(0,600px)]">
      <AuthAside />
      <main id="contenu" className="relative flex flex-col px-4 py-8 sm:px-10">
        <div aria-hidden className="jl-dots pointer-events-none absolute inset-x-0 top-0 h-48 opacity-40 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
        <AuthMobileBanner />
        <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">{children}</div>
        <p className="relative text-center text-xs text-muted-foreground">© JOBLINK · Commission de 5 % uniquement sur les missions payées</p>
      </main>
    </div>
  );
}
