"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/http";
import {
  fetchReviewListCached,
  invalidateLiveReviewCache,
} from "@/lib/live-review-cache";
import {
  sanitizeApiErrorMessage,
  sortSummariesNewestFirst,
} from "@/lib/review-mappers";
import type { ReviewListResponse, ReviewSummaryResponse } from "@/types/api";

export type UseReviewListResult = {
  items: ReviewSummaryResponse[];
  total: number;
  data: ReviewListResponse | null;
  error: string | null;
  isLoading: boolean;
  refetch: (options?: { force?: boolean }) => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return sanitizeApiErrorMessage(error.message);
  }
  if (error instanceof Error && error.message) {
    return sanitizeApiErrorMessage(error.message);
  }
  return "Unable to load reviews.";
}

export function useReviewList(options?: {
  enabled?: boolean;
  refetchOnFocus?: boolean;
}): UseReviewListResult {
  const enabled = options?.enabled ?? true;
  const refetchOnFocus = options?.refetchOnFocus ?? true;

  const [data, setData] = useState<ReviewListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [retryToken, setRetryToken] = useState(0);
  const forceRef = useRef(false);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const refetch = useCallback((opts?: { force?: boolean }) => {
    if (opts?.force) {
      invalidateLiveReviewCache();
      forceRef.current = true;
    }
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const force = forceRef.current;
    forceRef.current = false;

    void (async () => {
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchReviewListCached(controller.signal, { force });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setData({
          items: sortSummariesNewestFirst(result.items),
          total: result.total,
        });
      } catch (err) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setData(null);
        setError(toErrorMessage(err));
      } finally {
        inFlightRef.current = false;
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [enabled, retryToken]);

  useEffect(() => {
    if (!enabled || !refetchOnFocus) {
      return;
    }
    const onFocus = () => {
      refetch({ force: true });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, refetchOnFocus, refetch]);

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    data,
    error,
    isLoading,
    refetch,
  };
}
