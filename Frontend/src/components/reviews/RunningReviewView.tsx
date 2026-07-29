"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { useReviewStatus } from "@/hooks/useReviewStatus";
import {
  mapApiProviderToLabel,
  mapApiReviewToReviewDetail,
  mapApiSummaryToReviewListItem,
} from "@/lib/review-mappers";
import { upsertSessionReview } from "@/lib/session-reviews";
import { reviewService } from "@/services/review.service";
import { cn } from "@/lib/utils";
import type { ReviewProgressStep, ReviewStepStatus } from "@/types/api";

type RunningReviewViewProps = {
  reviewId: string;
};

function StepIcon({ status }: { status: ReviewStepStatus }) {
  if (status === "completed") {
    return <CheckCircle2 className="size-4 text-emerald-400" aria-hidden />;
  }
  if (status === "running") {
    return <Loader2 className="size-4 animate-spin text-blue-400" aria-hidden />;
  }
  if (status === "failed") {
    return <XCircle className="size-4 text-red-400" aria-hidden />;
  }
  if (status === "skipped") {
    return <Circle className="size-4 text-slate-600" aria-hidden />;
  }
  return <Circle className="size-4 text-slate-600" aria-hidden />;
}

function stepStatusLabel(status: ReviewStepStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "running":
      return "In progress";
    case "failed":
      return "Failed";
    case "skipped":
      return "Skipped";
    default:
      return "Pending";
  }
}

export function RunningReviewView({ reviewId }: RunningReviewViewProps) {
  const router = useRouter();
  const { data, error, isLoading, isPolling, isTerminal, retry } = useReviewStatus(
    reviewId,
    { pollIntervalMs: 2000 },
  );
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const active =
    Boolean(data) &&
    (data?.status === "queued" || data?.status === "running");
  const elapsed = useElapsedTime(data?.started_at ?? data?.created_at, {
    active,
  });

  useEffect(() => {
    if (!data || !isTerminal) {
      return;
    }

    if (data.status === "completed") {
      void (async () => {
        try {
          const result = await reviewService.getReviewResult(reviewId);
          const detail = mapApiReviewToReviewDetail(result);
          const listItem = mapApiSummaryToReviewListItem({
            id: result.id,
            project_name: result.project_name,
            project_path: result.project_path,
            provider: result.provider,
            status: result.status,
            coverage_percent: detail.coveragePercent,
            tests_passed: detail.testsPassed,
            tests_failed: detail.testsFailed,
            high_count: detail.prioritizedIssues.filter((i) => i.severity === "high").length,
            medium_count: detail.prioritizedIssues.filter((i) => i.severity === "medium").length,
            low_count: detail.prioritizedIssues.filter((i) => i.severity === "low").length,
            duration_seconds: result.duration_seconds,
            created_at: result.created_at,
            completed_at: result.completed_at,
            error: result.error,
          });
          if (listItem) {
            upsertSessionReview(listItem);
          }
        } catch {
          // Session list enrichment is best-effort.
        }
        router.replace(`/reviews/${reviewId}`);
      })();
    }
  }, [data, isTerminal, reviewId, router]);

  async function onCancel() {
    setCancelPending(true);
    setCancelError(null);
    try {
      await reviewService.cancelReview(reviewId);
      retry();
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Unable to cancel review.",
      );
    } finally {
      setCancelPending(false);
    }
  }

  if (!data && isLoading) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-800 bg-zinc-900/40 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-800" />
        <div className="h-2 w-full animate-pulse rounded bg-slate-800" />
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
        <h1 className="text-xl font-semibold text-slate-50">Unable to load review</h1>
        <p className="mt-2 text-sm text-red-300">{error}</p>
        <div className="mt-4 flex gap-3">
          <Button variant="primary" onClick={retry}>
            Retry
          </Button>
          <Link href="/reviews">
            <Button variant="secondary">Back to Reviews</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const failed = data.status === "failed" || data.status === "cancelled";
  const steps = data.steps.filter((step) => step.status !== "skipped") as ReviewProgressStep[];

  if (failed) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 rounded-xl border border-red-900/40 bg-zinc-900/40 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 size-6 text-red-400" aria-hidden />
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">Review Failed</h1>
            <p className="mt-2 text-sm text-slate-400">
              {data.error ?? data.message ?? "The review did not complete successfully."}
            </p>
            {data.failed_stage ? (
              <p className="mt-2 text-xs text-slate-500">
                Failed stage: <span className="text-slate-300">{data.failed_stage}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/reviews/new">
            <Button variant="primary">Retry Review</Button>
          </Link>
          <Link href="/reviews">
            <Button variant="secondary">Back to Reviews</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-slate-800 bg-zinc-900/40 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              {data.project_name}
            </h1>
            <p className="mt-1 break-all text-sm text-slate-500">{data.project_path}</p>
            <p className="mt-3 text-sm text-slate-400">
              Provider:{" "}
              <span className="text-slate-200">
                {mapApiProviderToLabel(data.provider)}
              </span>
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={cancelPending || data.status === "completed"}
            aria-busy={cancelPending}
          >
            {cancelPending ? "Cancelling…" : "Cancel"}
          </Button>
        </div>

        <div
          className="mt-5 grid gap-3 sm:grid-cols-3"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="rounded-lg border border-slate-800 bg-zinc-950/60 px-3 py-2">
            <p className="text-xs text-slate-500">Status</p>
            <p className="mt-1 text-sm font-medium text-slate-100 capitalize">
              {data.status}
              {isPolling ? " · live" : ""}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-zinc-950/60 px-3 py-2">
            <p className="text-xs text-slate-500">Elapsed</p>
            <p className="mt-1 text-sm font-medium text-slate-100">
              {Math.floor(elapsed / 60)}m {elapsed % 60}s
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-zinc-950/60 px-3 py-2">
            <p className="text-xs text-slate-500">Current step</p>
            <p className="mt-1 text-sm font-medium text-slate-100">
              {data.current_step_label ?? data.message ?? "Starting"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-label="Review progress"
            aria-valuetext={data.current_step_label ?? data.status}
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Progress is indeterminate while the backend reports step status only.
          </p>
        </div>

        {cancelError || error ? (
          <p className="mt-4 text-sm text-amber-300" role="alert">
            {cancelError ?? error}
          </p>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-800 bg-zinc-900/40 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-50">Activity timeline</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                step.status === "running" && "border-blue-900/50 bg-blue-950/20",
                step.status === "completed" && "border-slate-800 bg-zinc-950/40",
                step.status === "failed" && "border-red-900/40 bg-red-950/20",
                step.status === "pending" && "border-slate-800/80 bg-transparent opacity-70",
              )}
            >
              <StepIcon status={step.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-200">{step.label}</p>
                <p className="text-xs text-slate-500">
                  {stepStatusLabel(step.status)}
                  {step.detail ? ` · ${step.detail}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
