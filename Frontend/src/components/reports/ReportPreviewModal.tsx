"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/http";
import type { ReportItem } from "@/types/report";

type ReportPreviewModalProps = {
  report: ReportItem | null;
  onClose: () => void;
  onDownload?: () => void | Promise<void>;
};

export function ReportPreviewModal({
  report,
  onClose,
  onDownload,
}: ReportPreviewModalProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!onDownload) {
      return;
    }
    setDownloading(true);
    try {
      await onDownload();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Download failed.";
      toast({
        title: "Download failed",
        description: message,
        tone: "error",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal
      open={Boolean(report)}
      title={report ? `Preview · ${report.fileName}` : "Preview"}
      onClose={onClose}
      className="max-w-4xl"
    >
      {report ? (
        <div className="space-y-4">
          {report.format === "html" ? (
            <iframe
              title={report.fileName}
              srcDoc={report.preview}
              className="h-[60vh] w-full rounded-lg border border-slate-800 bg-white"
              sandbox=""
            />
          ) : (
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-zinc-950 p-4 text-xs leading-relaxed text-slate-300">
              {report.preview}
            </pre>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {onDownload ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleDownload()}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-4" aria-hidden />
                )}
                Download
              </Button>
            ) : null}
            <Button type="button" variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
