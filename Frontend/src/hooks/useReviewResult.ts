"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/http";
import {
  fetchReviewResultCached,
  invalidateLiveReviewCache,
  peekReviewResultCache,
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

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error instanceof ApiError) {
    const message = error.message.toLowerCase();
    return message.includes("cancelled") || message.includes("aborted");
  }
  return false;
}

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
  const activeId = enabled && id ? id : null;
  const initialCached = activeId ? peekReviewResultCache(activeId) : null;

  const [data, setData] = useState<ReviewResultResponse | null>(initialCached);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(activeId) && !initialCached);
  const [isNotFound, setIsNotFound] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const forceRef = useRef(false);
  const requestIdRef = useRef(0);
  const [trackedId, setTrackedId] = useState<string | null>(activeId);

  // Sync cache snapshot when the review id changes (render-phase, no effect setState).
  if (trackedId !== activeId) {
    setTrackedId(activeId);
    const next = activeId ? peekReviewResultCache(activeId) : null;
    setData(next);
    setError(null);
    setIsNotFound(false);
    setIsLoading(Boolean(activeId) && !next);
  }

  const refetch = useCallback((opts?: { force?: boolean }) => {
    if (activeId && opts?.force) {
      invalidateLiveReviewCache(activeId);
      forceRef.current = true;
    }
    setRetryToken((token) => token + 1);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) {
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const force = forceRef.current;
    forceRef.current = false;
    const hasCached = Boolean(peekReviewResultCache(activeId));

    void (async () => {
      if (!hasCached || force) {
        setIsLoading(true);
      }
      setError(null);
      setIsNotFound(false);
      try {
        const result = await fetchReviewResultCached(activeId, controller.signal, {
          force,
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setData(result);
      } catch (err) {
        if (
          controller.signal.aborted ||
          requestId !== requestIdRef.current ||
          isAbortError(err)
        ) {
          return;
        }
        if (!peekReviewResultCache(activeId)) {
          setData(null);
        }
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
  }, [activeId, retryToken]);

  if (!activeId) {
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
