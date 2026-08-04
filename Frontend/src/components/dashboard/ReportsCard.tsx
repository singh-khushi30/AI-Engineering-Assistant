"use client";

import { useState } from "react";
import { Download, Eye, FileCode2, FileJson, FileText, Loader2, Package } from "lucide-react";

import { ReportPreviewModal } from "@/components/reports/ReportPreviewModal";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/http";
import { cn } from "@/lib/utils";
import { reviewService } from "@/services/review.service";
import type { ReportTile } from "@/types/dashboard";
import type { ReportItem } from "@/types/report";

type ReportsCardProps = {
  reports: ReportTile[];
  reviewId?: string;
  className?: string;
};

const reportVisual = {
  json: { icon: FileJson, accent: "text-amber-300 bg-amber-500/10 ring-amber-500/20" },
  markdown: {
    icon: FileText,
    accent: "text-blue-300 bg-blue-500/10 ring-blue-500/20",
  },
  html: {
    icon: FileCode2,
    accent: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/20",
  },
  all: {
    icon: Package,
    accent: "text-violet-300 bg-violet-500/10 ring-violet-500/20",
  },
} as const;

export function ReportsCard({ reports, reviewId, className }: ReportsCardProps) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<ReportItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleReportClick(report: ReportTile) {
    if (!reviewId || report.variant === "all") {
      toast({
        title: "Report unavailable",
        description: "Open the Reports page after a completed review.",
        tone: "warning",
      });
      return;
    }

    const format = report.variant;
    setBusyId(report.id);

    try {
      if (format === "html") {
        reviewService.openReport(reviewId, "html");
        toast({
          title: "Opening HTML report",
          description: report.name,
          tone: "success",
          durationMs: 2500,
        });
        return;
      }

      const text = await reviewService.fetchReportText(reviewId, format);
      setPreview({
        id: report.id,
        fileName: report.name,
        format,
        project: report.name.replace(/-review\.(json|md)$/i, ""),
        generatedAt: "Latest review",
        sizeLabel: `${Math.max(1, Math.round(text.length / 1024))} KB`,
        provider: "",
        preview: text,
        reviewId,
        canDownload: true,
        canPreview: true,
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to open report.";
      toast({
        title: "Could not open report",
        description: message,
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-800 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 sm:p-6",
        className,
      )}
      aria-labelledby="reports-heading"
    >
      <h2 id="reports-heading" className="text-base font-semibold text-slate-50">
        Reports
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {reports.map((report) => {
          const visual = reportVisual[report.variant];
          const Icon = visual.icon;
          const ActionIcon = report.variant === "html" ? Eye : Download;
          const isBusy = busyId === report.id;

          return (
            <button
              key={report.id}
              type="button"
              disabled={!reviewId || isBusy}
              onClick={() => void handleReportClick(report)}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-zinc-950/50 p-3 text-left transition-colors hover:border-slate-700 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
                  visual.accent,
                )}
              >
                {isBusy ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                ) : (
                  <Icon className="size-5" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-100">
                  {report.name}
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                  <ActionIcon className="size-3.5" aria-hidden />
                  {report.variant === "html" ? "View report" : "Preview & download"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <ReportPreviewModal
        report={preview}
        onClose={() => setPreview(null)}
        onDownload={
          preview?.reviewId
            ? async () => {
                await reviewService.downloadReport(
                  preview.reviewId!,
                  preview.format,
                  preview.fileName,
                );
                toast({
                  title: "Download started",
                  description: preview.fileName,
                  tone: "success",
                  durationMs: 2500,
                });
              }
            : undefined
        }
      />
    </section>
  );
}
