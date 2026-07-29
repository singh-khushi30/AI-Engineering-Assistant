import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { cn } from "@/lib/utils";
import type { CoverageBreakdown } from "@/types/dashboard";

type CoverageBreakdownCardProps = {
  data: CoverageBreakdown;
  className?: string;
  reviewId?: string;
};

export function CoverageBreakdownCard({
  data,
  className,
  reviewId,
}: CoverageBreakdownCardProps) {
  const available = data.available && data.overallPercent !== null;

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
            {available && data.coveredLines !== null && data.totalLines !== null
              ? `${data.coveredLines.toLocaleString()} / ${data.totalLines.toLocaleString()} lines covered`
              : "Coverage data not available for this review"}
          </p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-slate-50">
          {available ? `${data.overallPercent!.toFixed(2)}%` : "N/A"}
        </p>
      </div>

      {available && data.modules.length > 0 ? (
        <div className="mt-5 space-y-4">
          {data.modules.map((module) => (
            <ProgressBar
              key={module.id}
              label={module.name}
              value={module.percent}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-4 text-sm text-slate-500">
          {available
            ? "Overall coverage is available, but no file-level breakdown was returned for this review."
            : "No coverage breakdown was returned for this review."}
        </p>
      )}

      {reviewId ? (
        <Link
          href={`/findings/testing?reviewId=${encodeURIComponent(reviewId)}`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          View testing findings
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}
