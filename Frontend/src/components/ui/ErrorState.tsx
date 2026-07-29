import {
  AlertTriangle,
  CloudOff,
  FileWarning,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  TimerOff,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type ErrorKind =
  | "network"
  | "offline"
  | "timeout"
  | "validation"
  | "review"
  | "server"
  | "unknown";

const KIND_META: Record<
  ErrorKind,
  { icon: LucideIcon; title: string; defaultDescription: string }
> = {
  network: {
    icon: WifiOff,
    title: "Connection problem",
    defaultDescription:
      "We couldn’t reach the API. Check your network and try again.",
  },
  offline: {
    icon: CloudOff,
    title: "Backend offline",
    defaultDescription:
      "The review API isn’t responding. Start the FastAPI server and retry.",
  },
  timeout: {
    icon: TimerOff,
    title: "Request timed out",
    defaultDescription:
      "The backend took too long to respond. Retry in a moment.",
  },
  validation: {
    icon: ShieldAlert,
    title: "Invalid request",
    defaultDescription: "Some inputs couldn’t be accepted. Check and try again.",
  },
  review: {
    icon: FileWarning,
    title: "Review failed",
    defaultDescription:
      "This review didn’t complete successfully. You can retry or start a new one.",
  },
  server: {
    icon: ServerCrash,
    title: "Unexpected server error",
    defaultDescription:
      "Something went wrong on the backend. Retry, or check the server logs.",
  },
  unknown: {
    icon: AlertTriangle,
    title: "Something went wrong",
    defaultDescription: "An unexpected error occurred. Please try again.",
  },
};

type ErrorStateProps = {
  kind?: ErrorKind;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function ErrorState({
  kind = "unknown",
  title,
  description,
  onRetry,
  retryLabel = "Retry",
  secondaryAction,
  className,
  compact = false,
}: ErrorStateProps) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-red-900/40 bg-red-950/20",
        compact ? "p-4" : "px-6 py-10 text-center sm:px-8 sm:py-12",
        className,
      )}
    >
      <div
        className={cn(
          compact
            ? "flex items-start gap-3 text-left"
            : "flex flex-col items-center",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-300",
            compact ? "size-10" : "size-12",
          )}
        >
          <Icon className={compact ? "size-5" : "size-6"} aria-hidden />
        </div>
        <div className={cn(!compact && "mt-4")}>
          <h2
            className={cn(
              "font-semibold tracking-tight text-slate-50",
              compact ? "text-base" : "text-lg sm:text-xl",
            )}
          >
            {title ?? meta.title}
          </h2>
          <p
            className={cn(
              "text-sm leading-relaxed text-red-100/80",
              compact ? "mt-1" : "mx-auto mt-2 max-w-md",
            )}
          >
            {description ?? meta.defaultDescription}
          </p>
        </div>
      </div>

      {(onRetry || secondaryAction) && (
        <div
          className={cn(
            "flex flex-wrap gap-3",
            compact ? "mt-4" : "mt-6 justify-center",
          )}
        >
          {onRetry ? (
            <Button variant="primary" onClick={onRetry}>
              <RefreshCw className="size-4" aria-hidden />
              {retryLabel}
            </Button>
          ) : null}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

/** Infer a friendly error kind from an API / network error message. */
export function inferErrorKind(error: string | null | undefined): ErrorKind {
  if (!error) return "unknown";
  const lower = error.toLowerCase();
  if (lower.includes("timed out") || lower.includes("timeout")) return "timeout";
  if (
    lower.includes("unable to reach") ||
    lower.includes("failed to fetch") ||
    lower.includes("network")
  ) {
    return "network";
  }
  if (lower.includes("offline") || lower.includes("unreachable")) return "offline";
  if (
    lower.includes("validation") ||
    lower.includes("invalid") ||
    lower.includes("422")
  ) {
    return "validation";
  }
  if (lower.includes("500") || lower.includes("server")) return "server";
  return "unknown";
}
