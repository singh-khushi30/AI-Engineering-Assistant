"use client";

/**
 * Transitional re-exports. Prefer dedicated hooks:
 * - useStartReview
 * - useReviewStatus
 * - useReviewResult
 */

export { useReviewResult as useReview } from "@/hooks/useReviewResult";
export { useReviewStatus } from "@/hooks/useReviewStatus";
export { useStartReview } from "@/hooks/useStartReview";

export { useReviewActions, useReviews } from "@/hooks/useReviewLegacy";
