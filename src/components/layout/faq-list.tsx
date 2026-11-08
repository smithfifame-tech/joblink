import { ChevronDown } from "lucide-react";

export const FAQ_ITEMS = [
  {
    q: "Combien coûte JOBLINK ?",
    a: "L'inscription et la publication de missions sont gratuites. JOBLINK prélève une commission de 5 % uniquement sur les missions payées. Les éventuels frais du prestataire de paiement (Mobile Money) sont affichés avant toute confirmation. Aucun prélèvement caché.",
  },
  {
    q: "Quand le travailleur est-il payé ?",
    a: "Le paiement est déclenché après la réalisation du travail et sa validation par le client. Le travailleur reçoit le montant convenu moins la commission de 5 % et les frais externes affichés.",
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "Les paiements sont prévus via MTN Mobile Money, Moov Money et d'autres moyens compatibles au Bénin, par l'intermédiaire d'un prestataire de paiement agréé.",
  },
  {
    q: "Ma position exacte est-elle visible ?",
    a: "Non. Les positions sont arrondies (environ 1 km) avant tout affichage. L'adresse précise d'une mission n'est communiquée qu'au travailleur retenu. Les travailleurs n'apparaissent « à proximité » que s'ils l'ont accepté.",
  },
  {
    q: "Comment devenir travailleur sur JOBLINK ?",
    a: "Créez un compte « Travailleur », complétez votre profil (catégories, compétences, tarifs, zone de déplacement) puis candidatez aux missions. Vous pouvez demander la vérification de votre identité pour obtenir le badge « Vérifié ».",
  },
  {
    q: "Que faire en cas de problème sur une mission ?",
    a: "Depuis la mission, utilisez « Signaler un problème » pour ouvrir un litige. L'équipe JOBLINK examine la situation avec les deux parties. Vous pouvez aussi signaler ou bloquer un utilisateur depuis la messagerie.",
  },
];

export function FaqList({ items = FAQ_ITEMS }: { items?: { q: string; a: string }[] }) {
  return (
    <div className="divide-y rounded-2xl border">
      {items.map((item) => (
        <details key={item.q} className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
            {item.q}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
