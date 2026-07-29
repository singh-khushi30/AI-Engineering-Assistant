"use client";

import { Circle, Loader2, RefreshCw } from "lucide-react";

import { NavbarStatusSkeleton } from "@/components/ui/Skeleton";
import { useHealth } from "@/hooks/useHealth";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

type BackendStatusBadgeProps = {
  className?: string;
};

/**
 * Navbar backend connectivity indicator.
 * Uses the health service — never crashes the app when offline.
 */
export function BackendStatusBadge({ className }: BackendStatusBadgeProps) {
  const { status, error, isLoading, retry, health } = useHealth({
    pollIntervalMs: 30_000,
  });

  if (status === "checking" && !health) {
    return <NavbarStatusSkeleton className={className} />;
  }

  const label =
    status === "online"
      ? "Backend Online"
      : status === "checking"
        ? "Checking Backend"
        : "Backend Offline";

  const title =
    status === "online"
      ? `${health?.service ?? "Backend"} ${health?.version ?? ""}`.trim()
      : error ?? "Backend is unreachable";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 sm:text-sm",
        status === "online" &&
          "border-emerald-900/60 bg-emerald-950/40 text-emerald-300",
        status === "offline" &&
          "border-red-900/60 bg-red-950/40 text-red-300",
        status === "checking" &&
          "border-amber-900/60 bg-amber-950/40 text-amber-200",
        className,
      )}
      title={title}
      role="status"
      aria-live="polite"
    >
      {status === "checking" ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Circle
          className={cn(
            "size-2.5 fill-current",
            status === "online" ? "text-emerald-400" : "text-red-400",
          )}
          aria-hidden
        />
      )}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">
        {status === "online" ? "Online" : status === "checking" ? "…" : "Offline"}
      </span>

      {status === "offline" ? (
        <button
          type="button"
          onClick={retry}
          disabled={isLoading}
          className={cn(
            "ml-0.5 inline-flex size-7 items-center justify-center rounded-md text-red-200 transition-colors duration-150 hover:bg-red-900/40 hover:text-red-50 disabled:opacity-50",
            focusRing,
          )}
          aria-label="Retry backend connection"
        >
          <RefreshCw
            className={cn("size-3.5", isLoading && "animate-spin")}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}
