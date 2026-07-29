"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";

import { FindingsPage } from "@/components/findings/FindingsPage";
import { Button } from "@/components/ui/Button";
import { useSelectedCompletedReview } from "@/hooks/useSelectedCompletedReview";
import { mapCategoryFindings } from "@/lib/finding-mappers";
import type { FindingCategory } from "@/types/finding";

type LiveFindingsViewProps = {
  category: FindingCategory;
};

function LiveFindingsInner({ category }: LiveFindingsViewProps) {
  const { list, targetId, result, completedResult, hasAnyCompleted } =
    useSelectedCompletedReview();

  if (list.isLoading && !targetId) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400" aria-busy="true">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading findings…
      </div>
    );
  }

  if (list.error && !targetId) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
        <h1 className="text-xl font-semibold text-slate-50">Unable to load findings</h1>
        <p className="mt-2 text-sm text-red-300">{list.error}</p>
        <Button className="mt-4" variant="primary" onClick={() => list.refetch({ force: true })}>
          <RefreshCw className="size-4" aria-hidden />
          Retry
        </Button>
      </div>
    );
  }

  if (!targetId) {
    return (
      <div className="rounded-xl border border-slate-800 bg-zinc-900/40 p-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-50">No completed review yet</h1>
        <p className="mt-2 text-sm text-slate-400">
          Findings appear here after a review completes successfully.
        </p>
        <Link href="/reviews/new" className="mt-6 inline-block">
          <Button variant="primary">
            <Plus className="size-4" aria-hidden />
            Start New Review
          </Button>
        </Link>
      </div>
    );
  }

  if (result.isLoading && !result.data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-56 animate-pulse rounded bg-slate-800" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-800/70" />
      </div>
    );
  }

  if (result.data && (result.data.status === "queued" || result.data.status === "running")) {
    return (
      <div className="rounded-xl border border-slate-800 bg-zinc-900/40 p-6">
        <h1 className="text-xl font-semibold text-slate-50">Review still running</h1>
        <p className="mt-2 text-sm text-slate-400">
          Findings will appear when this review completes.
        </p>
        <Link href={`/reviews/${result.data.id}/running`} className="mt-4 inline-block">
          <Button variant="primary">View live progress</Button>
        </Link>
      </div>
    );
  }

  if (result.error || !completedResult) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
        <h1 className="text-xl font-semibold text-slate-50">Unable to load findings</h1>
        <p className="mt-2 text-sm text-red-300">
          {result.error ??
            (!hasAnyCompleted
              ? "No completed review is available yet."
              : "The selected review is not completed or has no result payload.")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => result.refetch({ force: true })}>
            Retry
          </Button>
          <Link href="/reviews/new">
            <Button variant="secondary">Start New Review</Button>
          </Link>
        </div>
      </div>
    );
  }

  const data = mapCategoryFindings(completedResult, category);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Showing findings for review{" "}
        <Link
          href={`/reviews/${completedResult.id}`}
          className="text-blue-400 hover:text-blue-300"
        >
          {completedResult.project_name}
        </Link>
      </p>
      <FindingsPage data={data} />
    </div>
  );
}

export function LiveFindingsView({ category }: LiveFindingsViewProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading findings…
        </div>
      }
    >
      <LiveFindingsInner category={category} />
    </Suspense>
  );
}
