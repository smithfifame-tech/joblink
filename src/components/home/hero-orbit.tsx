import Image from "next/image";
import Link from "next/link";
import { PHOTOS, type Photo } from "@/lib/media/photos";
import { cn } from "@/lib/utils";

/**
 * Scène signature du hero : « vous » au centre, épinglé sur la carte, et les talents du quartier
 * en orbite autour, chacun découpé dans la forme de l'épingle JOBLINK. Tout est en CSS/SVG.
 * Photos d'illustration (Unsplash) ; les étiquettes renvoient vers de vraies catégories.
 */

const PIN_MASK: React.CSSProperties = {
  maskImage: "url(/masks/pin.svg)",
  WebkitMaskImage: "url(/masks/pin.svg)",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};

type PinSpec = {
  photo: Photo;
  label: string;
  href?: string;
  /** Pointe de l'épingle, en % de la scène */
  x: number;
  y: number;
  /** Largeur en % de la scène */
  w: number;
  delay: number;
  position?: string;
  center?: boolean;
};

function Pin({ p }: { p: PinSpec }) {
  const body = (
    <>
      {/* Ombre portée au sol, qui respire avec le flottement */}
      <span
        aria-hidden
        className="absolute left-1/2 top-full h-[7%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[#14532d] blur-[6px] animate-[shadow-bob_5s_ease-in-out_infinite]"
        style={{ animationDelay: `${p.delay * 0.6}ms` }}
      />
      <span className="block animate-[pin-bob_5s_ease-in-out_infinite]" style={{ animationDelay: `${p.delay * 0.6}ms` }}>
        {/* Contour : épingle verte en dégradé, légèrement plus grande que la photo */}
        <span
          className="relative block aspect-[88/116] w-full bg-gradient-to-b from-[#4ade80] via-[#16a34a] to-[#14532d] drop-shadow-[0_18px_24px_rgb(20_83_45/0.28)] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-2 group-hover:scale-[1.04]"
          style={PIN_MASK}
        >
          <span className="absolute inset-[5.5%_6%_9%_6%] block overflow-hidden" style={PIN_MASK}>
            <Image src={p.photo.src} alt="" fill sizes="(min-width: 1024px) 220px, 160px" className={cn("object-cover", p.position)} />
          </span>
        </span>
      </span>
      {/* Étiquette sous la pointe */}
      <span
        className={cn(
          "absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-colors duration-300",
          p.center
            ? "border-primary/30 bg-primary text-white"
            : "border-border bg-white text-foreground group-hover:border-primary/40 group-hover:text-primary-strong",
        )}
      >
        {p.center && <span className="mr-1.5 inline-block size-1.5 -translate-y-px rounded-full bg-white align-middle" />}
        {p.label}
      </span>
    </>
  );

  return (
    <div
      className="absolute"
      style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, transform: "translate(-50%, -100%)", zIndex: p.center ? 20 : 10 }}
    >
      <div className="relative animate-[pin-drop_1s_cubic-bezier(.2,.9,.25,1.1)_both]" style={{ animationDelay: `${p.delay}ms` }}>
        {p.href ? (
          <Link href={p.href} className="group relative block outline-none" aria-label={`Voir les missions : ${p.label}`}>
            {body}
          </Link>
        ) : (
          <div className="group relative block">{body}</div>
        )}
      </div>
    </div>
  );
}

