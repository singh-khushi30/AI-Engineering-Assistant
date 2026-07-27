"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, title, onClose, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close dialog overlay"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-zinc-950 shadow-xl shadow-black/40",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-50 sm:text-base">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            className="size-9 px-0"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
