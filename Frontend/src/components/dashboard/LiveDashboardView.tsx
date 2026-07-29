"use client";

import Link from "next/link";
import {
  CloudOff,
  FileSearch,
  FileWarning,
  Loader2,
} from "lucide-react";

import {
  CoverageBreakdownCard,
  DashboardHeader,
  ExecutiveSummaryCard,
  PrioritizedIssues,
  ReportsCard,
  ReviewOverviewCard,
  ReviewSummaryCard,
  ReviewTimeline,
} from "@/components/dashboard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, inferErrorKind } from "@/components/ui/ErrorState";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { useHealth } from "@/hooks/useHealth";
import { useLiveDashboard } from "@/hooks/useLiveDashboard";
import { useReviewStatus } from "@/hooks/useReviewStatus";
import { surfaces } from "@/lib/design";
import {
  mapApiProviderToLabel,
  mapApiReviewToDashboardData,
} from "@/lib/review-mappers";
import { cn } from "@/lib/utils";

function RunningDashboardCard({
  reviewId,
  projectName,
  projectPath,
  provider,
}: {
  reviewId: string;
  projectName: string;
  projectPath: string;
  provider: string;
}) {
  const { data } = useReviewStatus(reviewId, { pollIntervalMs: 2000 });
  const elapsed = useElapsedTime(data?.started_at ?? data?.created_at, {
    active: data?.status === "queued" || data?.status === "running",
  });

  return (
    <section className={cn(surfaces.alertInfo)} aria-live="polite">
      <h2 className="text-xl font-semibold text-slate-50">{projectName}</h2>
      <p className="mt-1 break-all font-mono text-xs text-slate-500">{projectPath}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
          <dt className="text-xs text-slate-500">Provider</dt>
          <dd className="mt-1 text-sm text-slate-200">
            {mapApiProviderToLabel(provider)}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
          <dt className="text-xs text-slate-500">Status</dt>
          <dd className="mt-1 text-sm capitalize text-slate-200">
            {data?.status ?? "running"}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
          <dt className="text-xs text-slate-500">Current step</dt>
          <dd className="mt-1 text-sm text-slate-200">
            {data?.current_step_label ?? data?.message ?? "Starting"}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
          <dt className="text-xs text-slate-500">Elapsed</dt>
          <dd className="mt-1 text-sm text-slate-200">
            {Math.floor(elapsed / 60)}m {elapsed % 60}s
          </dd>
        </div>
      </dl>
      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label="Review progress"
        aria-valuetext={data?.current_step_label ?? "In progress"}
      >
        <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600 transition-all duration-300" />
      </div>
      <div className="mt-5">
        <Link href={`/reviews/${reviewId}/running`}>
          <Button variant="primary">View Live Review</Button>
        </Link>
      </div>
    </section>
  );
}

export function LiveDashboardView() {
  const { isOnline, isOffline } = useHealth({ pollIntervalMs: 30_000 });
  const {
    mode,
    listError,
    resultError,
    isLoading,
    latestCompleted,
    latestActive,
    completedResult,
    refetchAll,
  } = useLiveDashboard();

  if (isOffline && mode === "offline-error") {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <EmptyState
          icon={CloudOff}
          title="Backend offline"
          description="Start the FastAPI server to load live review data on the dashboard."
          tone="warning"
          primaryAction={{
            label: "Retry connection",
            onClick: refetchAll,
            variant: "secondary",
          }}
          secondaryAction={{
            label: "Start New Review",
            href: "/reviews/new",
            variant: "primary",
          }}
        />
      </div>
    );
  }

  if (mode === "loading" || (isLoading && !completedResult && mode === "completed")) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <DashboardSkeleton />
      </div>
    );
  }

  if (mode === "offline-error") {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <ErrorState
          kind={inferErrorKind(listError)}
          title="Unable to load reviews"
          description={listError ?? undefined}
          onRetry={refetchAll}
          secondaryAction={
            <Link href="/reviews/new">
              <Button variant="secondary">New Review</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (mode === "empty") {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <EmptyState
          icon={FileSearch}
          title="No reviews yet"
          description="Run your first multi-agent code review to see coverage, findings, architecture insights, and generated reports here."
          primaryAction={{
            label: "Start New Review",
            href: "/reviews/new",
            variant: "primary",
          }}
          secondaryAction={{
            label: "Open Reviews",
            href: "/reviews",
          }}
        >
          <p className="mx-auto mt-4 max-w-md text-xs text-slate-500">
            {isOnline
              ? "The backend is connected and ready."
              : "Backend connectivity could not be confirmed."}
          </p>
        </EmptyState>
      </div>
    );
  }

  if (mode === "running" && latestActive) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          title="Dashboard"
          subtitle="A review is currently in progress"
          onRefresh={refetchAll}
          refreshing={isLoading}
        />
        <RunningDashboardCard
          reviewId={latestActive.id}
          projectName={latestActive.project_name}
          projectPath={latestActive.project_path}
          provider={latestActive.provider}
        />
      </div>
    );
  }

  if (mode === "failed-latest") {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <EmptyState
          icon={FileWarning}
          title="No completed reviews yet"
          description="Recent reviews failed or were cancelled. Start a new review to populate the dashboard."
          primaryAction={{
            label: "Start New Review",
            href: "/reviews/new",
            variant: "primary",
          }}
          secondaryAction={{
            label: "View Reviews",
            href: "/reviews",
          }}
        />
      </div>
    );
  }

  if (!completedResult || !latestCompleted) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        {resultError ? (
          <ErrorState
            kind={inferErrorKind(resultError)}
            title="Unable to load review"
            description={resultError}
            onRetry={refetchAll}
          />
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-400" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading latest review…
          </div>
        )}
      </div>
    );
  }

  const data = mapApiReviewToDashboardData(completedResult);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Dashboard"
        subtitle={`Latest completed review · ${data.overview.projectName}`}
        onRefresh={refetchAll}
        refreshing={isLoading}
      />

      <ReviewOverviewCard data={data.overview} />

      <section aria-label="Review summaries">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.summaryCards.map((card) => (
            <ReviewSummaryCard key={card.id} data={card} />
          ))}
        </div>
      </section>

      <section
        aria-label="Summary and timeline"
        className="grid grid-cols-1 gap-6 xl:grid-cols-2"
      >
        <ExecutiveSummaryCard data={data.executiveSummary} />
        <ReviewTimeline
          steps={data.timeline}
          unavailable={data.timelineUnavailable}
          unavailableReason={data.timelineUnavailableReason}
        />
      </section>

      <section
        aria-label="Coverage, issues, and reports"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <CoverageBreakdownCard
          data={data.coverage}
          reviewId={latestCompleted.id}
        />
        <div className="space-y-6">
          <PrioritizedIssues issues={data.prioritizedIssues} />
          <ReportsCard reports={data.reports} />
        </div>
      </section>
    </div>
  );
}
