import type { ReviewListItem } from "@/types/review";
import type { StartReviewRequest } from "@/types/api";

const SESSION_REVIEWS_KEY = "aea.session.reviews";
const DRAFT_FORM_KEY = "aea.review.form.draft";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function loadSessionReviews(): ReviewListItem[] {
  if (!canUseSessionStorage()) {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(SESSION_REVIEWS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ReviewListItem[]) : [];
  } catch {
    return [];
  }
}

export function upsertSessionReview(item: ReviewListItem): void {
  if (!canUseSessionStorage()) {
    return;
  }
  const existing = loadSessionReviews().filter((review) => review.id !== item.id);
  const next = [item, ...existing];
  window.sessionStorage.setItem(SESSION_REVIEWS_KEY, JSON.stringify(next));
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
