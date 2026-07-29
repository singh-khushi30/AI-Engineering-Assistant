"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/http";
import {
  fetchReviewListCached,
  invalidateLiveReviewCache,
  peekReviewListCache,
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
  return "Unable to load reviews.";
}

function normalizeList(result: ReviewListResponse): ReviewListResponse {
  return {
    items: sortSummariesNewestFirst(result.items),
    total: result.total,
  };
}

export function useReviewList(options?: {
  enabled?: boolean;
  refetchOnFocus?: boolean;
}): UseReviewListResult {
  const enabled = options?.enabled ?? true;
  const refetchOnFocus = options?.refetchOnFocus ?? false;

  const initial = enabled ? peekReviewListCache() : null;
  const [data, setData] = useState<ReviewListResponse | null>(
    initial ? normalizeList(initial) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => enabled && !initial);
  const [retryToken, setRetryToken] = useState(0);
  const forceRef = useRef(false);
  const requestIdRef = useRef(0);

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
    const hasCached = Boolean(peekReviewListCache());

    void (async () => {
      if (!hasCached || force) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const result = await fetchReviewListCached(controller.signal, { force });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setData(normalizeList(result));
      } catch (err) {
        if (
          controller.signal.aborted ||
          requestId !== requestIdRef.current ||
          isAbortError(err)
        ) {
          return;
        }
        if (!peekReviewListCache()) {
          setData(null);
        }
        setError(toErrorMessage(err));
      } finally {
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
      // Soft refresh — keep cache, don't flash loading.
      setRetryToken((token) => token + 1);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, refetchOnFocus]);

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    data,
    error,
    isLoading,
    refetch,
  };
}
