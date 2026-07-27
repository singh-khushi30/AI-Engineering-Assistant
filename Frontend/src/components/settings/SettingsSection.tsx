import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-800 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 sm:p-6",
        className,
      )}
    >
      <h2 className="text-base font-semibold text-slate-50">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
