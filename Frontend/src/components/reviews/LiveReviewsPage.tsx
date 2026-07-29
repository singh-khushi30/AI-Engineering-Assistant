"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, RefreshCw } from "lucide-react";

import { ReviewsTable } from "@/components/reviews/ReviewsTable";
import { Button } from "@/components/ui/Button";
import { useReviewList } from "@/hooks/useReviewList";
import { reviewsMock } from "@/data/reviews-mock";
import { mapApiSummaryToReviewListItem } from "@/lib/review-mappers";

export function LiveReviewsPage() {
  const { items, error, isLoading, refetch } = useReviewList({
    refetchOnFocus: true,
  });
  const [showDemo, setShowDemo] = useState(false);

  const liveReviews = useMemo(
    () => items.map(mapApiSummaryToReviewListItem),
    [items],
  );

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-800" />
          <div className="h-10 w-32 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-slate-800 bg-zinc-900/40" />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
        <h1 className="text-xl font-semibold text-slate-50">Unable to load reviews</h1>
        <p className="mt-2 text-sm text-red-300">{error}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => refetch({ force: true })}>
            <RefreshCw className="size-4" aria-hidden />
            Retry
          </Button>
          <Link href="/reviews/new">
            <Button variant="secondary">New Review</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (liveReviews.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-800 bg-zinc-900/40 p-6">
          <h1 className="text-2xl font-semibold text-slate-50">No live reviews yet</h1>
          <p className="mt-2 text-sm text-slate-400">
            Start a review to populate this list from the backend. Demo samples are
            available below if you want to explore the UI.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/reviews/new">
              <Button variant="primary">
                <Plus className="size-4" aria-hidden />
                Start New Review
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => setShowDemo((value) => !value)}
            >
              {showDemo ? "Hide demo reviews" : "Show demo reviews"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => refetch({ force: true })}
              aria-label="Refresh reviews"
            >
              <RefreshCw className="size-4" aria-hidden />
              Refresh
            </Button>
          </div>
        </div>

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
      <div className="flex justify-end">
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
      </div>
      <ReviewsTable reviews={liveReviews} />
    </div>
  );
}
