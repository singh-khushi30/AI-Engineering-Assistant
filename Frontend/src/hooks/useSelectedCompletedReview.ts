"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { useReviewList } from "@/hooks/useReviewList";
import { useReviewResult } from "@/hooks/useReviewResult";
import { pickLatestCompleted } from "@/lib/review-mappers";
import type { ReviewResultResponse } from "@/types/api";

export function useSelectedCompletedReview(explicitReviewId?: string | null) {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("reviewId");
  const list = useReviewList({ refetchOnFocus: false });

  const targetId = useMemo(() => {
    if (explicitReviewId) {
      return explicitReviewId;
    }
    if (queryId) {
      return queryId;
    }
    return pickLatestCompleted(list.items)?.id ?? null;
  }, [explicitReviewId, queryId, list.items]);

  const result = useReviewResult(targetId, {
    enabled: Boolean(targetId),
  });

  const completedResult: ReviewResultResponse | null =
    result.data?.status === "completed" ? result.data : null;

  return {
    list,
    targetId,
    result,
    completedResult,
    hasAnyCompleted: Boolean(pickLatestCompleted(list.items)),
  };
}
