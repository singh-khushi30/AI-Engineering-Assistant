"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ErrorState, inferErrorKind } from "@/components/ui/ErrorState";
import { ReviewDetailSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { useReviewStatus } from "@/hooks/useReviewStatus";
import { surfaces } from "@/lib/design";
import { invalidateLiveReviewCache } from "@/lib/live-review-cache";
import { mapApiProviderToLabel } from "@/lib/review-mappers";
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
  const { toast } = useToast();
  const { data, error, isLoading, isPolling, isTerminal, retry } = useReviewStatus(
    reviewId,
    { pollIntervalMs: 2000 },
  );
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const announcedTerminal = useRef(false);

  const active =
    Boolean(data) &&
    (data?.status === "queued" || data?.status === "running");
  const elapsed = useElapsedTime(data?.started_at ?? data?.created_at, {
    active,
  });

  useEffect(() => {
    if (!data || !isTerminal || announcedTerminal.current) {
      return;
    }
    announcedTerminal.current = true;

    if (data.status === "completed") {
      toast({
        title: "Review completed",
        description: `${data.project_name} finished successfully.`,
        tone: "success",
      });
      invalidateLiveReviewCache();
      router.replace(`/reviews/${reviewId}`);
      return;
    }

    if (data.status === "failed") {
      toast({
        title: "Review failed",
        description: data.error ?? data.message ?? "The review did not complete.",
        tone: "error",
      });
    }
  }, [data, isTerminal, reviewId, router, toast]);

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
    return <ReviewDetailSkeleton />;
  }

  if (!data && error) {
    return (
      <ErrorState
        kind={inferErrorKind(error)}
        title="Unable to load review"
        description={error}
        onRetry={retry}
        secondaryAction={
          <Link href="/reviews">
            <Button variant="secondary">Back to Reviews</Button>
          </Link>
        }
      />
    );
  }

  if (!data) {
    return null;
  }

  const failed = data.status === "failed" || data.status === "cancelled";
  const steps = data.steps.filter((step) => step.status !== "skipped") as ReviewProgressStep[];

  if (failed) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          kind="review"
          title={data.status === "cancelled" ? "Review cancelled" : "Review failed"}
          description={
            [
              data.error ?? data.message ?? "The review did not complete successfully.",
              data.failed_stage ? `Failed stage: ${data.failed_stage}` : null,
            ]
              .filter(Boolean)
              .join(" ")
          }
          secondaryAction={
            <>
              <Link href="/reviews/new">
                <Button variant="primary">Retry Review</Button>
              </Link>
              <Link href="/reviews">
                <Button variant="secondary">Back to Reviews</Button>
              </Link>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className={surfaces.panel}>
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

      <section className={surfaces.panel}>
        <h2 className="text-lg font-semibold text-slate-50">Activity timeline</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150",
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
