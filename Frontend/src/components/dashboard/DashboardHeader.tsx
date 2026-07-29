import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function DashboardHeader({
  title = "Dashboard",
  subtitle = "Overview of your latest AI code review",
  className,
  onRefresh,
  refreshing = false,
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link href="/reviews/new">
          <Button variant="primary">
            <Plus className="size-4" aria-hidden />
            New Review
          </Button>
        </Link>
        <Button
          variant="secondary"
          onClick={onRefresh}
          disabled={!onRefresh || refreshing}
          aria-label="Refresh dashboard"
          aria-busy={refreshing}
          className="size-10 px-0"
        >
          <RefreshCw
            className={cn("size-4", refreshing && "animate-spin")}
            aria-hidden
          />
        </Button>
      </div>
    </div>
  );
}
