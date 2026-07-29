"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/http";
import { sanitizeApiErrorMessage } from "@/lib/review-mappers";
import { reviewService } from "@/services/review.service";
import type { ReviewJobStatus, ReviewStatusResponse } from "@/types/api";

const TERMINAL: ReviewJobStatus[] = ["completed", "failed", "cancelled"];

export type UseReviewStatusOptions = {
  enabled?: boolean;
  pollIntervalMs?: number;
  maxTransientFailures?: number;
};

export type UseReviewStatusResult = {
  data: ReviewStatusResponse | null;
  error: string | null;
  isLoading: boolean;
  isPolling: boolean;
  isTerminal: boolean;
  retry: () => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return sanitizeApiErrorMessage(error.message);
  }
  if (error instanceof Error && error.message) {
    return sanitizeApiErrorMessage(error.message);
  }
  return "Unable to load review status.";
}

export function useReviewStatus(
  id: string | null | undefined,
  options?: UseReviewStatusOptions,
): UseReviewStatusResult {
  const enabled = (options?.enabled ?? true) && Boolean(id);
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;
  const maxTransientFailures = options?.maxTransientFailures ?? 3;

  const [data, setData] = useState<ReviewStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const inFlightRef = useRef(false);
  const failuresRef = useRef(0);
  const dataRef = useRef<ReviewStatusResponse | null>(null);

  const retry = useCallback(() => {
    failuresRef.current = 0;
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!enabled || !id) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        void poll();
      }, pollIntervalMs);
    };

    async function poll() {
      if (cancelled || inFlightRef.current) {
        return;
      }

      const current = dataRef.current;
      if (current && TERMINAL.includes(current.status)) {
        setIsPolling(false);
        return;
      }

      inFlightRef.current = true;
      setIsLoading(true);
      setIsPolling(true);

      try {
        const next = await reviewService.getReviewStatus(id as string, controller.signal);
        if (cancelled) {
          return;
        }
        failuresRef.current = 0;
        setData(next);
        setError(null);
        if (TERMINAL.includes(next.status)) {
          setIsPolling(false);
        } else {
          scheduleNext();
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        failuresRef.current += 1;
        setError(toErrorMessage(err));
        if (failuresRef.current < maxTransientFailures) {
          scheduleNext();
        } else {
          setIsPolling(false);
        }
      } finally {
        inFlightRef.current = false;
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void poll();

    return () => {
      cancelled = true;
      controller.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled, id, pollIntervalMs, maxTransientFailures, retryToken]);

  const isTerminal = Boolean(data && TERMINAL.includes(data.status));

  if (!enabled) {
    return {
      data: null,
      error: null,
      isLoading: false,
      isPolling: false,
      isTerminal: false,
      retry,
    };
  }

  return {
    data,
    error,
    isLoading,
    isPolling,
    isTerminal,
    retry,
  };
}
