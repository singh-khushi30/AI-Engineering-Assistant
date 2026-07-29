import { reviewService } from "@/services/review.service";
import type { ReviewListResponse, ReviewResultResponse } from "@/types/api";

type CacheEntry<T> = {
  value: T;
  fetchedAt: number;
};

/** Consider fresh — return without network. */
const LIST_FRESH_MS = 30_000;
const RESULT_FRESH_MS = 60_000;

/** Stale but usable — return immediately, refresh in background. */
const LIST_STALE_MS = 5 * 60_000;
const RESULT_STALE_MS = 30 * 60_000;

let listCache: CacheEntry<ReviewListResponse> | null = null;
let listInFlight: Promise<ReviewListResponse> | null = null;

const resultCache = new Map<string, CacheEntry<ReviewResultResponse>>();
const resultInFlight = new Map<string, Promise<ReviewResultResponse>>();

function ageMs(fetchedAt: number): number {
  return Date.now() - fetchedAt;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Request was cancelled.", "AbortError");
  }
}

/**
 * Shared in-flight requests must NOT use a caller's AbortSignal.
 * Suspense/Strict Mode remounts abort the first signal; joining callers
 * would otherwise reuse a rejected "Request was cancelled" promise.
 */
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

export function peekReviewListCache(): ReviewListResponse | null {
  return listCache?.value ?? null;
}

export function peekReviewResultCache(id: string): ReviewResultResponse | null {
  return resultCache.get(id)?.value ?? null;
}

function loadListNetwork(): Promise<ReviewListResponse> {
  if (listInFlight) {
    return listInFlight;
  }
  const request = reviewService.listReviews().then((value) => {
    listCache = { value, fetchedAt: Date.now() };
    return value;
  });
  listInFlight = request;
  void request.finally(() => {
    if (listInFlight === request) {
      listInFlight = null;
    }
  });
  return request;
}

function loadResultNetwork(id: string): Promise<ReviewResultResponse> {
  const existing = resultInFlight.get(id);
  if (existing) {
    return existing;
  }
  const request = reviewService.getReviewResult(id).then((value) => {
    resultCache.set(id, { value, fetchedAt: Date.now() });
    return value;
  });
  resultInFlight.set(id, request);
  void request.finally(() => {
    if (resultInFlight.get(id) === request) {
      resultInFlight.delete(id);
    }
  });
  return request;
}

export async function fetchReviewListCached(
  signal?: AbortSignal,
  options?: { force?: boolean },
): Promise<ReviewListResponse> {
  throwIfAborted(signal);

  if (!options?.force && listCache) {
    const age = ageMs(listCache.fetchedAt);
    if (age < LIST_FRESH_MS) {
      return listCache.value;
    }
    if (age < LIST_STALE_MS) {
      void loadListNetwork();
      return listCache.value;
    }
  }

  const value = await loadListNetwork();
  throwIfAborted(signal);
  return value;
}

export async function fetchReviewResultCached(
  id: string,
  signal?: AbortSignal,
  options?: { force?: boolean },
): Promise<ReviewResultResponse> {
  throwIfAborted(signal);

  const cached = resultCache.get(id);
  if (!options?.force && cached) {
    const age = ageMs(cached.fetchedAt);
    if (age < RESULT_FRESH_MS) {
      return cached.value;
    }
    if (age < RESULT_STALE_MS) {
      void loadResultNetwork(id);
      return cached.value;
    }
  }

  const value = await loadResultNetwork(id);
  throwIfAborted(signal);
  return value;
}

/** Warm list + latest completed review result for snappy sidebar navigation. */
export function prefetchLiveReviewData(): void {
  void loadListNetwork()
    .then((list) => {
      const completed = list.items.find((item) => item.status === "completed");
      if (completed?.id) {
        void loadResultNetwork(completed.id);
      }
    })
    .catch(() => {
      // Prefetch is best-effort.
    });
}
