"use client";

import { useEffect, useMemo } from "react";

import { useReviewList } from "@/hooks/useReviewList";
import { useReviewResult } from "@/hooks/useReviewResult";
import { useReviewStatus } from "@/hooks/useReviewStatus";
import {
  pickLatestActive,
  pickLatestCompleted,
} from "@/lib/review-mappers";
import type { ReviewResultResponse, ReviewSummaryResponse } from "@/types/api";

export type DashboardLiveMode =
  | "loading"
  | "offline-error"
  | "empty"
  | "running"
  | "completed"
  | "failed-latest";

export type UseLiveDashboardResult = {
  mode: DashboardLiveMode;
  listError: string | null;
  resultError: string | null;
  isLoading: boolean;
  latestCompleted: ReviewSummaryResponse | null;
  latestActive: ReviewSummaryResponse | null;
  completedResult: ReviewResultResponse | null;
  activeStatusId: string | null;
  refetchAll: () => void;
};

export function useLiveDashboard(): UseLiveDashboardResult {
  const list = useReviewList({ refetchOnFocus: true });
  const latestCompleted = useMemo(
    () => pickLatestCompleted(list.items),
    [list.items],
  );
  const latestActive = useMemo(
    () => pickLatestActive(list.items),
    [list.items],
  );

  const completed = useReviewResult(latestCompleted?.id, {
    enabled: Boolean(latestCompleted?.id),
  });

  const activeStatusId =
    !latestCompleted && latestActive ? latestActive.id : null;

  const { data: activeStatus, isTerminal } = useReviewStatus(activeStatusId, {
    enabled: Boolean(activeStatusId),
    pollIntervalMs: 2000,
  });

  const refetchList = list.refetch;
  const refetchCompleted = completed.refetch;

  useEffect(() => {
    if (isTerminal && activeStatus) {
      refetchList({ force: true });
    }
  }, [isTerminal, activeStatus, refetchList]);

  const mode: DashboardLiveMode = useMemo(() => {
    if (list.isLoading && list.items.length === 0) {
      return "loading";
    }
    if (list.error && list.items.length === 0) {
      return "offline-error";
    }
    if (latestCompleted) {
      return "completed";
    }
    if (latestActive) {
      return "running";
    }
    if (
      list.items.some(
        (item) => item.status === "failed" || item.status === "cancelled",
      )
    ) {
      return "failed-latest";
    }
    return "empty";
  }, [list.isLoading, list.error, list.items, latestCompleted, latestActive]);

  return {
    mode,
    listError: list.error,
    resultError: completed.error,
    isLoading: list.isLoading || (Boolean(latestCompleted) && completed.isLoading),
    latestCompleted,
    latestActive,
    completedResult: completed.data,
    activeStatusId,
    refetchAll: () => {
      refetchList({ force: true });
      refetchCompleted({ force: true });
    },
  };
}
