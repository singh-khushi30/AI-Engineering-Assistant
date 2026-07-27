"use client";

import { Download, Eye, FileCode2, FileJson, FileText } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ReportItem } from "@/types/report";

type ReportCardProps = {
  report: ReportItem;
  onPreview: (report: ReportItem) => void;
};

const icons = {
  json: FileJson,
  markdown: FileText,
  html: FileCode2,
} as const;

export function ReportCard({ report, onPreview }: ReportCardProps) {
  const Icon = icons[report.format];

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
          <p className="mt-3 text-sm text-slate-400">
            Project: {report.project}
          </p>
          <p className="mt-1 text-xs text-slate-500">{report.generatedAt}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPreview(report)}
          className={cn("min-w-[110px]")}
        >
          <Eye className="size-3.5" aria-hidden />
          Preview
        </Button>
        <Button variant="ghost" size="sm" className="min-w-[110px]">
          <Download className="size-3.5" aria-hidden />
          Download
        </Button>
      </div>
    </article>
  );
}
