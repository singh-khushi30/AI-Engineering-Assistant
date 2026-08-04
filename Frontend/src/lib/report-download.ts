import { getHttpBaseUrl } from "@/lib/http";
import { ApiError } from "@/lib/http";

export type ReportDownloadFormat = "json" | "markdown" | "html";

export function getReviewReportUrl(
  reviewId: string,
  format: ReportDownloadFormat,
): string {
  return `${getHttpBaseUrl()}/reviews/${encodeURIComponent(reviewId)}/reports/${format}`;
}

export async function fetchReviewReportText(
  reviewId: string,
  format: ReportDownloadFormat,
  signal?: AbortSignal,
): Promise<string> {
  const url = getReviewReportUrl(reviewId, format);
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "*/*" },
    signal,
  });

  if (!response.ok) {
    let detail = `Failed to load ${format} report (${response.status}).`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === "string" && body.detail.trim()) {
        detail = body.detail;
      }
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(detail, { status: response.status, url });
  }

  return response.text();
}

export async function downloadReviewReport(
  reviewId: string,
  format: ReportDownloadFormat,
  fileName: string,
  signal?: AbortSignal,
): Promise<void> {
  const url = getReviewReportUrl(reviewId, format);
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "*/*" },
    signal,
  });

  if (!response.ok) {
    let detail = `Failed to download ${format} report (${response.status}).`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === "string" && body.detail.trim()) {
        detail = body.detail;
      }
    } catch {
      // ignore
    }
    throw new ApiError(detail, { status: response.status, url });
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function openReviewReportInNewTab(
  reviewId: string,
  format: ReportDownloadFormat,
): void {
  window.open(getReviewReportUrl(reviewId, format), "_blank", "noopener,noreferrer");
}
