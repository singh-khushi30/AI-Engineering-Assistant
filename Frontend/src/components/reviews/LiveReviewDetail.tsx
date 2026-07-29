"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ReviewDetailView } from "@/components/reviews/ReviewDetailView";
import { Button } from "@/components/ui/Button";
import { useReviewResult } from "@/hooks/useReviewResult";
import { mapApiReviewToReviewDetail } from "@/lib/review-mappers";
import { getReviewById } from "@/data/reviews-mock";

type LiveReviewDetailProps = {
  reviewId: string;
};

export function LiveReviewDetail({ reviewId }: LiveReviewDetailProps) {
  const router = useRouter();
  const mock = getReviewById(reviewId) ?? null;
  const { data, error, isLoading, isNotFound, refetch } = useReviewResult(
    mock ? null : reviewId,
    { enabled: !mock },
  );

  const mapped = useMemo(() => {
    if (!data) {
      return null;
    }
    return mapApiReviewToReviewDetail(data);
  }, [data]);

  useEffect(() => {
    if (!data) {
      return;
    }
    if (data.status === "queued" || data.status === "running") {
      router.replace(`/reviews/${reviewId}/running`);
    }
  }, [data, reviewId, router]);

  if (mock) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
          Demo review — static sample data.
        </p>
        <ReviewDetailView review={mock} />
      </div>
    );
  }

  if (isLoading && !mapped) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading review result…
        </div>
        <div className="h-28 animate-pulse rounded-xl border border-slate-800 bg-zinc-900/40" />
        <div className="h-48 animate-pulse rounded-xl border border-slate-800 bg-zinc-900/40" />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="rounded-xl border border-slate-800 bg-zinc-900/40 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-50">Review not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This review ID does not exist on the backend (jobs are in-memory and reset on restart).
        </p>
        <Link href="/reviews" className="mt-6 inline-block">
          <Button variant="primary">Back to Reviews</Button>
        </Link>
      </div>
    );
  }

  if (error && !mapped) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
        <h1 className="text-xl font-semibold text-slate-50">Unable to load review</h1>
        <p className="mt-2 text-sm text-red-300">{error}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => refetch({ force: true })}>
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

  if (!mapped || !data) {
    return null;
  }

  if (data.status === "queued" || data.status === "running") {
    return (
      <div className="rounded-xl border border-slate-800 bg-zinc-900/40 p-6">
        <h1 className="text-xl font-semibold text-slate-50">Review still in progress</h1>
        <p className="mt-2 text-sm text-slate-400">
          Redirecting to the live execution page…
        </p>
        <Link href={`/reviews/${reviewId}/running`} className="mt-4 inline-block">
          <Button variant="primary">View live progress</Button>
        </Link>
      </div>
    );
  }

  if (data.status === "failed" || data.status === "cancelled") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
          <h1 className="text-xl font-semibold text-slate-50">
            {data.status === "cancelled" ? "Review cancelled" : "Review failed"}
          </h1>
          <p className="mt-2 text-sm text-red-300">
            {data.error ?? data.message ?? "The review did not complete successfully."}
          </p>
          {data.failed_stage ? (
            <p className="mt-2 text-xs text-slate-500">
              Failed stage: {data.failed_stage}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/reviews/new">
              <Button variant="primary">Retry Review</Button>
            </Link>
            <Link href="/reviews">
              <Button variant="secondary">Back to Reviews</Button>
            </Link>
          </div>
        </div>
        <ReviewDetailView review={mapped} />
      </div>
    );
  }

  return <ReviewDetailView review={mapped} />;
}
