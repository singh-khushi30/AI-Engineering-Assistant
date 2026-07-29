"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Plus, X } from "lucide-react";
import { useEffect } from "react";

import { SidebarItem } from "@/components/layout/SidebarItem";
import { Button } from "@/components/ui/Button";
import {
  APP_NAME,
  APP_TAGLINE,
  NAV_ITEMS,
  isNavItemActive,
} from "@/constants/navigation";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

type SidebarProps = {
  className?: string;
  /** Mobile drawer mode */
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({
  className,
  mobile = false,
  open = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!mobile || !open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobile, open]);

  useEffect(() => {
    if (!mobile || !open) return;
    onClose?.();
    // Close drawer after client navigations.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname-driven close only
  }, [pathname]);

  const content = (
    <aside
      id={mobile ? "mobile-nav" : "desktop-nav"}
      className={cn(
        "flex h-full w-[min(100vw-3rem,260px)] shrink-0 flex-col border-r border-slate-800/80 bg-zinc-950",
        mobile &&
          "fixed inset-y-0 left-0 z-50 shadow-2xl shadow-black/50 transition-transform duration-200 ease-out",
        mobile && (open ? "translate-x-0" : "-translate-x-full"),
        className,
      )}
      aria-label="Primary"
      aria-hidden={mobile ? !open : undefined}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 px-5 py-5">
        <Link
          href="/dashboard"
          className={cn("flex min-w-0 items-start gap-3 rounded-lg", focusRing)}
          onClick={onClose}
        >
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
        {mobile ? (
          <Button
            variant="ghost"
            size="sm"
            className="size-9 shrink-0 px-0"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavItemActive(pathname, item.href)}
            onNavigate={onClose}
          />
        ))}
      </nav>

      <div className="border-t border-slate-800/80 p-3">
        <Link
          href="/reviews/new"
          onClick={onClose}
          className={cn(
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-950/40 transition-colors duration-150 hover:bg-blue-500",
            focusRing,
          )}
        >
          <Plus className="size-4" aria-hidden />
          New Review
        </Link>
      </div>
    </aside>
  );

  if (!mobile) {
    return content;
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        onClick={onClose}
      />
      {content}
    </>
  );
}
