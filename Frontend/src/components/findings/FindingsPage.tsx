"use client";

import { useMemo, useState } from "react";

import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { FindingCard } from "@/components/findings/FindingCard";
import { FindingsEmptyState } from "@/components/findings/FindingsEmptyState";
import { FindingsFilters } from "@/components/findings/FindingsFilters";
import type { FindingsPageData } from "@/types/finding";
import type { SeverityLevel } from "@/types/dashboard";

type FindingsPageProps = {
  data: FindingsPageData;
};

type SeverityFilter = "all" | SeverityLevel;

export function FindingsPage({ data }: FindingsPageProps) {
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return data.findings.filter((finding) => {
      const matchesSeverity = filter === "all" || finding.severity === filter;
      const haystack = `${finding.title} ${finding.file} ${finding.category}`.toLowerCase();
      const matchesQuery = haystack.includes(query.trim().toLowerCase());
      return matchesSeverity && matchesQuery;
    });
  }, [data.findings, filter, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            {data.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{data.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge label={data.statusLabel} tone={data.statusTone} />
          <span className="rounded-full border border-slate-800 bg-zinc-900 px-2.5 py-1 text-xs text-slate-400">
            {data.findings.length} finding{data.findings.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {data.architectureScore ? (
        <section className="rounded-xl border border-slate-800 bg-zinc-900/50 p-5">
          <p className="text-sm text-slate-500">Architecture score</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">
            {data.architectureScore}
          </p>
          {data.strengths ? (
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.strengths.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2 text-sm text-slate-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {data.coverageOverview ? (
        <section className="rounded-xl border border-slate-800 bg-zinc-900/50 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-50">
                Coverage Overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Target {data.coverageOverview.target}% · Gap{" "}
                {data.coverageOverview.gap.toFixed(2)}%
              </p>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-slate-50">
              {data.coverageOverview.overall.toFixed(2)}%
            </p>
          </div>
          <div className="mt-4">
            <ProgressBar
              label="Overall coverage"
              value={data.coverageOverview.overall}
            />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
              <dt className="text-xs text-slate-500">Tests passed</dt>
              <dd className="mt-1 text-sm text-slate-200">
                {data.coverageOverview.testsPassed}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
              <dt className="text-xs text-slate-500">Failed</dt>
              <dd className="mt-1 text-sm text-slate-200">
                {data.coverageOverview.failed}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
              <dt className="text-xs text-slate-500">Target</dt>
              <dd className="mt-1 text-sm text-slate-200">
                {data.coverageOverview.target}%
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-zinc-950/50 px-3 py-2">
              <dt className="text-xs text-slate-500">Gap</dt>
              <dd className="mt-1 text-sm text-slate-200">
                {data.coverageOverview.gap.toFixed(2)}%
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      <FindingsFilters
        active={filter}
        onChange={setFilter}
        query={query}
        onQueryChange={setQuery}
      />

      {data.findings.length === 0 ? (
        <FindingsEmptyState
          title={data.emptyTitle ?? "No findings"}
          description={data.emptyDescription ?? "Nothing to show for this category."}
          scanSummary={data.scanSummary}
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-slate-500">
          No findings match your filters.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      )}
    </div>
  );
}
