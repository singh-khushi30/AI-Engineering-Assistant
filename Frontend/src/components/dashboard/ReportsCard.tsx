import { Download, Eye, FileCode2, FileJson, FileText, Package } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReportTile } from "@/types/dashboard";

type ReportsCardProps = {
  reports: ReportTile[];
  className?: string;
};

const reportVisual = {
  json: { icon: FileJson, accent: "text-amber-300 bg-amber-500/10 ring-amber-500/20" },
  markdown: {
    icon: FileText,
    accent: "text-blue-300 bg-blue-500/10 ring-blue-500/20",
  },
  html: {
    icon: FileCode2,
    accent: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/20",
  },
  all: {
    icon: Package,
    accent: "text-violet-300 bg-violet-500/10 ring-violet-500/20",
  },
} as const;

export function ReportsCard({ reports, className }: ReportsCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-800 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 sm:p-6",
        className,
      )}
      aria-labelledby="reports-heading"
    >
      <h2 id="reports-heading" className="text-base font-semibold text-slate-50">
        Reports
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {reports.map((report) => {
          const visual = reportVisual[report.variant];
          const Icon = visual.icon;
          const ActionIcon = report.variant === "html" ? Eye : Download;

          return (
            <button
              key={report.id}
              type="button"
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-zinc-950/50 p-3 text-left transition-colors hover:border-slate-700 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
                  visual.accent,
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-100">
                  {report.name}
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                  <ActionIcon className="size-3.5" aria-hidden />
                  {report.actionLabel}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
