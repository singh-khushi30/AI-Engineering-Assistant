"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, FileWarning, SearchX } from "lucide-react";

import { ReviewDetailView } from "@/components/reviews/ReviewDetailView";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, inferErrorKind } from "@/components/ui/ErrorState";
import { ReviewDetailSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useReviewResult } from "@/hooks/useReviewResult";
import { getReviewById } from "@/data/reviews-mock";
import { mapApiReviewToReviewDetail } from "@/lib/review-mappers";

type LiveReviewDetailProps = {
  reviewId: string;
};

export function LiveReviewDetail({ reviewId }: LiveReviewDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const toastedFailure = useRef(false);
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

  useEffect(() => {
    if (!data || toastedFailure.current) return;
    if (data.status === "failed") {
      toastedFailure.current = true;
      toast({
        title: "Review failed",
        description: data.error ?? data.message ?? "The review did not complete.",
        tone: "error",
      });
    }
  }, [data, toast]);

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
    return <ReviewDetailSkeleton />;
  }

  if (isNotFound) {
    return (
      <EmptyState
        icon={SearchX}
        title="Unknown review"
        description="This review ID was not found. It may have been removed, or the ID may be incorrect."
        primaryAction={{
          label: "Back to Reviews",
          href: "/reviews",
          variant: "primary",
        }}
        secondaryAction={{
          label: "Start New Review",
          href: "/reviews/new",
        }}
      />
    );
  }

  if (error && !mapped) {
    return (
      <ErrorState
        kind={inferErrorKind(error)}
        title="Unable to load review"
        description={error}
        onRetry={() => refetch({ force: true })}
        secondaryAction={
          <>
            <Link href={`/reviews/${reviewId}/running`}>
              <Button variant="secondary">Open running view</Button>
            </Link>
            <Link href="/reviews">
              <Button variant="ghost">Back to Reviews</Button>
            </Link>
          </>
        }
      />
    );
  }

  if (!mapped || !data) {
    return null;
  }

  if (data.status === "queued" || data.status === "running") {
    return (
      <EmptyState
        icon={Clock}
        title="Review not ready"
        description="This review is still running. Open the live execution page to follow progress."
        primaryAction={{
          label: "View live progress",
          href: `/reviews/${reviewId}/running`,
          variant: "primary",
        }}
        secondaryAction={{
          label: "Back to Reviews",
          href: "/reviews",
        }}
      />
    );
  }

  if (data.status === "failed" || data.status === "cancelled") {
    return (
      <div className="space-y-4">
        <ErrorState
          kind="review"
          title={data.status === "cancelled" ? "Review cancelled" : "Review failed"}
          description={
            data.error ?? data.message ?? "The review did not complete successfully."
          }
          secondaryAction={
            <>
              <Link href="/reviews/new">
                <Button variant="primary">
                  <FileWarning className="size-4" aria-hidden />
                  Retry Review
                </Button>
              </Link>
              <Link href="/reviews">
                <Button variant="secondary">Back to Reviews</Button>
              </Link>
            </>
          }
        />
        <ReviewDetailView review={mapped} />
      </div>
    );
  }

  return <ReviewDetailView review={mapped} />;
}
