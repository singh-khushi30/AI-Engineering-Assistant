import type { ButtonHTMLAttributes, ReactNode } from "react";

import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-950/40 active:bg-blue-600",
  secondary:
    "border border-slate-800 bg-zinc-900 text-slate-200 hover:border-slate-700 hover:bg-zinc-800 active:bg-zinc-900",
  ghost: "text-slate-300 hover:bg-zinc-900 hover:text-slate-100 active:bg-zinc-950",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-10 px-3.5 py-2 text-sm",
  lg: "min-h-11 px-4 py-2.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
