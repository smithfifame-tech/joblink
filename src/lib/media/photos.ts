/**
 * Photos d'illustration (licence Unsplash : usage libre, attribution recommandée).
 * Servies via next/image (optimisées par la plateforme). Ce sont des illustrations :
 * aucune n'est présentée comme un membre réel de JOBLINK.
 */
export interface Photo {
  src: string;
  alt: string;
  author: string;
  authorUrl: string;
}

const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80`;
const ref = "?utm_source=joblink&utm_medium=referral";

export const PHOTOS = {
  tailorPhone: {
    src: u("1687422809069-0fa3546b8471"),
    alt: "Un tailleur souriant consulte son téléphone dans son atelier",
    author: "Ali Mkumbwa",
    authorUrl: `https://unsplash.com/@mkumbwajr${ref}`,
  },
  womanPhone: {
    src: u("1768244016593-8ca75b15bc92"),
    alt: "Une femme souriante tient son smartphone en extérieur",
    author: "Brian Kungu",
    authorUrl: `https://unsplash.com/@oldceltic${ref}`,
  },
  carpenter: {
    src: u("1687422810663-c316494f725a"),
    alt: "Un menuisier souriant travaille le bois dans son atelier",
    author: "Ali Mkumbwa",
    authorUrl: `https://unsplash.com/@mkumbwajr${ref}`,
  },
  electrician: {
    src: u("1621905251189-08b45d6a269e"),
    alt: "Un électricien en casque de chantier installe un tableau électrique",
    author: "Emmanuel Ikwuegbu",
    authorUrl: `https://unsplash.com/@emmages${ref}`,
  },
  tailor: {
    src: u("1687422808289-e721259c9eb4"),
    alt: "Un tailleur coud à la machine dans son atelier",
    author: "Ali Mkumbwa",
    authorUrl: `https://unsplash.com/@mkumbwajr${ref}`,
  },
  builder: {
    src: u("1787672357491-d43acdf974cb"),
    alt: "Un ouvrier en tenue de travail bleue, bras croisés",
    author: "Divaris Shirichena",
    authorUrl: `https://unsplash.com/@divaris${ref}`,
  },
  ladder: {
    src: u("1790685587853-48667feb5def"),
    alt: "Un technicien en gilet de sécurité installe un éclairage sur une échelle",
    author: "Desmond Charles Mushi",
    authorUrl: `https://unsplash.com/@akili_karoli${ref}`,
  },
} satisfies Record<string, Photo>;

export const PHOTO_CREDITS = Array.from(new Map(Object.values(PHOTOS).map((p) => [p.author, p.authorUrl])).entries());
