"use client";

import { RefreshCw } from "lucide-react";

import { useHealth } from "@/hooks/useHealth";
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

  const label =
    status === "online"
      ? "Backend Online"
      : status === "checking"
        ? "Checking Backend"
        : "Backend Offline";

  const indicator =
    status === "online" ? "🟢" : status === "checking" ? "🟡" : "🔴";

  const title =
    status === "online"
      ? `${health?.service ?? "Backend"} ${health?.version ?? ""}`.trim()
      : error ?? "Backend is unreachable";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium sm:text-sm",
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
      <span aria-hidden>{indicator}</span>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">
        {status === "online" ? "Online" : status === "checking" ? "…" : "Offline"}
      </span>

      {status === "offline" ? (
        <button
          type="button"
          onClick={retry}
          disabled={isLoading}
          className="ml-0.5 inline-flex size-6 items-center justify-center rounded-md text-red-200 transition-colors hover:bg-red-900/40 hover:text-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
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
