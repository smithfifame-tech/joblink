/**
 * Clips vidéo du hero : vidéos Pexels (licence Pexels — utilisation gratuite, attribution non
 * obligatoire mais affichée). Servies depuis le CDN Pexels (autorisé dans la CSP : media-src).
 * Trois qualités par clip : sm (640×360, mobile), md (960×540, ordinateur), lg (1280×720, grands écrans).
 */
export type HeroClip = {
  id: string;
  /** Début du passage utilisé (secondes) */
  start: number;
  author: string;
  pageUrl: string;
  sources: { sm: string; md: string; lg: string };
};

const f = (id: string, file: string) => `https://videos.pexels.com/video-files/${id}/${file}`;

export const HERO_CLIPS: HeroClip[] = [
  {
    id: "30339600", // vue aérienne d'une rue de marché
    start: 0.5,
    author: "Christian Bardot",
    pageUrl: "https://www.pexels.com/video/aerial-view-of-busy-african-market-street-30339600/",
    sources: {
      sm: f("30339600", "13005116_640_360_24fps.mp4"),
      md: f("30339600", "13005124_960_540_24fps.mp4"),
      lg: f("30339600", "13005127_1280_720_24fps.mp4"),
    },
  },
  {
    id: "35827781", // marché animé d'Afrique de l'Ouest
    start: 1,
    author: "B. Aristotlè Guweh Jr",
    pageUrl: "https://www.pexels.com/video/lively-west-african-market-scene-35827781/",
    sources: {
      sm: f("35827781", "15191663_640_360_30fps.mp4"),
      md: f("35827781", "15191665_960_540_30fps.mp4"),
      lg: f("35827781", "15191669_1280_720_30fps.mp4"),
    },
  },
  {
    id: "37409118", // couturière à la machine
    start: 3,
    author: "Joaquin Reyes Ramos",
    pageUrl: "https://www.pexels.com/video/skilled-seamstress-working-on-a-sewing-machine-37409118/",
    sources: {
      sm: f("37409118", "15843758_640_360_30fps.mp4"),
      md: f("37409118", "15843759_960_540_30fps.mp4"),
      lg: f("37409118", "15843760_1280_720_30fps.mp4"),
    },
  },
  {
    id: "31018079", // menuisier à la scie
    start: 1,
    author: "Trumpet Studios",
    pageUrl: "https://www.pexels.com/video/expert-carpenter-crafting-wood-outdoors-31018079/",
    sources: {
      sm: f("31018079", "13258306_640_360_60fps.mp4"),
      md: f("31018079", "13258307_960_540_60fps.mp4"),
      lg: f("31018079", "13258308_1280_720_60fps.mp4"),
    },
  },
  {
    id: "27785912", // artisan métallier (meuleuse)
    start: 2,
    author: "Shedrack Salami",
    pageUrl: "https://www.pexels.com/video/local-artisan-at-work-27785912/",
    sources: {
      sm: f("27785912", "12224294_640_360_25fps.mp4"),
      md: f("27785912", "12224295_960_540_25fps.mp4"),
      lg: f("27785912", "12224296_1280_720_25fps.mp4"),
    },
  },
];

/** Durée de chaque passage : 5 clips × 4 s = 20 s de vidéo avant le retour de la photo. */
export const HERO_CLIP_SECONDS = 4;
export const HERO_VIDEO_TOTAL_SECONDS = HERO_CLIPS.length * HERO_CLIP_SECONDS;
