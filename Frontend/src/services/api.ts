import { getHttpBaseUrl } from "@/lib/http";
import { filesystemService } from "@/services/filesystem.service";
import { healthService } from "@/services/health.service";
import { reviewService } from "@/services/review.service";

/**
 * Central API surface for the frontend.
 * Components and hooks should import from here (or services), never call fetch directly.
 */
export const api = {
  baseUrl: getHttpBaseUrl,
  health: healthService,
  reviews: reviewService,
  filesystem: filesystemService,
} as const;

export { filesystemService } from "@/services/filesystem.service";
export { healthService } from "@/services/health.service";
export { reviewService } from "@/services/review.service";
export { ApiError, getHttpBaseUrl, http } from "@/lib/http";
