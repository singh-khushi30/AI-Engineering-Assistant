export type ReportFormat = "json" | "markdown" | "html";

export type ReportItem = {
  id: string;
  fileName: string;
  format: ReportFormat;
  project: string;
  generatedAt: string;
  sizeLabel: string;
  provider: string;
  preview: string;
};
