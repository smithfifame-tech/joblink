import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export const APP_TIMEZONE = "Africa/Porto-Novo";

const xof = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Montant en FCFA (XOF n'a pas de subdivision). */
export function formatXOF(amount: number | bigint | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `${xof.format(n).replace(/ | /g, " ")} FCFA`;
}

function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

/** Affichage dans le fuseau Africa/Porto-Novo (UTC+1, sans heure d'été). */
function inAppTz(d: Date): Date {
  const local = new Date(d.toLocaleString("en-US", { timeZone: APP_TIMEZONE }));
  return isValid(local) ? local : d;
}

export function formatDate(value: string | Date | null | undefined, pattern = "d MMM yyyy"): string {
  if (!value) return "—";
  const d = toDate(value);
  if (!isValid(d)) return "—";
  return format(inAppTz(d), pattern, { locale: fr });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "d MMM yyyy 'à' HH:mm");
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = toDate(value);
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export function formatDistanceKm(km: number | null | undefined): string | null {
  if (km === null || km === undefined || !Number.isFinite(km)) return null;
  if (km < 1) return "< 1 km";
  return `≈ ${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} km`;
}

export function initials(first?: string | null, last?: string | null): string {
  return `${(first ?? "").charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase() || "JL";
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
