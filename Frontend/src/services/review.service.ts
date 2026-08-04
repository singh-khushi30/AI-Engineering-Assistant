import { http } from "@/lib/http";
import {
  downloadReviewReport,
  fetchReviewReportText,
  getReviewReportUrl,
  openReviewReportInNewTab,
  type ReportDownloadFormat,
} from "@/lib/report-download";
import type {
  ReviewListResponse,
  ReviewResultResponse,
  ReviewStatusResponse,
  StartReviewRequest,
  StartReviewResponse,
} from "@/types/api";

/**
 * Review API wrappers — aligned to Backend `/reviews*` routes.
 */
export const reviewService = {
  startReview(
    payload: StartReviewRequest,
    signal?: AbortSignal,
  ): Promise<StartReviewResponse> {
    return http<StartReviewResponse>("/reviews", {
      method: "POST",
      body: payload,
      timeoutMs: 30_000,
      signal,
    });
  },

  /** @deprecated Prefer startReview */
  createReview(
    payload: StartReviewRequest,
    signal?: AbortSignal,
  ): Promise<StartReviewResponse> {
    return reviewService.startReview(payload, signal);
  },

  listReviews(signal?: AbortSignal): Promise<ReviewListResponse> {
    return http<ReviewListResponse>("/reviews", {
      method: "GET",
      signal,
    });
  },

  getReviewResult(
    id: string,
    signal?: AbortSignal,
  ): Promise<ReviewResultResponse> {
    return http<ReviewResultResponse>(`/reviews/${encodeURIComponent(id)}`, {
      method: "GET",
      timeoutMs: 30_000,
      signal,
    });
  },

  /** Alias used by hooks / detail pages */
  getReview(id: string, signal?: AbortSignal): Promise<ReviewResultResponse> {
    return reviewService.getReviewResult(id, signal);
  },

  getReviewStatus(
    id: string,
    signal?: AbortSignal,
  ): Promise<ReviewStatusResponse> {
    return http<ReviewStatusResponse>(
      `/reviews/${encodeURIComponent(id)}/status`,
      {
        method: "GET",
        timeoutMs: 15_000,
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

  reportUrl(id: string, format: ReportDownloadFormat): string {
    return getReviewReportUrl(id, format);
  },

  fetchReportText(
    id: string,
    format: ReportDownloadFormat,
    signal?: AbortSignal,
  ): Promise<string> {
    return fetchReviewReportText(id, format, signal);
  },

  downloadReport(
    id: string,
    format: ReportDownloadFormat,
    fileName: string,
    signal?: AbortSignal,
  ): Promise<void> {
    return downloadReviewReport(id, format, fileName, signal);
  },

  openReport(id: string, format: ReportDownloadFormat): void {
    openReviewReportInNewTab(id, format);
  },
};
