"use client";

import { Menu, User } from "lucide-react";
import type { ReactNode } from "react";

import { BackendStatusBadge } from "@/components/layout/BackendStatusBadge";
import { ProviderSelector } from "@/components/layout/ProviderSelector";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

type TopNavbarProps = {
  title?: string;
  subtitle?: string;
  showHeading?: boolean;
  actions?: ReactNode;
  className?: string;
  onMenuClick?: () => void;
  menuOpen?: boolean;
};

export function TopNavbar({
  title,
  subtitle,
  showHeading = true,
  actions,
  className,
  onMenuClick,
  menuOpen = false,
}: TopNavbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 bg-zinc-950/85 px-4 backdrop-blur-md sm:h-16 sm:gap-4 sm:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onMenuClick ? (
          <button
            type="button"
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-zinc-900 text-slate-200 transition-colors duration-150 hover:border-slate-700 hover:bg-zinc-800 md:hidden",
              focusRing,
            )}
            onClick={onMenuClick}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        ) : null}

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
            <p className="truncate text-sm text-slate-500">
              AI Engineering Assistant
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        {actions}
        <BackendStatusBadge />
        <ProviderSelector />
        <button
          type="button"
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-full border border-slate-800 bg-slate-800 text-slate-200 shadow-sm transition-colors duration-150 hover:border-slate-700 hover:bg-slate-700",
            focusRing,
          )}
          aria-label="Profile"
        >
          <User className="size-4" aria-hidden />
        </button>
      </div>
    </header>
  );
}
