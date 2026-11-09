import { AuthAside, AuthMobileBanner } from "@/components/auth/auth-aside";
import { AuthBrand, AuthWatermark } from "@/components/auth/auth-brand";

export const metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.1fr_minmax(0,600px)]">
      <AuthAside />
      <main id="contenu" className="relative isolate flex flex-col overflow-hidden px-4 py-8 sm:px-10">
        <AuthWatermark />
        {/* Logo en tête */}
        <AuthBrand className="mb-6 lg:mb-0" />
        <AuthMobileBanner />
        <div className="jl-page relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">{children}</div>
        <p className="relative text-center text-xs text-muted-foreground">© JOBLINK · Commission de 5 % uniquement sur les missions payées</p>
      </main>
    </div>
  );
}
