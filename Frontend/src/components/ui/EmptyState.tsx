import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { surfaces } from "@/lib/design";
import { cn } from "@/lib/utils";

type EmptyAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
};

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: EmptyAction;
  secondaryAction?: EmptyAction;
  children?: ReactNode;
  className?: string;
  tone?: "neutral" | "success" | "warning";
};

function ActionButton({ action }: { action: EmptyAction }) {
  const variant = action.variant ?? "secondary";
  const button = (
    <Button
      variant={variant}
      onClick={action.onClick}
      type={action.href ? "button" : "button"}
    >
      {action.label}
    </Button>
  );

  if (action.href) {
    return <Link href={action.href}>{button}</Link>;
  }
  return button;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
  className,
  tone = "neutral",
}: EmptyStateProps) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "warning"
        ? "border-amber-900/40 bg-amber-950/20"
        : "border-slate-800/80 bg-zinc-900/40";

  const iconTone =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-300"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-200"
        : "bg-slate-800 text-slate-300";

  return (
    <div
      className={cn(
        "rounded-xl border px-6 py-12 text-center sm:px-8 sm:py-14",
        toneClasses,
        className,
      )}
      role="status"
    >
      <div
        className={cn(
          "mx-auto flex size-12 items-center justify-center rounded-full",
          iconTone,
        )}
      >
        <Icon className="size-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-50 sm:text-xl">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
        {description}
      </p>
      {children}
      {primaryAction || secondaryAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction ? (
            <ActionButton
              action={{ ...primaryAction, variant: primaryAction.variant ?? "primary" }}
            />
          ) : null}
          {secondaryAction ? <ActionButton action={secondaryAction} /> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Compact empty used inside tables / filtered lists. */
export function InlineEmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(surfaces.panel, "py-10 text-center", className)}
      role="status"
    >
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
