"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Clock, FileSearch, Plus } from "lucide-react";

import { FindingsPage } from "@/components/findings/FindingsPage";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, inferErrorKind } from "@/components/ui/ErrorState";
import { FindingsListSkeleton } from "@/components/ui/Skeleton";
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
    return <FindingsListSkeleton />;
  }

  if (list.error && !targetId) {
    return (
      <ErrorState
        kind={inferErrorKind(list.error)}
        title="Unable to load findings"
        description={list.error}
        onRetry={() => list.refetch({ force: true })}
      />
    );
  }

  if (!targetId) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No findings yet"
        description="Findings appear here after a review completes successfully."
        primaryAction={{
          label: "Start New Review",
          href: "/reviews/new",
          variant: "primary",
        }}
        secondaryAction={{
          label: "Open Reviews",
          href: "/reviews",
        }}
      />
    );
  }

  if (result.isLoading && !result.data) {
    return <FindingsListSkeleton />;
  }

  if (result.data && (result.data.status === "queued" || result.data.status === "running")) {
    return (
      <EmptyState
        icon={Clock}
        title="Review not ready"
        description="Findings will appear when this review completes."
        primaryAction={{
          label: "View live progress",
          href: `/reviews/${result.data.id}/running`,
          variant: "primary",
        }}
      />
    );
  }

  if (result.error || !completedResult) {
    return (
      <ErrorState
        kind={inferErrorKind(result.error)}
        title="Unable to load findings"
        description={
          result.error ??
          (!hasAnyCompleted
            ? "No completed review is available yet."
            : "The selected review is not completed or has no result payload.")
        }
        onRetry={() => result.refetch({ force: true })}
        secondaryAction={
          <Link href="/reviews/new">
            <Button variant="secondary">
              <Plus className="size-4" aria-hidden />
              Start New Review
            </Button>
          </Link>
        }
      />
    );
  }

  const data = mapCategoryFindings(completedResult, category);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Showing findings for review{" "}
        <Link
          href={`/reviews/${completedResult.id}`}
          className="text-blue-400 transition-colors hover:text-blue-300"
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
    <Suspense fallback={<FindingsListSkeleton />}>
      <LiveFindingsInner category={category} />
    </Suspense>
  );
}
