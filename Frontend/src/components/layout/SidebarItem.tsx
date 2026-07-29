"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { focusRing } from "@/lib/design";
import { prefetchLiveReviewData } from "@/lib/live-review-cache";
import { cn } from "@/lib/utils";

type SidebarItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onNavigate?: () => void;
};

function shouldPrefetch(href: string): boolean {
  return (
    href === "/dashboard" ||
    href === "/reviews" ||
    href === "/reports" ||
    href.startsWith("/findings/")
  );
}

export function SidebarItem({
  href,
  label,
  icon: Icon,
  active = false,
  onNavigate,
}: SidebarItemProps) {
  function warmCache() {
    if (shouldPrefetch(href)) {
      prefetchLiveReviewData();
    }
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      onMouseEnter={warmCache}
      onFocus={warmCache}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
        focusRing,
        active
          ? "bg-blue-600 text-white shadow-sm shadow-blue-950/40"
          : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-100",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
