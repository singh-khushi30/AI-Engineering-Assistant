import { cn } from "@/lib/utils";

type BadgeProps = {
  children: string;
  className?: string;
};

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-slate-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
