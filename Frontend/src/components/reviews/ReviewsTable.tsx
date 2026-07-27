"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";

import { ReviewStatusBadge } from "@/components/reviews/ReviewStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { ReviewListItem, ReviewStatus } from "@/types/review";

type FilterKey = "all" | ReviewStatus;

type ReviewsTableProps = {
  reviews: ReviewListItem[];
};

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

export function ReviewsTable({ reviews }: ReviewsTableProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return reviews.filter((review) => {
      const matchesFilter = filter === "all" || review.status === filter;
      const matchesQuery = review.projectName
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [reviews, filter, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Reviews
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse and compare previous AI code reviews
          </p>
        </div>
        <Button variant="primary">
          <Plus className="size-4" aria-hidden />
          New Review
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status filters">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                filter === item.key
                  ? "bg-blue-600 text-white"
                  : "border border-slate-800 bg-zinc-900 text-slate-400 hover:text-slate-200",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <Input
            aria-label="Search reviews by project name"
            placeholder="Search projects..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-800 md:block">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Coverage</th>
              <th className="px-4 py-3 font-medium">Tests</th>
              <th className="px-4 py-3 font-medium">Issues</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-zinc-950/40">
            {filtered.map((review) => (
              <tr key={review.id} className="hover:bg-zinc-900/50">
                <td className="px-4 py-3 font-medium text-slate-100">
                  <Link
                    href={`/reviews/${review.id}`}
                    className="hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {review.projectName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge>{review.provider}</Badge>
                </td>
                <td className="px-4 py-3">
                  <ReviewStatusBadge status={review.status} />
                </td>
                <td className="px-4 py-3 text-slate-300">{review.coverageLabel}</td>
                <td className="px-4 py-3 text-slate-300">{review.testsLabel}</td>
                <td className="px-4 py-3 text-slate-400">
                  H {review.highLabel} · M {review.mediumLabel} · L {review.lowLabel}
                </td>
                <td className="px-4 py-3 text-slate-300">{review.durationLabel}</td>
                <td className="px-4 py-3 text-slate-400">{review.dateLabel}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/reviews/${review.id}`}
                    aria-label={`Open ${review.projectName} review`}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-zinc-900 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((review) => (
          <Link
            key={review.id}
            href={`/reviews/${review.id}`}
            className="block rounded-xl border border-slate-800 bg-zinc-900/50 p-4 transition-colors hover:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-100">{review.projectName}</p>
                <p className="mt-1 text-xs text-slate-500">{review.dateLabel}</p>
              </div>
              <ReviewStatusBadge status={review.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{review.provider}</Badge>
              <Badge>{review.coverageLabel}</Badge>
              <Badge>{review.testsLabel}</Badge>
              <Badge>{review.durationLabel}</Badge>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-slate-500">
          No reviews match your filters.
        </p>
      ) : null}
    </div>
  );
}
