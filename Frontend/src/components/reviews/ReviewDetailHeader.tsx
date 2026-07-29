import { ReviewStatusBadge } from "@/components/reviews/ReviewStatusBadge";
import { Badge } from "@/components/ui/Badge";
import type { ReviewDetail } from "@/types/review";

type ReviewDetailHeaderProps = {
  review: ReviewDetail;
};

export function ReviewDetailHeader({ review }: ReviewDetailHeaderProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-zinc-900/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            {review.projectName}
          </h1>
          <p className="mt-1 break-all font-mono text-xs text-slate-500 sm:text-sm">
            {review.projectPath}
          </p>
        </div>
        <ReviewStatusBadge status={review.status} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2.5">
          <dt className="text-xs text-slate-500">Provider</dt>
          <dd className="mt-1">
            <Badge>{review.provider}</Badge>
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2.5">
          <dt className="text-xs text-slate-500">Duration</dt>
          <dd className="mt-1 text-sm text-slate-200">{review.durationLabel}</dd>
        </div>
        <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2.5">
          <dt className="text-xs text-slate-500">Coverage</dt>
          <dd className="mt-1 text-sm text-slate-200">
            {review.coveragePercent == null
              ? "Not available"
              : `${review.coveragePercent.toFixed(2)}%`}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2.5">
          <dt className="text-xs text-slate-500">Tests</dt>
          <dd className="mt-1 text-sm text-slate-200">
            {review.testsPassed === null && review.testsFailed === null
              ? "Not available"
              : `${review.testsPassed ?? 0} passed${
                  review.testsFailed && review.testsFailed > 0
                    ? `, ${review.testsFailed} failed`
                    : ""
                }`}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-500">Completed {review.completedAt}</p>
    </div>
  );
}
