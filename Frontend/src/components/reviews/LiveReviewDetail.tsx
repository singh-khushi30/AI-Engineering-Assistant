"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { ReviewDetailView } from "@/components/reviews/ReviewDetailView";
import { Button } from "@/components/ui/Button";
import { useReviewResult } from "@/hooks/useReviewResult";
import { mapApiReviewToReviewDetail, mapApiSummaryToReviewListItem } from "@/lib/review-mappers";
import { upsertSessionReview } from "@/lib/session-reviews";
import type { ReviewDetail } from "@/types/review";

type LiveReviewDetailProps = {
  reviewId: string;
  mockFallback?: ReviewDetail | null;
};

export function LiveReviewDetail({ reviewId, mockFallback }: LiveReviewDetailProps) {
  const { data, error, isLoading, retry } = useReviewResult(reviewId, {
    enabled: !mockFallback,
  });

  const mapped = useMemo(() => {
    if (!data) {
      return null;
    }
    return mapApiReviewToReviewDetail(data);
  }, [data]);

  useEffect(() => {
    if (!data || !mapped) {
      return;
    }
    if (data.status !== "completed" && data.status !== "failed") {
      return;
    }
    const high = mapped.prioritizedIssues.filter((i) => i.severity === "high").length;
    const medium = mapped.prioritizedIssues.filter((i) => i.severity === "medium").length;
    const low = mapped.prioritizedIssues.filter((i) => i.severity === "low").length;
    const listItem = mapApiSummaryToReviewListItem({
      id: data.id,
      project_name: data.project_name,
      project_path: data.project_path,
      provider: data.provider,
      status: data.status,
      coverage_percent: mapped.coveragePercent,
      tests_passed: mapped.testsPassed,
      tests_failed: mapped.testsFailed,
      high_count: high,
      medium_count: medium,
      low_count: low,
      duration_seconds: data.duration_seconds,
      created_at: data.created_at,
      completed_at: data.completed_at,
      error: data.error,
    });
    if (listItem) {
      upsertSessionReview(listItem);
    }
  }, [data, mapped]);

  if (mockFallback) {
    return <ReviewDetailView review={mockFallback} />;
  }

  if (isLoading && !mapped) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading review result…
        </div>
        <div className="h-28 animate-pulse rounded-xl border border-slate-800 bg-zinc-900/40" />
        <div className="h-48 animate-pulse rounded-xl border border-slate-800 bg-zinc-900/40" />
      </div>
    );
  }

  if (error && !mapped) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
        <h1 className="text-xl font-semibold text-slate-50">Unable to load review</h1>
        <p className="mt-2 text-sm text-red-300">{error}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={retry}>
            Retry
          </Button>
          <Link href={`/reviews/${reviewId}/running`}>
            <Button variant="secondary">Open running view</Button>
          </Link>
          <Link href="/reviews">
            <Button variant="ghost">Back to Reviews</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!mapped) {
    return null;
  }

  if (data?.status === "queued" || data?.status === "running") {
    return (
      <div className="rounded-xl border border-slate-800 bg-zinc-900/40 p-6">
        <h1 className="text-xl font-semibold text-slate-50">Review still in progress</h1>
        <p className="mt-2 text-sm text-slate-400">
          This review has not finished yet. Continue on the live execution page.
        </p>
        <Link href={`/reviews/${reviewId}/running`} className="mt-4 inline-block">
          <Button variant="primary">View live progress</Button>
        </Link>
      </div>
    );
  }

  return <ReviewDetailView review={mapped} />;
}
