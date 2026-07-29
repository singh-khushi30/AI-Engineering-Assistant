"use client";

import { useCallback, useRef, useState } from "react";

import { ApiError } from "@/lib/http";
import { sanitizeApiErrorMessage } from "@/lib/review-mappers";
import { reviewService } from "@/services/review.service";
import type { StartReviewRequest, StartReviewResponse } from "@/types/api";

export type UseStartReviewResult = {
  isSubmitting: boolean;
  error: string | null;
  data: StartReviewResponse | null;
  startReview: (payload: StartReviewRequest) => Promise<StartReviewResponse | null>;
  clearError: () => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return sanitizeApiErrorMessage(error.message);
  }
  if (error instanceof Error && error.message) {
    return sanitizeApiErrorMessage(error.message);
  }
  return "Unable to start the review.";
}

export function useStartReview(): UseStartReviewResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StartReviewResponse | null>(null);
  const inFlightRef = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const startReview = useCallback(async (payload: StartReviewRequest) => {
    if (inFlightRef.current) {
      return null;
    }
    inFlightRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await reviewService.startReview(payload);
      setData(response);
      return response;
    } catch (err) {
      setError(toErrorMessage(err));
      setData(null);
      return null;
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return {
    isSubmitting,
    error,
    data,
    startReview,
    clearError,
  };
}
