"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
};

type ReviewTabsProps = {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  children: ReactNode;
  className?: string;
};

export function ReviewTabs({
  tabs,
  activeId,
  onChange,
  children,
  className,
}: ReviewTabsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div
        role="tablist"
        aria-label="Review sections"
        className="flex flex-wrap gap-2 border-b border-slate-800 pb-3"
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                selected
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-zinc-900 hover:text-slate-200",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`panel-${activeId}`}
        aria-labelledby={`tab-${activeId}`}
      >
        {children}
      </div>
    </div>
  );
}
