import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-slate-300">{label}</span>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "min-h-10 w-full rounded-lg border border-slate-800 bg-zinc-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    </label>
  );
});
