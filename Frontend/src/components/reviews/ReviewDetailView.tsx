"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { CircularProgress } from "@/components/dashboard/CircularProgress";
import { PrioritizedIssues } from "@/components/dashboard/PrioritizedIssues";
import { ReviewSummaryCard } from "@/components/dashboard/ReviewSummaryCard";
import { ReviewTimeline } from "@/components/dashboard/ReviewTimeline";
import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { ReviewDetailHeader } from "@/components/reviews/ReviewDetailHeader";
import { ReviewTabs } from "@/components/reviews/ReviewTabs";
import { Button } from "@/components/ui/Button";
import type { ReviewDetail } from "@/types/review";
import type { ReviewSummaryCardData } from "@/types/dashboard";

type ReviewDetailViewProps = {
  review: ReviewDetail;
};

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "findings", label: "Findings" },
  { id: "raw", label: "Raw Output" },
];

export function ReviewDetailView({ review }: ReviewDetailViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);

  const summaryCards: ReviewSummaryCardData[] = review.agentResults.map((agent) => ({
    id:
      agent.id === "security" ||
      agent.id === "style" ||
      agent.id === "testing" ||
      agent.id === "architecture"
        ? agent.id
        : "testing",
    title: agent.title,
    primaryMetric: agent.metric,
    supportingText: agent.statusLabel,
    statusLabel: agent.statusLabel,
    statusTone:
      agent.statusLabel.toLowerCase().includes("fail")
        ? "danger"
        : agent.statusLabel.toLowerCase().includes("excellent")
          ? "success"
          : "warning",
  }));

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(review.rawJson, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <ReviewDetailHeader review={review} />

      <ReviewTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab}>
        {activeTab === "overview" ? (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <ReviewSummaryCard key={card.id + card.title} data={card} />
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-xl border border-slate-800 bg-zinc-900/50 p-5 sm:p-6">
                <h2 className="text-base font-semibold text-slate-50">
                  Executive Summary
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
                  {review.executiveSummary.split("\n\n").map((paragraph) => (
                    <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                  ))}
                </div>
                <ul className="mt-4 space-y-2 border-t border-slate-800 pt-4">
                  {review.highlights.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-slate-300">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-400"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <div className="space-y-6">
                <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-zinc-900/50 p-6">
                  {review.coveragePercent == null ? (
                    <p className="text-sm text-slate-500">Coverage unavailable</p>
                  ) : (
                    <div className="text-center">
                      <CircularProgress value={review.coveragePercent} />
                      <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                        Overall Coverage
                      </p>
                    </div>
                  )}
                </div>
                <PrioritizedIssues issues={review.prioritizedIssues} />
              </div>
            </section>

            <ReviewTimeline steps={review.timeline} />
          </div>
        ) : null}

        {activeTab === "findings" ? (
          <div className="space-y-4">
            {review.findingGroups.map((group) => (
              <section
                key={group.category}
                className="rounded-xl border border-slate-800 bg-zinc-900/50 p-5"
              >
                <h2 className="text-base font-semibold text-slate-50">
                  {group.label}
                </h2>
                {group.findings.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No findings.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {group.findings.map((finding) => (
                      <li
                        key={finding.id}
                        className="rounded-lg border border-slate-800 bg-zinc-950/50 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={finding.severity} />
                          <p className="text-sm font-medium text-slate-100">
                            {finding.title}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{finding.detail}</p>
                        <p className="mt-2 font-mono text-xs text-slate-500">
                          {finding.file}
                          {finding.line ? `:${finding.line}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        ) : null}

        {activeTab === "raw" ? (
          <section className="rounded-xl border border-slate-800 bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-50">Raw JSON</h2>
              <Button variant="secondary" size="sm" onClick={copyJson}>
                {copied ? (
                  <Check className="size-4 text-emerald-400" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                {copied ? "Copied" : "Copy JSON"}
              </Button>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-zinc-950 p-4 text-xs leading-relaxed text-slate-300">
              {JSON.stringify(review.rawJson, null, 2)}
            </pre>
          </section>
        ) : null}
      </ReviewTabs>
    </div>
  );
}
