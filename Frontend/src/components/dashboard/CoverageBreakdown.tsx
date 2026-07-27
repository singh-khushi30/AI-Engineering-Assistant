import { ArrowRight } from "lucide-react";

import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { cn } from "@/lib/utils";
import type { CoverageBreakdown } from "@/types/dashboard";

type CoverageBreakdownCardProps = {
  data: CoverageBreakdown;
  className?: string;
};

export function CoverageBreakdownCard({
  data,
  className,
}: CoverageBreakdownCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-800 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 sm:p-6",
        className,
      )}
      aria-labelledby="coverage-breakdown-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="coverage-breakdown-heading"
            className="text-base font-semibold text-slate-50"
          >
            Coverage Breakdown
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {data.coveredLines.toLocaleString()} / {data.totalLines.toLocaleString()}{" "}
            lines covered
          </p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-slate-50">
          {data.overallPercent.toFixed(2)}%
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {data.modules.map((module) => (
          <ProgressBar
            key={module.id}
            label={module.name}
            value={module.percent}
          />
        ))}
      </div>

      <button
        type="button"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        View full coverage report
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </section>
  );
}
