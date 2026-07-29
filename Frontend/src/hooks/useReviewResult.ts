"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/http";
import { sanitizeApiErrorMessage } from "@/lib/review-mappers";
import { reviewService } from "@/services/review.service";
import type { ReviewResultResponse } from "@/types/api";

export type UseReviewResultOptions = {
  enabled?: boolean;
};

export type UseReviewResultState = {
  data: ReviewResultResponse | null;
  error: string | null;
  isLoading: boolean;
  retry: () => void;
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

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await reviewService.getReviewResult(id, controller.signal);
        if (requestId !== requestIdRef.current) {
          return;
        }
        setData(result);
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
  }, [enabled, id, retryToken]);

  if (!enabled) {
    return { data: null, error: null, isLoading: false, retry };
  }

  return { data, error, isLoading, retry };
}
