import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updated="8 novembre 2026"
      notice="Modèle à adapter et à déclarer auprès de l'Autorité de Protection des Données Personnelles (APDP) du Bénin avant la mise en production."
      sections={[
        ["Données collectées", "Identité (nom, prénom), coordonnées (e-mail, téléphone), localisation déclarée (pays, ville, quartier), localisation GPS si vous l'autorisez, contenu de vos missions, candidatures, messages, avis, et données de paiement transmises par le prestataire de paiement (référence de transaction, statut). Nous ne stockons jamais vos numéros de carte ni vos codes Mobile Money."],
        ["Finalités", "Fournir le service de mise en relation, sécuriser les comptes, traiter les paiements, prévenir la fraude, gérer les litiges et respecter nos obligations légales."],
        ["Localisation", "Votre position exacte n'est jamais affichée publiquement : elle est arrondie à environ 1 km. L'adresse précise d'une mission n'est visible que par le Client et le Travailleur retenu. Un Travailleur n'apparaît dans « Travailleurs à proximité » que s'il l'a activé dans ses paramètres."],
        ["Partage", "Vos coordonnées (e-mail, téléphone) ne sont visibles que par l'autre partie d'une mission attribuée. Les données sont hébergées par nos sous-traitants techniques (Supabase pour la base de données, Vercel pour l'hébergement, prestataire de paiement agréé, service d'e-mails)."],
        ["Conservation", "Données de compte : durée de vie du compte. Notifications lues : 180 jours. Journaux techniques de paiement : 13 mois. Données comptables : durée légale applicable."],
        ["Sécurité", "Chiffrement des échanges (HTTPS), mots de passe hachés par Supabase Auth, contrôle d'accès par ligne (Row Level Security), journal d'audit des actions sensibles."],
        ["Vos droits", "Accès, rectification, suppression, opposition et portabilité : écrivez à support@joblink.bj. Vous pouvez modifier la plupart de vos informations depuis votre profil."],
      ]}
    />
  );
}
