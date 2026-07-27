import { CheckCircle2 } from "lucide-react";

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
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
        <CheckCircle2 className="size-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-50">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
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
    </div>
  );
}
