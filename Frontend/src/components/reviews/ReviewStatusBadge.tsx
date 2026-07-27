import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/review";

type ReviewStatusBadgeProps = {
  status: ReviewStatus;
  className?: string;
};

export function ReviewStatusBadge({ status, className }: ReviewStatusBadgeProps) {
  const isCompleted = status === "completed";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        isCompleted
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/30 bg-red-500/10 text-red-300",
        className,
      )}
    >
      {status}
    </span>
  );
}
