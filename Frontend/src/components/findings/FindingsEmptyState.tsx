import { CheckCircle2 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type FindingsEmptyStateProps = {
  title: string;
  description: string;
  scanSummary?: {
    filesScanned: number;
    rulesChecked: number;
    executionTime: string;
  };
};

export function FindingsEmptyState({
  title,
  description,
  scanSummary,
}: FindingsEmptyStateProps) {
  return (
    <EmptyState
      icon={CheckCircle2}
      title={title}
      description={description}
      tone="success"
    >
      {scanSummary ? (
        <dl className="mx-auto mt-6 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
            <dt className="text-xs text-slate-500">Files scanned</dt>
            <dd className="mt-1 text-sm font-medium text-slate-200">
              {scanSummary.filesScanned}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
            <dt className="text-xs text-slate-500">Rules checked</dt>
            <dd className="mt-1 text-sm font-medium text-slate-200">
              {scanSummary.rulesChecked}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
            <dt className="text-xs text-slate-500">Execution time</dt>
            <dd className="mt-1 text-sm font-medium text-slate-200">
              {scanSummary.executionTime}
            </dd>
          </div>
        </dl>
      ) : null}
    </EmptyState>
  );
}
