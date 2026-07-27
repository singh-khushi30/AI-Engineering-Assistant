import {
  CheckCircle2,
  FileCode2,
  GitBranch,
  Network,
  Shield,
  Sparkles,
  TestTube2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { TimelineStep } from "@/types/dashboard";

type ReviewTimelineProps = {
  steps: TimelineStep[];
  className?: string;
};

function stepIcon(label: string) {
  const key = label.toLowerCase();
  if (key.includes("git")) return GitBranch;
  if (key.includes("bandit") || key.includes("security")) return Shield;
  if (key.includes("ruff") || key.includes("style")) return FileCode2;
  if (key.includes("pytest") || key.includes("testing") || key.includes("coverage")) {
    return TestTube2;
  }
  if (key.includes("architecture")) return Network;
  if (key.includes("summary") || key.includes("completed")) return Sparkles;
  return CheckCircle2;
}

export function ReviewTimeline({ steps, className }: ReviewTimelineProps) {
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
        <button
          type="button"
          className="rounded-lg border border-slate-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-zinc-900 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          View Full Log
        </button>
      </div>

      <ol className="relative mt-5 space-y-0">
        {steps.map((step, index) => {
          const Icon = stepIcon(step.label);
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute top-8 left-[15px] h-[calc(100%-16px)] w-px bg-slate-800"
                  aria-hidden
                />
              ) : null}
              <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                <Icon className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <time className="font-mono text-xs text-slate-500">
                    {step.time}
                  </time>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">
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
    </section>
  );
}
