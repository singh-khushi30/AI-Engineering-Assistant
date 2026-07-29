import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/review";

type ReviewStatusBadgeProps = {
  status: ReviewStatus;
  className?: string;
};

const styles: Record<ReviewStatus, string> = {
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
  cancelled: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  running: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  queued: "border-amber-500/30 bg-amber-500/10 text-amber-200",
};

export function ReviewStatusBadge({ status, className }: ReviewStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        styles[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
