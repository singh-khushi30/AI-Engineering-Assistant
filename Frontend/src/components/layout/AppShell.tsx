"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { resolveNavMeta } from "@/constants/navigation";
import { prefetchLiveReviewData } from "@/lib/live-review-cache";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeading?: boolean;
  actions?: ReactNode;
  className?: string;
};

export function AppShell({
  children,
  title,
  subtitle,
  showHeading = true,
  actions,
  className,
}: AppShellProps) {
  const pathname = usePathname();
  const meta = resolveNavMeta(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(
    () => setMobileNavOpen((open) => !open),
    [],
  );

  useEffect(() => {
    prefetchLiveReviewData();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && mobileNavOpen) {
        closeMobileNav();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen, closeMobileNav]);

  return (
    <div className={cn("flex min-h-screen bg-zinc-950 text-slate-100", className)}>
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>

      <Sidebar className="sticky top-0 hidden h-screen md:flex" />
      <Sidebar
        mobile
        open={mobileNavOpen}
        onClose={closeMobileNav}
        className="md:hidden"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar
          title={title ?? meta.title}
          subtitle={subtitle ?? meta.subtitle}
          showHeading={showHeading}
          actions={actions}
          onMenuClick={toggleMobileNav}
          menuOpen={mobileNavOpen}
        />

        <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto" tabIndex={-1}>
          <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
