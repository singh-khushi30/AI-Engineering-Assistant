"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { SeverityLevel } from "@/types/dashboard";

type SeverityFilter = "all" | SeverityLevel;

type FindingsFiltersProps = {
  active: SeverityFilter;
  onChange: (value: SeverityFilter) => void;
  query: string;
  onQueryChange: (value: string) => void;
};

const filters: Array<{ key: SeverityFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
  { key: "info", label: "Info" },
];

export function FindingsFilters({
  active,
  onChange,
  query,
  onQueryChange,
}: FindingsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Severity filters">
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            role="tab"
            aria-selected={active === filter.key}
            onClick={() => onChange(filter.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              active === filter.key
                ? "bg-blue-600 text-white"
                : "border border-slate-800 bg-zinc-900 text-slate-400 hover:text-slate-200",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="relative w-full lg:max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <Input
          aria-label="Search findings"
          placeholder="Search title, file, or category..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
