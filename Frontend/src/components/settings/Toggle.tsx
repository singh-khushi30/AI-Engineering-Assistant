"use client";

import { cn } from "@/lib/utils";

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
};

export function Toggle({ label, checked, onChange, description }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description ? (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          checked ? "bg-blue-600" : "bg-slate-700",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
