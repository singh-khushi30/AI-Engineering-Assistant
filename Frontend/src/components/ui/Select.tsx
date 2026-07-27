import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: SelectOption[];
};

export function Select({ label, id, options, className, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-slate-300">{label}</span>
      ) : null}
      <select
        id={selectId}
        className={cn(
          "w-full rounded-lg border border-slate-800 bg-zinc-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
