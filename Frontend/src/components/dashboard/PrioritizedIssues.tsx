import { ChevronRight } from "lucide-react";

import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { cn } from "@/lib/utils";
import type { PrioritizedIssue } from "@/types/dashboard";

type PrioritizedIssuesProps = {
  issues: PrioritizedIssue[];
  className?: string;
};

export function PrioritizedIssues({ issues, className }: PrioritizedIssuesProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-800 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 sm:p-6",
        className,
      )}
      aria-labelledby="prioritized-issues-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="prioritized-issues-heading"
          className="text-base font-semibold text-slate-50"
        >
          Top Prioritized Issues
        </h2>
        <button
          type="button"
          className="rounded-lg border border-slate-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-zinc-900 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          View All Findings
        </button>
      </div>

      <ul className="mt-4 divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
        {issues.map((issue) => (
          <li key={issue.id}>
            <button
              type="button"
              className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-zinc-950/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
            >
              <SeverityBadge severity={issue.severity} className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-100">
                  {issue.title}
                </span>
                <span className="mt-1 block truncate font-mono text-xs text-slate-500">
                  {issue.file}
                </span>
              </span>
              <ChevronRight
                className="mt-1 size-4 shrink-0 text-slate-500"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
