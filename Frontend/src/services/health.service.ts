import { http } from "@/lib/http";
import type { HealthResponse } from "@/types/api";

export const healthService = {
  /**
   * Liveness probe — GET /health
   */
  getHealth(signal?: AbortSignal): Promise<HealthResponse> {
    return http<HealthResponse>("/health", {
      method: "GET",
      timeoutMs: 8_000,
      signal,
    });
  },
};
