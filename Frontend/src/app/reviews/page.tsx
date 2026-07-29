"use client";

import { useSyncExternalStore } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ReviewsTable } from "@/components/reviews/ReviewsTable";
import { reviewsMock } from "@/data/reviews-mock";
import { loadSessionReviews } from "@/lib/session-reviews";
import type { ReviewListItem } from "@/types/review";

function mergeReviews(): ReviewListItem[] {
  const sessionItems = loadSessionReviews();
  if (sessionItems.length === 0) {
    return reviewsMock;
  }
  const mockIds = new Set(reviewsMock.map((item) => item.id));
  const liveOnly = sessionItems.filter((item) => !mockIds.has(item.id));
  return [...liveOnly, ...reviewsMock];
}

function subscribe() {
  return () => {};
}

export default function ReviewsPage() {
  const reviews = useSyncExternalStore(subscribe, mergeReviews, () => reviewsMock);

  return (
    <AppShell showHeading={false}>
      <ReviewsTable reviews={reviews} />
    </AppShell>
  );
}
