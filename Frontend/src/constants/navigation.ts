import type { LucideIcon } from "lucide-react";
import {
  FileSearch,
  FileText,
  LayoutDashboard,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    title: "Dashboard",
    subtitle: "Overview of your AI code reviews",
  },
  {
    label: "Reviews",
    href: "/reviews",
    icon: FileSearch,
    title: "Reviews",
    subtitle: "Browse and manage code review runs",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    title: "Reports",
    subtitle: "Exported JSON, Markdown, and HTML reports",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    title: "Settings",
    subtitle: "Providers, preferences, and defaults",
  },
];

export const APP_NAME = "AI Engineering Assistant";
export const APP_TAGLINE = "Multi-Agent Code Review";
export const DEFAULT_PROVIDER = "Gemini";
export const SIDEBAR_WIDTH_PX = 260;
