/**
 * Photo d'illustration par catégorie de mission (licence Unsplash, crédits affichés).
 * Utilisée en arrière-plan des cartes et des pages de mission quand le client n'a pas
 * ajouté sa propre photo. Ce sont des illustrations : elles ne représentent ni la mission
 * réelle ni un membre de JOBLINK, et l'interface le précise (« Illustration »).
 */
import { PHOTOS, type Photo } from "./photos";

const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80`;
const ref = "?utm_source=joblink&utm_medium=referral";
const p = (id: string, alt: string, author: string, user: string): Photo => ({
  src: u(id),
  alt,
  author,
  authorUrl: `https://unsplash.com/@${user}${ref}`,
});

export const CATEGORY_PHOTOS: Record<string, Photo> = {
  plomberie: p("1749532125405-70950966b0e5", "Un plombier répare une installation sanitaire", "bhagya laxmi", "bhagya_laxmi"),
  electricite: PHOTOS.electrician,
  mecanique: p("1534789266363-adfa086f3f63", "Un mécanicien répare une moto en plein air", "Kay Asante", "iamkayasante"),
  menage: p("1758273238415-01ec03d9ef27", "Une femme nettoie le sol d'un salon lumineux", "Vitaly Gariev", "silverkblack"),
  "aide-domicile": p("1735792339621-2846f164b78f", "Une femme accompagne un enfant à la maison", "Moses Sichach", "sichach"),
  livraison: p("1551356522-050fbef473bf", "Un homme sur sa moto, prêt pour une course", "Random Institute", "randominstitute"),
  jardinage: p("1535090467336-9501f96eef89", "Des mains gantées entretiennent un potager", "Nel Ranoko", "nel_ranoko"),
  maconnerie: PHOTOS.builder,
  menuiserie: PHOTOS.carpenter,
  climatisation: p("1722131646940-b821a6cc6252", "Un climatiseur installé sur la façade d'un bâtiment", "Jonny Clow", "jonnyclow"),
  developpement: p("1528901166007-3784c7dd3653", "Des développeurs codent ensemble sur ordinateur portable", "X", "disruptxn"),
  graphisme: p("1605067063351-f81bc6041251", "Un graphiste travaille sur son ordinateur portable", "Timothy Exodus", "timxdesign"),
  informatique: p("1594077810908-9ffd89d704ac", "Un technicien travaille sur un ordinateur portable", "Oluwatobi Fasipe", "fasipe_tobi"),
  evenementiel: p("1660675133902-acd1b057f75d", "Des invités en tenue traditionnelle lors d'une cérémonie", "Emmanuel Yeboah Okine", "emmanuel_okine"),
  couture: PHOTOS.tailor,
  cours: p("1632215861513-130b66fe97f4", "Une enseignante devant une classe d'élèves", "Emmanuel Ikwuegbu", "emmages"),
  demenagement: p("1655254193112-bf384e68a951", "Un homme porte un grand carton sur la tête", "ajiss", "viktorr_aj"),
  autres: PHOTOS.market,
};

/** Correspondance icône → catégorie, pour les données qui n'ont que l'icône. */
const BY_ICON: Record<string, string> = {
  wrench: "plomberie", zap: "electricite", car: "mecanique", sparkles: "menage", house: "aide-domicile",
  bike: "livraison", leaf: "jardinage", hammer: "maconnerie", drill: "menuiserie", snowflake: "climatisation",
  code: "developpement", palette: "graphisme", "monitor-smartphone": "informatique", "party-popper": "evenementiel",
  scissors: "couture", "graduation-cap": "cours", truck: "demenagement", briefcase: "autres",
};

export function categoryPhoto(slug?: string | null, icon?: string | null): Photo {
  return CATEGORY_PHOTOS[slug ?? ""] ?? CATEGORY_PHOTOS[BY_ICON[icon ?? ""] ?? ""] ?? PHOTOS.market;
}

/** Exemples de titres par catégorie, proposés dans le formulaire de publication. */
export const TITLE_IDEAS: Record<string, string[]> = {
  plomberie: ["Réparer une fuite sous l'évier", "Installer un chauffe-eau", "Déboucher une canalisation"],
  electricite: ["Installer 4 prises et 2 interrupteurs", "Dépanner une coupure de courant", "Poser des luminaires LED"],
  mecanique: ["Vidange et entretien de moto", "Diagnostic d'un bruit moteur", "Changer les plaquettes de frein"],
  menage: ["Ménage complet d'un appartement 3 pièces", "Nettoyage de bureaux le samedi", "Repassage de linge (2 h)"],
  "aide-domicile": ["Garde d'enfants le mercredi après-midi", "Aide ménagère 2 matinées par semaine", "Accompagnement d'une personne âgée"],
  livraison: ["Livrer un colis à Calavi", "Courses au marché Dantokpa", "Coursier à moto pour la journée"],
  jardinage: ["Tondre et désherber une cour", "Tailler une haie", "Créer un petit potager"],
  maconnerie: ["Poser du carrelage (20 m²)", "Repeindre un salon", "Construire un muret de clôture"],
  menuiserie: ["Réparer une porte qui ferme mal", "Fabriquer une étagère sur mesure", "Monter un lit et une armoire"],
  climatisation: ["Entretien de 2 climatiseurs split", "Installer un climatiseur", "Recharger le gaz d'un réfrigérateur"],
  developpement: ["Créer un site vitrine pour ma boutique", "Corriger un bug sur une application", "Intégrer un paiement Mobile Money"],
  graphisme: ["Créer le logo de mon entreprise", "Affiche pour un événement", "Visuels pour les réseaux sociaux"],
  informatique: ["Réinstaller Windows sur un ordinateur", "Configurer le Wi-Fi d'un bureau", "Récupérer des fichiers perdus"],
  evenementiel: ["Serveurs pour un mariage (100 invités)", "Sonorisation d'un anniversaire", "Décoration d'une salle de fête"],
  couture: ["Retouche de 3 tenues en pagne", "Confection d'une robe sur mesure", "Ourlets de 5 pantalons"],
  cours: ["Soutien scolaire en mathématiques (3e)", "Cours d'anglais pour débutant", "Initiation à Excel"],
  demenagement: ["Déménager un studio à Cotonou", "Charger un camion (2 h)", "Monter des meubles après déménagement"],
  autres: ["Aide ponctuelle pour un rangement", "Faire la queue pour un dossier administratif", "Petit service de quartier"],
};

/** Nom affiché → identifiant de catégorie (données de référence). */
const BY_NAME: Record<string, string> = {
  "plomberie": "plomberie", "électricité": "electricite", "mécanique": "mecanique", "ménage & entretien": "menage",
  "aide à domicile": "aide-domicile", "livraison & courses": "livraison", "jardinage": "jardinage",
  "maçonnerie & btp": "maconnerie", "menuiserie": "menuiserie", "climatisation & froid": "climatisation",
  "développement web & mobile": "developpement", "graphisme & design": "graphisme", "dépannage informatique": "informatique",
  "événementiel": "evenementiel", "couture & mode": "couture", "cours & formation": "cours",
  "déménagement & manutention": "demenagement", "autres services": "autres",
};

export function categoryPhotoByName(name?: string | null): Photo {
  return categoryPhoto(BY_NAME[(name ?? "").trim().toLowerCase()]);
}
