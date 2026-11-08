import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export const metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-primary-strong p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -left-24 -top-24 size-96 rounded-full bg-primary/50 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-2 text-lg font-semibold text-white">JOBLINK</Link>
        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight text-white">Le travail près de vous, les opportunités à portée de main.</p>
          <p className="mt-4 text-green-100">Publiez une mission ou trouvez du travail dans votre quartier, en toute confiance.</p>
        </div>
        <p className="relative text-sm text-green-200">Commission de 5 % uniquement sur les missions payées.</p>
      </aside>
      <main id="contenu" className="flex flex-col px-4 py-8 sm:px-10">
        <Logo className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">{children}</div>
      </main>
    </div>
  );
}
