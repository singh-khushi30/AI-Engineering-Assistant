"use client";

import { Bell, ChevronDown, User } from "lucide-react";
import type { ReactNode } from "react";

import { BackendStatusBadge } from "@/components/layout/BackendStatusBadge";
import { DEFAULT_PROVIDER } from "@/constants/navigation";
import { cn } from "@/lib/utils";

type TopNavbarProps = {
  title?: string;
  subtitle?: string;
  showHeading?: boolean;
  actions?: ReactNode;
  className?: string;
};

export function TopNavbar({
  title,
  subtitle,
  showHeading = true,
  actions,
  className,
}: TopNavbarProps) {
  return (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-zinc-950/80 px-4 backdrop-blur sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        {showHeading && title ? (
          <>
            <h1 className="truncate text-base font-semibold text-slate-50 sm:text-lg">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-xs text-slate-500 sm:text-sm">
                {subtitle}
              </p>
            ) : null}
          </>
        ) : (
          <p className="truncate text-sm text-slate-500">AI Engineering Assistant</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {actions}
        <BackendStatusBadge />
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 shadow-sm transition-colors hover:border-slate-700 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3 sm:text-sm"
          aria-label={`Provider: ${DEFAULT_PROVIDER}`}
        >
          <span>{DEFAULT_PROVIDER}</span>
          <ChevronDown className="size-3.5 text-slate-400" aria-hidden />
        </button>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-800 bg-zinc-900 text-slate-400 shadow-sm transition-colors hover:border-slate-700 hover:bg-zinc-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Notifications"
        >
          <Bell className="size-4" aria-hidden />
        </button>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full border border-slate-800 bg-slate-800 text-slate-200 shadow-sm transition-colors hover:border-slate-700 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Profile"
        >
          <User className="size-4" aria-hidden />
        </button>
      </div>
    </header>
  );
}
