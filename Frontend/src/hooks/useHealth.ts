"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/http";
import { healthService } from "@/services/health.service";
import type {
  BackendConnectionStatus,
  HealthResponse,
} from "@/types/api";

export type UseHealthResult = {
  status: BackendConnectionStatus;
  health: HealthResponse | null;
  error: string | null;
  isLoading: boolean;
  isOnline: boolean;
  isOffline: boolean;
  lastCheckedAt: string | null;
  retry: () => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to reach the backend.";
}

/**
 * Checks backend liveness via GET /health on mount (and on retry).
 * Never throws — offline is a graceful UI state.
 */
export function useHealth(options?: {
  enabled?: boolean;
  pollIntervalMs?: number | null;
}): UseHealthResult {
  const enabled = options?.enabled ?? true;
  const pollIntervalMs = options?.pollIntervalMs ?? null;

  const [status, setStatus] = useState<BackendConnectionStatus>(
    enabled ? "checking" : "offline",
  );
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
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

    async function checkHealth() {
      setIsLoading(true);
      setStatus((previous) => (previous === "online" ? previous : "checking"));

      try {
        const response = await healthService.getHealth(controller.signal);
        if (requestId !== requestIdRef.current) {
          return;
        }

        const online =
          typeof response.status === "string" &&
          response.status.toLowerCase() === "healthy";

        setHealth(response);
        setError(null);
        setStatus(online ? "online" : "offline");
        setLastCheckedAt(new Date().toISOString());
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        if (requestId !== requestIdRef.current) {
          return;
        }

        setHealth(null);
        setError(toErrorMessage(err));
        setStatus("offline");
        setLastCheckedAt(new Date().toISOString());
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void checkHealth();

    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (pollIntervalMs && pollIntervalMs > 0) {
      intervalId = setInterval(() => {
        void checkHealth();
      }, pollIntervalMs);
    }

    return () => {
      controller.abort();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [enabled, pollIntervalMs, retryToken]);

  return {
    status,
    health,
    error,
    isLoading,
    isOnline: status === "online",
    isOffline: status === "offline",
    lastCheckedAt,
    retry,
  };
}
