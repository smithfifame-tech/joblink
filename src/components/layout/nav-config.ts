import type { AppRole } from "@/types/db";

export type NavIcon =
  | "dashboard" | "plus" | "briefcase" | "inbox" | "users" | "messages" | "wallet" | "star" | "bell" | "user" | "settings"
  | "search" | "map" | "file" | "check" | "folder" | "receipt" | "percent" | "scale" | "flag" | "scroll" | "shield";

export interface NavItem { href: string; label: string; icon: NavIcon }

export const NAV: Record<AppRole, NavItem[]> = {
  client: [
    { href: "/client/dashboard", label: "Tableau de bord", icon: "dashboard" },
    { href: "/client/jobs/new", label: "Publier une mission", icon: "plus" },
    { href: "/client/jobs", label: "Mes missions", icon: "briefcase" },
    { href: "/client/applications", label: "Candidatures reçues", icon: "inbox" },
    { href: "/client/workers", label: "Travailleurs", icon: "users" },
    { href: "/messages", label: "Messages", icon: "messages" },
    { href: "/client/payments", label: "Paiements", icon: "wallet" },
    { href: "/client/reviews", label: "Avis", icon: "star" },
    { href: "/notifications", label: "Notifications", icon: "bell" },
    { href: "/client/profile", label: "Mon profil", icon: "user" },
    { href: "/client/settings", label: "Paramètres", icon: "settings" },
  ],
  worker: [
    { href: "/worker/dashboard", label: "Tableau de bord", icon: "dashboard" },
    { href: "/worker/jobs", label: "Missions disponibles", icon: "search" },
    { href: "/worker/map", label: "Carte des missions", icon: "map" },
    { href: "/worker/applications", label: "Mes candidatures", icon: "file" },
    { href: "/worker/contracts", label: "Missions acceptées", icon: "check" },
    { href: "/messages", label: "Messages", icon: "messages" },
    { href: "/worker/earnings", label: "Revenus", icon: "wallet" },
    { href: "/worker/reviews", label: "Évaluations", icon: "star" },
    { href: "/notifications", label: "Notifications", icon: "bell" },
    { href: "/worker/profile", label: "Mon profil", icon: "user" },
    { href: "/worker/settings", label: "Paramètres", icon: "settings" },
  ],
  admin: [
    { href: "/admin", label: "Vue générale", icon: "dashboard" },
    { href: "/admin/users", label: "Utilisateurs", icon: "users" },
    { href: "/admin/users?role=client", label: "Clients", icon: "user" },
    { href: "/admin/workers", label: "Travailleurs", icon: "shield" },
    { href: "/admin/jobs", label: "Missions", icon: "briefcase" },
    { href: "/admin/categories", label: "Catégories", icon: "folder" },
    { href: "/admin/applications", label: "Candidatures", icon: "file" },
    { href: "/admin/transactions", label: "Transactions", icon: "receipt" },
    { href: "/admin/commissions", label: "Commissions", icon: "percent" },
    { href: "/admin/disputes", label: "Litiges", icon: "scale" },
    { href: "/admin/reports", label: "Signalements", icon: "flag" },
    { href: "/admin/reviews", label: "Avis", icon: "star" },
    { href: "/notifications", label: "Notifications", icon: "bell" },
    { href: "/admin/settings", label: "Paramètres", icon: "settings" },
    { href: "/admin/audit-logs", label: "Journaux d'activité", icon: "scroll" },
  ],
};

export const ROLE_LABEL: Record<AppRole, string> = { client: "Espace client", worker: "Espace travailleur", admin: "Administration" };
