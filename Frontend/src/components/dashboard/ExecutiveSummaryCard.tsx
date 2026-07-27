"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ExecutiveSummary } from "@/types/dashboard";

type ExecutiveSummaryCardProps = {
  data: ExecutiveSummary;
  className?: string;
};

export function ExecutiveSummaryCard({
  data,
  className,
}: ExecutiveSummaryCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = `${data.body}\n\n${data.highlights.map((item) => `• ${item}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl border border-slate-800 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 sm:p-6",
        className,
      )}
      aria-labelledby="executive-summary-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="executive-summary-heading"
          className="text-base font-semibold text-slate-50"
        >
          {data.title}
        </h2>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-800 bg-zinc-950 text-slate-400 transition-colors hover:border-slate-700 hover:bg-zinc-900 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={copied ? "Copied executive summary" : "Copy executive summary"}
        >
          {copied ? (
            <Check className="size-4 text-emerald-400" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
        </button>
      </div>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-300">
        {data.body.split("\n\n").map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>

      <ul className="mt-5 space-y-2 border-t border-slate-800 pt-4">
        {data.highlights.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-slate-300">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
