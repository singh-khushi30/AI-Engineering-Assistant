import { reviewService } from "@/services/review.service";
import type { ReviewListResponse, ReviewResultResponse } from "@/types/api";

type CacheEntry<T> = {
  value: T;
  fetchedAt: number;
};

const LIST_TTL_MS = 5_000;
const RESULT_TTL_MS = 10_000;

let listCache: CacheEntry<ReviewListResponse> | null = null;
let listInFlight: Promise<ReviewListResponse> | null = null;

const resultCache = new Map<string, CacheEntry<ReviewResultResponse>>();
const resultInFlight = new Map<string, Promise<ReviewResultResponse>>();

function isFresh(fetchedAt: number, ttlMs: number): boolean {
  return Date.now() - fetchedAt < ttlMs;
}

export function invalidateLiveReviewCache(reviewId?: string): void {
  if (reviewId) {
    resultCache.delete(reviewId);
    resultInFlight.delete(reviewId);
    return;
  }
  listCache = null;
  listInFlight = null;
  resultCache.clear();
  resultInFlight.clear();
}

export async function fetchReviewListCached(
  signal?: AbortSignal,
  options?: { force?: boolean },
): Promise<ReviewListResponse> {
  if (!options?.force && listCache && isFresh(listCache.fetchedAt, LIST_TTL_MS)) {
    return listCache.value;
  }

  if (!options?.force && listInFlight) {
    return listInFlight;
  }

  const request = reviewService.listReviews(signal).then((value) => {
    listCache = { value, fetchedAt: Date.now() };
    return value;
  });

  listInFlight = request;
  try {
    return await request;
  } finally {
    if (listInFlight === request) {
      listInFlight = null;
    }
  }
}

export async function fetchReviewResultCached(
  id: string,
  signal?: AbortSignal,
  options?: { force?: boolean },
): Promise<ReviewResultResponse> {
  const cached = resultCache.get(id);
  if (!options?.force && cached && isFresh(cached.fetchedAt, RESULT_TTL_MS)) {
    return cached.value;
  }

  const existing = resultInFlight.get(id);
  if (!options?.force && existing) {
    return existing;
  }

  const request = reviewService.getReviewResult(id, signal).then((value) => {
    resultCache.set(id, { value, fetchedAt: Date.now() });
    return value;
  });

  resultInFlight.set(id, request);
  try {
    return await request;
  } finally {
    if (resultInFlight.get(id) === request) {
      resultInFlight.delete(id);
    }
  }
}
