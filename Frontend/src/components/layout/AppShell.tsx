"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { NAV_ITEMS } from "@/constants/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
};

function resolvePageMeta(pathname: string): { title: string; subtitle: string } {
  const match = NAV_ITEMS.find((item) => {
    if (item.href === "/") {
      return pathname === "/";
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });

  return {
    title: match?.title ?? "Dashboard",
    subtitle: match?.subtitle ?? "Overview of your AI code reviews",
  };
}

export function AppShell({
  children,
  title,
  subtitle,
  className,
}: AppShellProps) {
  const pathname = usePathname();
  const meta = resolvePageMeta(pathname);

  return (
    <div className={cn("flex min-h-screen bg-zinc-950 text-slate-100", className)}>
      <Sidebar className="sticky top-0 hidden h-screen md:flex" />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar
          title={title ?? meta.title}
          subtitle={subtitle ?? meta.subtitle}
          className="sticky top-0 z-10"
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
