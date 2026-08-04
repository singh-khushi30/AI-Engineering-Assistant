"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { PrioritizedIssue } from "@/types/dashboard";

type PrioritizedIssuesProps = {
  issues: PrioritizedIssue[];
  className?: string;
  onViewAll?: () => void;
};

export function PrioritizedIssues({
  issues,
  className,
  onViewAll,
}: PrioritizedIssuesProps) {
  const [selected, setSelected] = useState<PrioritizedIssue | null>(null);

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
          onClick={onViewAll}
          disabled={!onViewAll}
          className="rounded-lg border border-slate-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-zinc-900 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
              onClick={() => setSelected(issue)}
              aria-haspopup="dialog"
            >
              <SeverityBadge severity={issue.severity} className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-100">
                  {issue.title}
                </span>
                <span className="mt-1 block truncate font-mono text-xs text-slate-500">
                  {issue.file}
                  {issue.line ? `:${issue.line}` : ""}
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

      <Modal
        open={Boolean(selected)}
        title={selected?.title ?? "Issue detail"}
        onClose={() => setSelected(null)}
        className="max-w-2xl"
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={selected.severity} />
              {selected.category ? (
                <span className="rounded-md border border-slate-800 bg-zinc-950 px-2 py-0.5 text-xs capitalize text-slate-400">
                  {selected.category}
                </span>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Location
              </p>
              <p className="mt-1 break-all font-mono text-sm text-slate-300">
                {selected.file}
                {selected.line ? `:${selected.line}` : ""}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Detail
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                {selected.detail?.trim()
                  ? selected.detail
                  : "No additional detail was provided for this issue."}
              </p>
            </div>

            {selected.recommendation?.trim() ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Recommendation
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {selected.recommendation}
                </p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              {onViewAll ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSelected(null);
                    onViewAll();
                  }}
                >
                  View all findings
                </Button>
              ) : null}
              <Button
                type="button"
                variant="primary"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
