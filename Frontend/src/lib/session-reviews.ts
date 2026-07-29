import type { StartReviewRequest } from "@/types/api";

const DRAFT_FORM_KEY = "aea.review.form.draft";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function saveReviewFormDraft(draft: StartReviewRequest): void {
  if (!canUseSessionStorage()) {
    return;
  }
  window.sessionStorage.setItem(DRAFT_FORM_KEY, JSON.stringify(draft));
}

export function loadReviewFormDraft(): StartReviewRequest | null {
  if (!canUseSessionStorage()) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(DRAFT_FORM_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StartReviewRequest;
  } catch {
    return null;
  }
}

export function clearReviewFormDraft(): void {
  if (!canUseSessionStorage()) {
    return;
  }
  window.sessionStorage.removeItem(DRAFT_FORM_KEY);
}

/** @deprecated Session review list removed — backend list is authoritative. */
export function loadSessionReviews(): [] {
  return [];
}

/** @deprecated */
export function upsertSessionReview(): void {
  // no-op — backend list is authoritative
}
