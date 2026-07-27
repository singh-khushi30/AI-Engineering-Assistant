"use client";

import { Modal } from "@/components/ui/Modal";
import type { ReportItem } from "@/types/report";

type ReportPreviewModalProps = {
  report: ReportItem | null;
  onClose: () => void;
};

export function ReportPreviewModal({ report, onClose }: ReportPreviewModalProps) {
  return (
    <Modal
      open={Boolean(report)}
      title={report ? `Preview · ${report.fileName}` : "Preview"}
      onClose={onClose}
    >
      {report ? (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-zinc-950 p-4 text-xs leading-relaxed text-slate-300">
          {report.preview}
        </pre>
      ) : null}
    </Modal>
  );
}
