import {
  Boxes,
  Code2,
  FlaskConical,
  Shield,
  type LucideIcon,
} from "lucide-react";

import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { cn } from "@/lib/utils";
import type { ReviewSummaryCardData, ReviewSummaryKind } from "@/types/dashboard";

const iconMap: Record<
  ReviewSummaryKind,
  { icon: LucideIcon; iconClass: string; wrapClass: string }
> = {
  security: {
    icon: Shield,
    iconClass: "text-amber-300",
    wrapClass: "bg-amber-500/10 ring-amber-500/20",
  },
  style: {
    icon: Code2,
    iconClass: "text-emerald-300",
    wrapClass: "bg-emerald-500/10 ring-emerald-500/20",
  },
  testing: {
    icon: FlaskConical,
    iconClass: "text-blue-300",
    wrapClass: "bg-blue-500/10 ring-blue-500/20",
  },
  architecture: {
    icon: Boxes,
    iconClass: "text-violet-300",
    wrapClass: "bg-violet-500/10 ring-violet-500/20",
  },
};

type ReviewSummaryCardProps = {
  data: ReviewSummaryCardData;
  className?: string;
};

export function ReviewSummaryCard({ data, className }: ReviewSummaryCardProps) {
  const visual = iconMap[data.id];
  const Icon = visual.icon;

  return (
    <article
      className={cn(
        "group rounded-xl border border-slate-800 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 transition-colors hover:border-slate-700 hover:bg-zinc-900",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg ring-1",
            visual.wrapClass,
          )}
        >
          <Icon className={cn("size-5", visual.iconClass)} aria-hidden />
        </div>
        <SeverityBadge label={data.statusLabel} tone={data.statusTone} />
      </div>

      <h3 className="mt-4 text-sm font-medium text-slate-400">{data.title}</h3>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
        {data.primaryMetric}
      </p>
      <p className="mt-2 text-sm text-slate-500">{data.supportingText}</p>
    </article>
  );
}
