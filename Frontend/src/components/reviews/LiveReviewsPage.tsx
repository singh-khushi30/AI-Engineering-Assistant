"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileSearch, Loader2, Plus, RefreshCw } from "lucide-react";

import { ReviewsTable } from "@/components/reviews/ReviewsTable";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, inferErrorKind } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReviewsTableSkeleton } from "@/components/ui/Skeleton";
import { useReviewList } from "@/hooks/useReviewList";
import { reviewsMock } from "@/data/reviews-mock";
import { mapApiSummaryToReviewListItem } from "@/lib/review-mappers";

export function LiveReviewsPage() {
  const { items, error, isLoading, refetch } = useReviewList({
    refetchOnFocus: false,
  });
  const [showDemo, setShowDemo] = useState(false);

  const liveReviews = useMemo(
    () => items.map(mapApiSummaryToReviewListItem),
    [items],
  );

  if (isLoading && items.length === 0) {
    return <ReviewsTableSkeleton />;
  }

  if (error && items.length === 0) {
    return (
      <ErrorState
        kind={inferErrorKind(error)}
        title="Unable to load reviews"
        description={error}
        onRetry={() => refetch({ force: true })}
        secondaryAction={
          <Link href="/reviews/new">
            <Button variant="secondary">New Review</Button>
          </Link>
        }
      />
    );
  }

  if (liveReviews.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={FileSearch}
          title="No reviews yet"
          description="Start a review to populate this list from the backend. Demo samples are available if you want to explore the UI."
          primaryAction={{
            label: "Start New Review",
            href: "/reviews/new",
            variant: "primary",
          }}
          secondaryAction={{
            label: showDemo ? "Hide demo reviews" : "Show demo reviews",
            onClick: () => setShowDemo((value) => !value),
          }}
        />

        {showDemo ? (
          <div className="space-y-3">
            <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
              Demo reviews — static samples, not loaded from the backend.
            </p>
            <ReviewsTable reviews={reviewsMock} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reviews"
        description="Browse and compare previous AI code reviews"
        actions={
          <>
            <Link href="/reviews/new">
              <Button variant="primary" size="sm">
                <Plus className="size-3.5" aria-hidden />
                New Review
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch({ force: true })}
              aria-label="Refresh reviews list"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
              Refresh
            </Button>
          </>
        }
      />
      <ReviewsTable reviews={liveReviews} />
    </div>
  );
}
