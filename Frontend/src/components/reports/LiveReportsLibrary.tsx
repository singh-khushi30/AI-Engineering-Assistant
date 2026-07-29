"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Eye, FileCode2, FileJson, FileText, Loader2, Plus } from "lucide-react";

import { ReportPreviewModal } from "@/components/reports/ReportPreviewModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useReviewList } from "@/hooks/useReviewList";
import { useReviewResult } from "@/hooks/useReviewResult";
import {
  mapApiReviewToReportItems,
  pickLatestCompleted,
} from "@/lib/review-mappers";
import { cn } from "@/lib/utils";
import type { ReportItem } from "@/types/report";

const icons = {
  json: FileJson,
  markdown: FileText,
  html: FileCode2,
} as const;

function LiveReportCard({
  report,
  onPreview,
}: {
  report: ReportItem;
  onPreview: (report: ReportItem) => void;
}) {
  const Icon = icons[report.format];
  const [copied, setCopied] = useState(false);

  async function copyPath() {
    if (!report.backendPath) {
      return;
    }
    try {
      await navigator.clipboard.writeText(report.backendPath);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="rounded-xl border border-slate-800 bg-zinc-900/50 p-5 shadow-sm shadow-black/20">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-slate-50">
            {report.fileName}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{report.format.toUpperCase()}</Badge>
            <Badge>{report.provider}</Badge>
            <Badge>{report.sizeLabel}</Badge>
          </div>
          <p className="mt-3 text-sm text-slate-400">Project: {report.project}</p>
          <p className="mt-1 text-xs text-slate-500">{report.generatedAt}</p>
          {report.reviewId ? (
            <p className="mt-1 text-xs text-slate-500">
              Review:{" "}
              <Link
                href={`/reviews/${report.reviewId}`}
                className="text-blue-400 hover:text-blue-300"
              >
                {report.reviewId.slice(0, 8)}…
              </Link>
            </p>
          ) : null}
          {report.backendPath ? (
            <p className="mt-2 break-all font-mono text-[11px] text-slate-500">
              {report.backendPath}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {report.canPreview !== false ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPreview(report)}
            className={cn("min-w-[110px]")}
          >
            <Eye className="size-3.5" aria-hidden />
            Preview
          </Button>
        ) : null}
        {report.backendPath ? (
          <Button
            variant="ghost"
            size="sm"
            className="min-w-[110px]"
            onClick={copyPath}
            aria-live="polite"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
            {copied ? "Copied" : "Copy Path"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function LiveReportsLibrary() {
  const list = useReviewList({ refetchOnFocus: true });
  const latest = useMemo(() => pickLatestCompleted(list.items), [list.items]);
  const result = useReviewResult(latest?.id, { enabled: Boolean(latest?.id) });
  const [preview, setPreview] = useState<ReportItem | null>(null);

  const reports = useMemo(() => {
    if (!result.data) {
      return [] as ReportItem[];
    }
    return mapApiReviewToReportItems(result.data);
  }, [result.data]);

  useEffect(() => {
    // no-op placeholder for future multi-review aggregation
  }, []);

  if (list.isLoading && !latest) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400" aria-busy="true">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading reports…
      </div>
    );
  }

  if (list.error && !latest) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
        <h1 className="text-xl font-semibold text-slate-50">Unable to load reports</h1>
        <p className="mt-2 text-sm text-red-300">{list.error}</p>
        <Button className="mt-4" variant="primary" onClick={() => list.refetch({ force: true })}>
          Retry
        </Button>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="rounded-xl border border-slate-800 bg-zinc-900/40 p-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-50">No reports yet</h1>
        <p className="mt-2 text-sm text-slate-400">
          Completed reviews export JSON, Markdown, and HTML artifacts on the backend host.
        </p>
        <Link href="/reviews/new" className="mt-6 inline-block">
          <Button variant="primary">
            <Plus className="size-4" aria-hidden />
            Start New Review
          </Button>
        </Link>
      </div>
    );
  }

  if (result.isLoading && reports.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-800" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-xl bg-slate-800/70" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Artifacts from {latest.project_name}. Files live on the backend filesystem.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-zinc-900/40 px-4 py-10 text-center text-sm text-slate-500">
          No report artifact paths were returned for this review.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {reports.map((report) => (
            <LiveReportCard key={report.id} report={report} onPreview={setPreview} />
          ))}
        </div>
      )}

      <ReportPreviewModal report={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
