import type { Metadata } from "next";
import { Globe2, HeartHandshake, ShieldCheck } from "lucide-react";
import { PhotoBanner } from "@/components/home/photo-banner";
import { PHOTOS } from "@/lib/media/photos";

export const metadata: Metadata = { title: "À propos", description: "La mission de JOBLINK : rapprocher le travail et les talents, quartier par quartier.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PhotoBanner
        photo={PHOTOS.builder}
        position="object-[60%_25%]"
        eyebrow="À propos"
        title="À propos de JOBLINK"
        subtitle="Le travail près de vous, les opportunités à portée de main."
      />
      <div className="mx-auto max-w-3xl">
      <div className="mt-12 grid gap-6 text-[17px] leading-relaxed">
        <p>
          Au Bénin, trouver rapidement un plombier fiable, une aide ménagère disponible ou un développeur compétent passe encore beaucoup
          par le bouche-à-oreille. À l&apos;inverse, de nombreux travailleurs qualifiés cherchent des missions près de chez eux sans savoir où les trouver.
        </p>
        <p>
          JOBLINK est une marketplace de petits travaux et de services géolocalisés. Elle met en relation, de façon simple et transparente,
          les personnes qui ont un besoin ponctuel et celles qui peuvent y répondre, dans leur quartier ou à distance.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: HeartHandshake, t: "Local", d: "Des missions à proximité, pour réduire les déplacements et valoriser les talents du quartier." },
          { icon: ShieldCheck, t: "Confiance", d: "Profils vérifiables, avis issus de missions réelles, données personnelles protégées." },
          { icon: Globe2, t: "Ambition régionale", d: "Lancement au Bénin, puis Togo, Nigeria, Niger et Burkina Faso." },
        ].map((v) => (
          <div key={v.t} className="rounded-2xl border border-border/80 bg-white p-5 shadow-[var(--shadow-soft)]">
            <v.icon className="size-5 text-primary" aria-hidden />
            <h2 className="mt-3 font-semibold">{v.t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{v.d}</p>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
