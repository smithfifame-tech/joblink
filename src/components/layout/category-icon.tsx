import {
  Bike, Briefcase, Car, Code, Drill, GraduationCap, Hammer, House, Leaf, MonitorSmartphone, Palette,
  PartyPopper, Scissors, Snowflake, Sparkles, Truck, Wrench, Zap, type LucideIcon,
} from "lucide-react";

/** Icônes Lucide des catégories (référencées par nom en base). Import explicite pour un bundle léger. */
const ICONS: Record<string, LucideIcon> = {
  wrench: Wrench, zap: Zap, car: Car, sparkles: Sparkles, house: House, bike: Bike, leaf: Leaf, hammer: Hammer,
  drill: Drill, snowflake: Snowflake, code: Code, palette: Palette, "monitor-smartphone": MonitorSmartphone,
  "party-popper": PartyPopper, scissors: Scissors, "graduation-cap": GraduationCap, truck: Truck, briefcase: Briefcase,
};

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = ICONS[name ?? ""] ?? Briefcase;
  return <Icon className={className} aria-hidden />;
}