function Orbit({ vb, cx, cy, rx, ry }: { vb: string; cx: number; cy: number; rx: number; ry: number }) {
  const path = `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0`;
  return (
    <svg aria-hidden viewBox={vb} className="absolute inset-0 size-full overflow-visible">
      <defs>
        <linearGradient id="jl-orbit" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#16a34a" stopOpacity="0.05" />
          <stop offset=".5" stopColor="#16a34a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#16a34a" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Halo de l'orbite */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#dcfce7" strokeWidth="18" opacity="0.6" />
      {/* Orbite pointillée qui tourne lentement */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="url(#jl-orbit)"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
        className="animate-[orbit-dash_14s_linear_infinite]"
      />
      {/* Points lumineux qui parcourent l'orbite */}
      <g className="jl-motion">
        {[0, 4.6, 9.3].map((begin) => (
          <circle key={begin} r="4" fill="#16a34a" opacity="0">
            <animateMotion dur="14s" begin={`${begin}s`} repeatCount="indefinite" path={path} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="14s" begin={`${begin}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>
    </svg>
  );
}

function Radar({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <div aria-hidden className="absolute" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%` }}>
      {[0, 1.2, 2.4].map((d) => (
        <span
          key={d}
          className="absolute left-0 top-0 block aspect-[3/1] w-full rounded-[50%] border border-primary/40 bg-primary/[0.06] animate-[radar_3.6s_cubic-bezier(.2,.6,.3,1)_infinite_both]"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </div>
  );
}

// Scène large (≥ 640 px) : viewBox 1200 × 500, ellipse centrée.
const WIDE = { cx: 600, cy: 205, rx: 540, ry: 175 };
function onWide(deg: number) {
  const t = (deg * Math.PI) / 180;
  return { x: ((WIDE.cx + WIDE.rx * Math.cos(t)) / 1200) * 100, y: ((WIDE.cy + WIDE.ry * Math.sin(t)) / 500) * 100 };
}

const WIDE_PINS: PinSpec[] = [
  { photo: PHOTOS.tailor, label: "Couture", href: "/jobs?category=couture", ...onWide(170), w: 7.6, delay: 700, position: "object-[45%_center]" },
  { photo: PHOTOS.electrician, label: "Électricité", href: "/jobs?category=electricite", ...onWide(136), w: 10.4, delay: 520, position: "object-[30%_center]" },
  { photo: PHOTOS.womanPhone, label: "Vous", ...onWide(90), w: 15, delay: 300, position: "object-[50%_25%]", center: true },
  { photo: PHOTOS.carpenter, label: "Menuiserie", href: "/jobs?category=menuiserie", ...onWide(44), w: 10.4, delay: 600, position: "object-[40%_center]" },
  { photo: PHOTOS.builder, label: "Maçonnerie", href: "/jobs?category=maconnerie", ...onWide(10), w: 7.6, delay: 780, position: "object-[50%_20%]" },
];

// Scène mobile : viewBox 400 × 320.
const NARROW = { cx: 200, cy: 130, rx: 182, ry: 86 };
function onNarrow(deg: number) {
  const t = (deg * Math.PI) / 180;
  return { x: ((NARROW.cx + NARROW.rx * Math.cos(t)) / 400) * 100, y: ((NARROW.cy + NARROW.ry * Math.sin(t)) / 320) * 100 };
}
const NARROW_PINS: PinSpec[] = [
  { photo: PHOTOS.electrician, label: "Électricité", href: "/jobs?category=electricite", ...onNarrow(150), w: 21, delay: 500, position: "object-[30%_center]" },
  { photo: PHOTOS.womanPhone, label: "Vous", ...onNarrow(90), w: 31, delay: 300, position: "object-[50%_25%]", center: true },
  { photo: PHOTOS.carpenter, label: "Menuiserie", href: "/jobs?category=menuiserie", ...onNarrow(30), w: 21, delay: 650, position: "object-[40%_center]" },
];

export function HeroOrbit() {
  const c = onWide(90);
  const n = onNarrow(90);
  return (
    <div className="relative mx-auto w-full max-w-6xl">
      {/* Large */}
      <div className="relative hidden aspect-[12/5] sm:block">
        <Orbit vb="0 0 1200 500" {...WIDE} />
        <Radar x={c.x} y={c.y} w={30} />
        {WIDE_PINS.map((p) => (
          <Pin key={p.label} p={p} />
        ))}
      </div>
      {/* Mobile */}
      <div className="relative aspect-[5/4] sm:hidden">
        <Orbit vb="0 0 400 320" {...NARROW} />
        <Radar x={n.x} y={n.y} w={44} />
        {NARROW_PINS.map((p) => (
          <Pin key={p.label} p={p} />
        ))}
      </div>
    </div>
  );
}
