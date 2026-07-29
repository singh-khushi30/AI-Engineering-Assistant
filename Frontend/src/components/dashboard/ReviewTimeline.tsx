import {
  CheckCircle2,
  Circle,
  FileCode2,
  GitBranch,
  Loader2,
  Network,
  Shield,
  Sparkles,
  TestTube2,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { TimelineStep } from "@/types/dashboard";

type ReviewTimelineProps = {
  steps: TimelineStep[];
  className?: string;
  unavailable?: boolean;
  unavailableReason?: string | null;
};

function stepIcon(label: string, status: TimelineStep["status"]) {
  if (status === "running") return Loader2;
  if (status === "failed") return XCircle;
  if (status === "pending") return Circle;

  const key = label.toLowerCase();
  if (key.includes("git")) return GitBranch;
  if (key.includes("bandit") || key.includes("security")) return Shield;
  if (key.includes("ruff") || key.includes("style")) return FileCode2;
  if (key.includes("pytest") || key.includes("testing") || key.includes("coverage")) {
    return TestTube2;
  }
  if (key.includes("architecture")) return Network;
  if (key.includes("summary") || key.includes("completed") || key.includes("started")) {
    return Sparkles;
  }
  return CheckCircle2;
}

function statusTone(status: TimelineStep["status"]): string {
  if (status === "running") return "text-blue-400";
  if (status === "failed") return "text-red-400";
  if (status === "pending") return "text-slate-500";
  return "text-emerald-400";
}

function iconWrapTone(status: TimelineStep["status"]): string {
  if (status === "running") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }
  if (status === "failed") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }
  if (status === "pending") {
    return "border-slate-700 bg-zinc-950 text-slate-500";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

export function ReviewTimeline({
  steps,
  className,
  unavailable = false,
  unavailableReason = null,
}: ReviewTimelineProps) {
  const empty = steps.length === 0;

  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl border border-slate-800 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 sm:p-6",
        className,
      )}
      aria-labelledby="review-timeline-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="review-timeline-heading"
          className="text-base font-semibold text-slate-50"
        >
          Review Timeline
        </h2>
        {!empty && !unavailable ? (
          <button
            type="button"
            className="rounded-lg border border-slate-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-zinc-900 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            View Full Log
          </button>
        ) : null}
      </div>

      {empty || unavailable ? (
        <div
          className="mt-5 flex flex-1 flex-col items-center justify-center rounded-lg border border-slate-800 bg-zinc-950/50 px-4 py-10 text-center"
          role="status"
        >
          <h3 className="text-sm font-semibold text-slate-100">Timeline unavailable</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            {unavailableReason ??
              "This review was imported from an older report that did not include execution events."}
          </p>
        </div>
      ) : (
        <ol className="relative mt-5 space-y-0">
          {steps.map((step, index) => {
            const Icon = stepIcon(step.label, step.status);
            const isLast = index === steps.length - 1;

            return (
              <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast ? (
                  <span
                    className="absolute top-8 left-[15px] h-[calc(100%-16px)] w-px bg-slate-800"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
                    iconWrapTone(step.status),
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5",
                      step.status === "running" && "animate-spin",
                    )}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <time className="font-mono text-xs text-slate-500">
                      {step.time}
                    </time>
                    <span
                      className={cn(
                        "text-[11px] font-medium uppercase tracking-wide",
                        statusTone(step.status),
                      )}
                    >
                      {step.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {step.label}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
