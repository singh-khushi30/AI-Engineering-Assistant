import { cn } from "@/lib/utils";
import type { SeverityLevel, StatusTone } from "@/types/dashboard";

const severityStyles: Record<SeverityLevel, string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
  high: "border-red-500/30 bg-red-500/10 text-red-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  low: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  info: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const toneStyles: Record<StatusTone, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  danger: "border-red-500/30 bg-red-500/10 text-red-300",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  neutral: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  purple: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

const severityLabels: Record<SeverityLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

type SeverityBadgeProps = {
  severity?: SeverityLevel;
  label?: string;
  tone?: StatusTone;
  className?: string;
};

export function SeverityBadge({
  severity,
  label,
  tone,
  className,
}: SeverityBadgeProps) {
  const text = label ?? (severity ? severityLabels[severity] : "Status");
  const styles = tone
    ? toneStyles[tone]
    : severity
      ? severityStyles[severity]
      : toneStyles.neutral;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        styles,
        className,
      )}
    >
      {text}
    </span>
  );
}
