"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/http";
import { sanitizeApiErrorMessage } from "@/lib/review-mappers";
import { reviewService } from "@/services/review.service";
import type {
  ReviewListResponse,
  ReviewStatusResponse,
  StartReviewRequest,
  StartReviewResponse,
} from "@/types/api";

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return sanitizeApiErrorMessage(error.message);
  }
  if (error instanceof Error && error.message) {
    return sanitizeApiErrorMessage(error.message);
  }
  return "Request failed.";
}

export function useReviews(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<ReviewListResponse | null>(null);
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
        const result = await reviewService.listReviews(controller.signal);
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
  }, [enabled, retryToken]);

  if (!enabled) {
    return { data: null, error: null, isLoading: false, retry };
  }

  return { data, error, isLoading, retry };
}

export function useReviewActions() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReview = useCallback(
    async (payload: StartReviewRequest): Promise<StartReviewResponse | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await reviewService.startReview(payload);
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
    cancelReview,
  };
}
