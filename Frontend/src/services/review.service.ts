import { http } from "@/lib/http";
import type {
  CreateReviewRequest,
  ReviewDetailResponse,
  ReviewListResponse,
  ReviewReportFormat,
  ReviewReportResponse,
  ReviewStatusResponse,
  ReviewSummaryResponse,
} from "@/types/api";

/**
 * Review API wrappers.
 * Methods mirror expected FastAPI routes so the UI can adopt them without
 * rewriting fetch logic. Endpoints may not all be live yet.
 */
export const reviewService = {
  listReviews(signal?: AbortSignal): Promise<ReviewListResponse> {
    return http<ReviewListResponse>("/reviews", {
      method: "GET",
      signal,
    });
  },

  getReview(id: string, signal?: AbortSignal): Promise<ReviewDetailResponse> {
    return http<ReviewDetailResponse>(`/reviews/${encodeURIComponent(id)}`, {
      method: "GET",
      signal,
    });
  },

  createReview(
    payload: CreateReviewRequest,
    signal?: AbortSignal,
  ): Promise<ReviewSummaryResponse> {
    return http<ReviewSummaryResponse>("/reviews", {
      method: "POST",
      body: payload,
      timeoutMs: 30_000,
      signal,
    });
  },

  getReviewStatus(id: string, signal?: AbortSignal): Promise<ReviewStatusResponse> {
    return http<ReviewStatusResponse>(
      `/reviews/${encodeURIComponent(id)}/status`,
      {
        method: "GET",
        signal,
      },
    );
  },

  getReviewReport(
    id: string,
    format: ReviewReportFormat = "json",
    signal?: AbortSignal,
  ): Promise<ReviewReportResponse> {
    const query = new URLSearchParams({ format });
    return http<ReviewReportResponse>(
      `/reviews/${encodeURIComponent(id)}/report?${query.toString()}`,
      {
        method: "GET",
        signal,
      },
    );
  },

  cancelReview(id: string, signal?: AbortSignal): Promise<ReviewStatusResponse> {
    return http<ReviewStatusResponse>(
      `/reviews/${encodeURIComponent(id)}/cancel`,
      {
        method: "POST",
        signal,
      },
    );
  },
};
