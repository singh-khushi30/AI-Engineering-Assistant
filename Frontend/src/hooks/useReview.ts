"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/http";
import { reviewService } from "@/services/review.service";
import type {
  CreateReviewRequest,
  ReviewDetailResponse,
  ReviewListResponse,
  ReviewReportFormat,
  ReviewReportResponse,
  ReviewStatusResponse,
  ReviewSummaryResponse,
} from "@/types/api";

type AsyncState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Request failed.";
}

function useAsyncResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  options: { enabled?: boolean; deps: unknown[] },
) {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const requestIdRef = useRef(0);

  const retry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    void (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loader(controller.signal);
        if (requestId !== requestIdRef.current) {
          return;
        }
        setData(result);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setData(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps provided explicitly
  }, [enabled, retryToken, ...options.deps]);

  if (!enabled) {
    return {
      data: null,
      error: null,
      isLoading: false,
      retry,
    } satisfies AsyncState<T> & { retry: () => void };
  }

  return { data, error, isLoading, retry };
}

/**
 * Fetch a single review by id. Ready for later UI wiring — unused by pages yet.
 */
export function useReview(id: string | null | undefined, options?: { enabled?: boolean }) {
  const enabled = (options?.enabled ?? true) && Boolean(id);

  return useAsyncResource<ReviewDetailResponse>(
    (signal) => reviewService.getReview(id as string, signal),
    { enabled, deps: [id] },
  );
}

/**
 * Fetch the reviews list.
 */
export function useReviews(options?: { enabled?: boolean }) {
  return useAsyncResource<ReviewListResponse>(
    (signal) => reviewService.listReviews(signal),
    { enabled: options?.enabled ?? true, deps: [] },
  );
}

/**
 * Poll review job status.
 */
export function useReviewStatus(
  id: string | null | undefined,
  options?: { enabled?: boolean; pollIntervalMs?: number | null },
) {
  const enabled = (options?.enabled ?? true) && Boolean(id);
  const pollIntervalMs = options?.pollIntervalMs ?? null;
  const [data, setData] = useState<ReviewStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const requestIdRef = useRef(0);

  const retry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !id) {
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    async function loadStatus() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await reviewService.getReviewStatus(id as string, controller.signal);
        if (requestId !== requestIdRef.current) {
          return;
        }
        setData(result);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setData(null);
        setError(toErrorMessage(err));
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void loadStatus();

    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (pollIntervalMs && pollIntervalMs > 0) {
      intervalId = setInterval(() => {
        void loadStatus();
      }, pollIntervalMs);
    }

    return () => {
      controller.abort();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [enabled, id, pollIntervalMs, retryToken]);

  if (!enabled) {
    return { data: null, error: null, isLoading: false, retry };
  }

  return { data, error, isLoading, retry };
}

/**
 * Imperative review actions with loading/error helpers.
 */
export function useReviewActions() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReview = useCallback(
    async (payload: CreateReviewRequest): Promise<ReviewSummaryResponse | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await reviewService.createReview(payload);
      } catch (err) {
        setError(toErrorMessage(err));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const fetchReport = useCallback(
    async (
      id: string,
      format: ReviewReportFormat = "json",
    ): Promise<ReviewReportResponse | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await reviewService.getReviewReport(id, format);
      } catch (err) {
        setError(toErrorMessage(err));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const cancelReview = useCallback(async (id: string): Promise<ReviewStatusResponse | null> => {
    setIsSubmitting(true);
    setError(null);
    try {
      return await reviewService.cancelReview(id);
    } catch (err) {
      setError(toErrorMessage(err));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSubmitting,
    error,
    clearError,
    createReview,
    fetchReport,
    cancelReview,
  };
}
