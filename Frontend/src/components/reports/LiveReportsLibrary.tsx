"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Eye,
  FileCode2,
  FileJson,
  FileText,
  FolderOpen,
} from "lucide-react";

import { ReportPreviewModal } from "@/components/reports/ReportPreviewModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, inferErrorKind } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportsSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useReviewList } from "@/hooks/useReviewList";
import { useReviewResult } from "@/hooks/useReviewResult";
import { surfaces } from "@/lib/design";
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
  const { toast } = useToast();

  async function copyPath() {
    if (!report.backendPath) {
      return;
    }
    try {
      await navigator.clipboard.writeText(report.backendPath);
      setCopied(true);
      toast({
        title: "Path copied",
        description: "Report path copied to clipboard.",
        tone: "success",
        durationMs: 2500,
      });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      toast({
        title: "Copy failed",
        description: "Could not write to the clipboard.",
        tone: "error",
      });
    }
  }

  return (
    <article className={cn(surfaces.cardInteractive)}>
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
                className="text-blue-400 transition-colors hover:text-blue-300"
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
            className="min-w-[110px]"
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
  const list = useReviewList({ refetchOnFocus: false });
  const latest = useMemo(() => pickLatestCompleted(list.items), [list.items]);
  const result = useReviewResult(latest?.id, { enabled: Boolean(latest?.id) });
  const [preview, setPreview] = useState<ReportItem | null>(null);

  const reports = useMemo(() => {
    if (!result.data) {
      return [] as ReportItem[];
    }
    return mapApiReviewToReportItems(result.data);
  }, [result.data]);

  if (list.isLoading && !latest) {
    return <ReportsSkeleton />;
  }

  if (list.error && !latest) {
    return (
      <ErrorState
        kind={inferErrorKind(list.error)}
        title="Unable to load reports"
        description={list.error}
        onRetry={() => list.refetch({ force: true })}
      />
    );
  }

  if (!latest) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No reports yet"
        description="Completed reviews export JSON, Markdown, and HTML artifacts on the backend host."
        primaryAction={{
          label: "Start New Review",
          href: "/reviews/new",
          variant: "primary",
        }}
        secondaryAction={{
          label: "Browse Reviews",
          href: "/reviews",
        }}
      />
    );
  }

  if (result.isLoading && reports.length === 0) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Artifacts from ${latest.project_name}. Files live on the backend filesystem.`}
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No report artifacts"
          description="No report artifact paths were returned for this review."
          primaryAction={{
            label: "Open Review",
            href: `/reviews/${latest.id}`,
            variant: "primary",
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <LiveReportCard key={report.id} report={report} onPreview={setPreview} />
          ))}
        </div>
      )}

      <ReportPreviewModal report={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
