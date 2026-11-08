import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Comment ça marche", description: "Publier une mission, candidater, réaliser, valider, payer : le fonctionnement de JOBLINK étape par étape.", alternates: { canonical: "/how-it-works" } };

const CLIENT = [
  ["Créez votre compte client", "Gratuit, avec confirmation de votre e-mail."],
  ["Publiez une mission", "Titre, description, budget en FCFA, dates, lieu sur la carte et photos. Prévisualisez avant de publier."],
  ["Comparez les candidatures", "Profils, avis, propositions de prix. Échangez par messagerie avant de choisir."],
  ["Acceptez un travailleur", "Il confirme la mission. Vous suivez son avancement en temps réel."],
  ["Validez le travail", "Le travailleur déclare la mission terminée avec une preuve. Vous validez ou demandez des corrections."],
  ["Payez et notez", "Paiement par Mobile Money via un prestataire agréé, reçu automatique, puis avis réciproques."],
];
const WORKER = [
  ["Créez votre profil travailleur", "Catégories, compétences, tarifs indicatifs, zone de déplacement et disponibilités."],
  ["Trouvez des missions proches", "Filtrez par catégorie, budget, ville et distance, ou explorez la carte."],
  ["Candidatez", "Présentez-vous et proposez votre prix si le client l'autorise."],
  ["Réalisez la mission", "Confirmez l'attribution, échangez avec le client puis déclarez le travail terminé avec une preuve."],
  ["Recevez votre paiement", "Montant convenu moins 5 % de commission et frais externes affichés. Suivez vos revenus."],
];

function Steps({ title, steps }: { title: string; steps: string[][] }) {
  return (
    <section className="rounded-2xl border p-6 sm:p-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ol className="mt-6 grid gap-5">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-white">{i + 1}</span>
            <div>
              <h3 className="font-medium">{t}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">Comment ça marche</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Un parcours simple et encadré, de la publication au paiement.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Steps title="Vous cherchez un prestataire" steps={CLIENT} />
        <Steps title="Vous cherchez du travail" steps={WORKER} />
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg"><Link href="/register?type=client">Publier une mission</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/register?type=worker">Devenir travailleur</Link></Button>
      </div>
    </div>
  );
}
