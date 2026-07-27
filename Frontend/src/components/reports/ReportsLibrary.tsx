"use client";

import { useState } from "react";

import { ReportCard } from "@/components/reports/ReportCard";
import { ReportPreviewModal } from "@/components/reports/ReportPreviewModal";
import type { ReportItem } from "@/types/report";

type ReportsLibraryProps = {
  reports: ReportItem[];
};

export function ReportsLibrary({ reports }: ReportsLibraryProps) {
  const [preview, setPreview] = useState<ReportItem | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Reports
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Exported JSON, Markdown, and HTML reports
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} onPreview={setPreview} />
        ))}
      </div>

      <ReportPreviewModal report={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
