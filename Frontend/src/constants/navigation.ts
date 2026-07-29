import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Code2,
  FileSearch,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Settings,
  Shield,
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
    href: "/dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    subtitle: "Overview of your latest AI code review",
  },
  {
    label: "Reviews",
    href: "/reviews",
    icon: FileSearch,
    title: "Reviews",
    subtitle: "Browse and compare previous AI code reviews",
  },
  {
    label: "Security",
    href: "/findings/security",
    icon: Shield,
    title: "Security Findings",
    subtitle: "Bandit-backed security review findings",
  },
  {
    label: "Style",
    href: "/findings/style",
    icon: Code2,
    title: "Style Findings",
    subtitle: "Ruff style and lint findings",
  },
  {
    label: "Testing",
    href: "/findings/testing",
    icon: FlaskConical,
    title: "Testing Findings",
    subtitle: "Pytest and coverage insights",
  },
  {
    label: "Architecture",
    href: "/findings/architecture",
    icon: Boxes,
    title: "Architecture Findings",
    subtitle: "Structure and modularity observations",
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

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/" || pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function resolveNavMeta(pathname: string): {
  title: string;
  subtitle: string;
} {
  const match = NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href));
  return {
    title: match?.title ?? "Dashboard",
    subtitle: match?.subtitle ?? "Overview of your latest AI code review",
  };
}
