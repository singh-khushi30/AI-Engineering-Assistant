import { FolderGit2 } from "lucide-react";

import { CircularProgress } from "@/components/dashboard/CircularProgress";
import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { cn } from "@/lib/utils";
import type { ReviewOverview } from "@/types/dashboard";

type ReviewOverviewCardProps = {
  data: ReviewOverview;
  className?: string;
};

export function ReviewOverviewCard({ data, className }: ReviewOverviewCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-800 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 sm:p-6",
        className,
      )}
      aria-labelledby="review-overview-heading"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
              <FolderGit2 className="size-6 text-blue-400" aria-hidden />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="review-overview-heading"
                  className="text-xl font-semibold tracking-tight text-slate-50"
                >
                  {data.projectName}
                </h2>
                <SeverityBadge label={data.badgeLabel} tone="info" />
                <SeverityBadge label={data.status} tone="success" />
              </div>
              <p className="break-all font-mono text-xs text-slate-500 sm:text-sm">
                {data.projectPath}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-zinc-950/60 px-3 py-2.5">
              <dt className="text-xs text-slate-500">Provider</dt>
              <dd className="mt-1 text-sm font-medium text-slate-200">
                {data.provider}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-zinc-950/60 px-3 py-2.5">
              <dt className="text-xs text-slate-500">Duration</dt>
              <dd className="mt-1 text-sm font-medium text-slate-200">
                {data.durationLabel}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-zinc-950/60 px-3 py-2.5 sm:col-span-1">
              <dt className="text-xs text-slate-500">Completed</dt>
              <dd className="mt-1 text-sm font-medium text-slate-200">
                {data.completedAt}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 rounded-xl border border-slate-800 bg-zinc-950/50 px-6 py-4">
          {data.coveragePercent === null ? (
            <div className="flex size-[88px] items-center justify-center rounded-full border border-slate-800 text-sm font-semibold text-slate-400">
              N/A
            </div>
          ) : (
            <CircularProgress value={data.coveragePercent} />
          )}
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Overall Coverage
          </p>
        </div>
      </div>
    </section>
  );
}
