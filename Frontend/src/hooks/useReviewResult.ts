"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/http";
import {
  fetchReviewResultCached,
  invalidateLiveReviewCache,
} from "@/lib/live-review-cache";
import { sanitizeApiErrorMessage } from "@/lib/review-mappers";
import type { ReviewResultResponse } from "@/types/api";

export type UseReviewResultOptions = {
  enabled?: boolean;
};

export type UseReviewResultState = {
  data: ReviewResultResponse | null;
  error: string | null;
  isLoading: boolean;
  isNotFound: boolean;
  refetch: (options?: { force?: boolean }) => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return sanitizeApiErrorMessage(error.message);
  }
  if (error instanceof Error && error.message) {
    return sanitizeApiErrorMessage(error.message);
  }
  return "Unable to load review result.";
}

export function useReviewResult(
  id: string | null | undefined,
  options?: UseReviewResultOptions,
): UseReviewResultState {
  const enabled = (options?.enabled ?? true) && Boolean(id);
  const [data, setData] = useState<ReviewResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const forceRef = useRef(false);
  const requestIdRef = useRef(0);

  const refetch = useCallback((opts?: { force?: boolean }) => {
    if (id && opts?.force) {
      invalidateLiveReviewCache(id);
      forceRef.current = true;
    }
    setRetryToken((token) => token + 1);
  }, [id]);

  useEffect(() => {
    if (!enabled || !id) {
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const force = forceRef.current;
    forceRef.current = false;

    void (async () => {
      setIsLoading(true);
      setError(null);
      setIsNotFound(false);
      try {
        const result = await fetchReviewResultCached(id, controller.signal, {
          force,
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setData(result);
      } catch (err) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setData(null);
        if (err instanceof ApiError && err.status === 404) {
          setIsNotFound(true);
          setError("Review not found");
        } else {
          setError(toErrorMessage(err));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [enabled, id, retryToken]);

  if (!enabled) {
    return {
      data: null,
      error: null,
      isLoading: false,
      isNotFound: false,
      refetch,
    };
  }

  return { data, error, isLoading, isNotFound, refetch };
}

export function useResolvedReview(
  reviewId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const result = useReviewResult(reviewId, options);
  return useMemo(() => result, [result]);
}
