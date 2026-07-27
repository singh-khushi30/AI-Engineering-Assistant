"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Plus } from "lucide-react";

import { SidebarItem } from "@/components/layout/SidebarItem";
import {
  APP_NAME,
  APP_TAGLINE,
  NAV_ITEMS,
  isNavItemActive,
} from "@/constants/navigation";
import { cn } from "@/lib/utils";

type SidebarProps = {
  className?: string;
};

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-[260px] shrink-0 flex-col border-r border-slate-800 bg-zinc-950",
        className,
      )}
      aria-label="Primary"
    >
      <div className="border-b border-slate-800 px-5 py-5">
        <Link href="/dashboard" className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-950/50">
            <Bot className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-50">
              {APP_NAME}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {APP_TAGLINE}
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavItemActive(pathname, item.href)}
          />
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-950/40 transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus className="size-4" aria-hidden />
          New Review
        </button>
      </div>
    </aside>
  );
}
