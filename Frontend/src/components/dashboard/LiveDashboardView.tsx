"use client";

import Link from "next/link";
import { Loader2, Plus, RefreshCw } from "lucide-react";

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
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { useHealth } from "@/hooks/useHealth";
import { useLiveDashboard } from "@/hooks/useLiveDashboard";
import { useReviewStatus } from "@/hooks/useReviewStatus";
import {
  mapApiProviderToLabel,
  mapApiReviewToDashboardData,
} from "@/lib/review-mappers";

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-800" />
      <div className="h-40 animate-pulse rounded-xl bg-slate-800/80" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-800/80" />
        ))}
      </div>
    </div>
  );
}

function EmptyDashboard({ backendOnline }: { backendOnline: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-zinc-900/40 px-6 py-14 text-center">
      <h2 className="text-2xl font-semibold text-slate-50">No reviews yet</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
        Run your first multi-agent code review to see coverage, findings,
        architecture insights, and generated reports here.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/reviews/new">
          <Button variant="primary">
            <Plus className="size-4" aria-hidden />
            Start New Review
          </Button>
        </Link>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        {backendOnline
          ? "The backend is connected and ready."
          : "Backend connectivity could not be confirmed."}
      </p>
    </div>
  );
}

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
    <section
      className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-6"
      aria-live="polite"
    >
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
        <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600" />
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
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-6">
          <h2 className="text-xl font-semibold text-slate-50">Backend offline</h2>
          <p className="mt-2 text-sm text-amber-100">
            Start the FastAPI server to load live review data.
          </p>
          <Button className="mt-4" variant="secondary" onClick={refetchAll}>
            <RefreshCw className="size-4" aria-hidden />
            Retry
          </Button>
        </div>
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
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
          <h2 className="text-xl font-semibold text-slate-50">Unable to load reviews</h2>
          <p className="mt-2 text-sm text-red-300">{listError}</p>
          <Button className="mt-4" variant="primary" onClick={refetchAll}>
            <RefreshCw className="size-4" aria-hidden />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "empty") {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <EmptyDashboard backendOnline={isOnline} />
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
        <div className="rounded-xl border border-slate-800 bg-zinc-900/40 p-6">
          <h2 className="text-xl font-semibold text-slate-50">No completed reviews yet</h2>
          <p className="mt-2 text-sm text-slate-400">
            Recent reviews failed or were cancelled. Start a new review to populate the dashboard.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/reviews/new">
              <Button variant="primary">Start New Review</Button>
            </Link>
            <Link href="/reviews">
              <Button variant="secondary">View Reviews</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!completedResult || !latestCompleted) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        {resultError ? (
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
            <h2 className="text-xl font-semibold text-slate-50">Unable to load review</h2>
            <p className="mt-2 text-sm text-red-300">{resultError}</p>
            <Button className="mt-4" variant="primary" onClick={refetchAll}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-400">
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
        <ReviewTimeline steps={data.timeline} />
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
