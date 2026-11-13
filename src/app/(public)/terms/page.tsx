import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { getCommissionLabel } from "@/services/catalog";

export const metadata: Metadata = { title: "Conditions générales d'utilisation", alternates: { canonical: "/terms" } };

export const revalidate = 300;

export default async function TermsPage() {
  const rate = await getCommissionLabel();
  return (
    <LegalPage
      title="Conditions générales d'utilisation"
      updated="8 novembre 2026"
      notice="Modèle à faire valider par un conseil juridique au regard du droit béninois (notamment la loi n° 2017-20 portant Code du numérique) avant la mise en production."
      sections={[
        ["1. Objet", "JOBLINK est une plateforme de mise en relation entre des personnes publiant des missions ponctuelles (« Clients ») et des personnes proposant leurs services (« Travailleurs »). JOBLINK n'est pas l'employeur des Travailleurs et n'est pas partie au contrat de prestation conclu entre Client et Travailleur."],
        ["2. Inscription", "L'inscription est gratuite et réservée aux personnes majeures. L'utilisateur fournit des informations exactes et confirme son adresse e-mail. Le type de compte (Client ou Travailleur) est choisi à l'inscription. Le compte est personnel ; les identifiants doivent rester confidentiels."],
        ["3. Missions et candidatures", "Le Client décrit précisément la mission, son budget en FCFA, ses dates et son lieu. Une mission attribuée ne reçoit plus de candidatures. Une mission non attribuée peut être modifiée ou annulée par le Client ; une mission démarrée ne peut plus être annulée unilatéralement et relève de la procédure de litige."],
        ["4. Paiement et commission", `Le paiement intervient après réalisation et validation du travail par le Client, par l'intermédiaire d'un prestataire de paiement agréé (Mobile Money notamment). JOBLINK perçoit une commission de ${rate} du montant de la mission payée. Les frais éventuels du prestataire de paiement sont affichés avant validation. Aucun autre prélèvement n'est effectué. JOBLINK ne propose pas de service de séquestre ou de conservation de fonds en dehors des services fournis par un prestataire habilité.`],
        ["5. Obligations des utilisateurs", "Les utilisateurs s'engagent à respecter la loi, à ne publier aucun contenu frauduleux, discriminatoire ou illicite, et à ne pas contourner la plateforme pour le paiement des missions conclues par son intermédiaire."],
        ["6. Avis", "Seules les parties d'une mission terminée peuvent publier un avis, une fois par mission. Les avis doivent être sincères ; JOBLINK peut masquer un avis contraire aux présentes conditions."],
        ["7. Litiges et modération", "En cas de désaccord, chaque partie peut ouvrir un litige depuis la mission. JOBLINK examine les éléments fournis et peut rendre une décision sur l'issue de la mission sur la plateforme. JOBLINK peut suspendre tout compte en cas de manquement, après examen ; chaque action de modération est journalisée."],
        ["8. Responsabilité", "JOBLINK met en œuvre les moyens raisonnables pour assurer la disponibilité et la sécurité du service. La qualité des prestations relève de la responsabilité des Travailleurs."],
        ["9. Contact", "Pour toute question : support@joblink.bj ou la page Contact."],
      ]}
    />
  );
}
