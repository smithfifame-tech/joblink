import { format } from "date-fns";
import { fr } from "date-fns/locale";

/** Courbe 30 jours (inscriptions et missions), en SVG pur, animée au chargement. */
export function TrendChart({ series }: { series: { day: string; users: number; jobs: number }[] }) {
  const W = 640;
  const H = 220;
  const P = { t: 16, r: 12, b: 28, l: 28 };
  const max = Math.max(4, ...series.map((s) => Math.max(s.users, s.jobs)));
  const step = (W - P.l - P.r) / Math.max(1, series.length - 1);
  const x = (i: number) => P.l + i * step;
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / max);
  const line = (key: "users" | "jobs") => series.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s[key]).toFixed(1)}`).join(" ");
  const area = (key: "users" | "jobs") => `${line(key)} L${x(series.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`;
  const ticks = [0, Math.round(max / 2), max];
  const labels = series.length ? [0, Math.floor(series.length / 2), series.length - 1] : [];

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label="Inscriptions et missions publiées sur 30 jours">
        <defs>
          <linearGradient id="tc-users" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#16a34a" stopOpacity="0.28" />
            <stop offset="1" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tc-jobs" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#14532d" stopOpacity="0.16" />
            <stop offset="1" stopColor="#14532d" stopOpacity="0" />
          </linearGradient>
          <clipPath id="tc-reveal">
            <rect x="0" y="0" width={W} height={H} className="origin-left animate-[chart-reveal_1.4s_cubic-bezier(.22,1,.36,1)_both]" />
          </clipPath>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeDasharray="3 5" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" className="fill-gray-400 text-[10px]">{t}</text>
          </g>
        ))}
        <g clipPath="url(#tc-reveal)">
          <path d={area("jobs")} fill="url(#tc-jobs)" />
          <path d={line("jobs")} fill="none" stroke="#14532d" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 4" />
          <path d={area("users")} fill="url(#tc-users)" />
          <path d={line("users")} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {series.length > 0 && (
            <circle cx={x(series.length - 1)} cy={y(series[series.length - 1]!.users)} r="4.5" fill="#16a34a" stroke="#fff" strokeWidth="2" />
          )}
        </g>
        {labels.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} className="fill-gray-400 text-[10px]">
            {format(new Date(series[i]!.day), "d MMM", { locale: fr })}
          </text>
        ))}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-primary" /> Inscriptions</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed border-primary-strong" /> Missions publiées</span>
      </figcaption>
    </figure>
  );
}

export function BarList({ items, empty }: { items: { name: string; count: number }[]; empty: string }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="grid gap-3">
      {items.map((it, idx) => (
        <li key={it.name} className="grid gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate font-medium">{it.name}</span>
            <span className="tabular-nums text-muted-foreground">{it.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-[#4ade80] animate-[bar-grow_1s_cubic-bezier(.22,1,.36,1)_both]"
              style={{ width: `${Math.max(4, (it.count / max) * 100)}%`, animationDelay: `${150 + idx * 80}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
