"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { cn } from "@/lib/utils";
import type { FindingItem } from "@/types/finding";

type FindingCardProps = {
  finding: FindingItem;
};

export function FindingCard({ finding }: FindingCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-xl border border-slate-800 bg-zinc-900/50 shadow-sm shadow-black/20">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <SeverityBadge severity={finding.severity} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-100">
            {finding.title}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {finding.category}
            {finding.coverageLabel ? ` · Coverage ${finding.coverageLabel}` : ""}
          </span>
          <span className="mt-1 block truncate font-mono text-xs text-slate-500">
            {finding.file}
            {finding.line ? `:${finding.line}` : ""}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-slate-500 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-slate-800 px-4 py-4 text-sm text-slate-300">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Detail
            </p>
            <p className="mt-1 leading-relaxed">{finding.detail}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Recommendation
            </p>
            <p className="mt-1 leading-relaxed">{finding.recommendation}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
