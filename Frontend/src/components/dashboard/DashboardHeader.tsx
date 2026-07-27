import { Plus, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  title?: string;
  subtitle?: string;
  className?: string;
};

export function DashboardHeader({
  title = "Dashboard",
  subtitle = "Overview of your latest AI code review",
  className,
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-blue-950/40 transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          <Plus className="size-4" aria-hidden />
          New Review
        </button>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-zinc-900 text-slate-300 transition-colors hover:border-slate-700 hover:bg-zinc-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
