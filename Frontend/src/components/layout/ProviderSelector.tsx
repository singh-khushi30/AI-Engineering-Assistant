"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";

import { REVIEW_PROVIDERS, getProviderLabel } from "@/constants/providers";
import { useDefaultProvider } from "@/hooks/useDefaultProvider";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { ReviewProvider } from "@/types/api";

const ENABLED_PROVIDERS = REVIEW_PROVIDERS.filter((item) => item.enabled);

type ProviderSelectorProps = {
  className?: string;
};

export function ProviderSelector({ className }: ProviderSelectorProps) {
  const pathname = usePathname();
  const { provider, setProvider } = useDefaultProvider();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPath, setMenuPath] = useState(pathname);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const options = ENABLED_PROVIDERS;

  // Close the menu when the route changes (render-phase sync — no effect setState).
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    if (open) {
      setOpen(false);
    }
  }

  const closeMenu = useCallback((opts?: { restoreFocus?: boolean }) => {
    setOpen(false);
    if (opts?.restoreFocus !== false) {
      queueMicrotask(() => triggerRef.current?.focus());
    }
  }, []);

  const openMenu = useCallback(() => {
    const selectedIndex = Math.max(
      0,
      options.findIndex((item) => item.value === provider),
    );
    setActiveIndex(selectedIndex);
    setOpen(true);
  }, [options, provider]);

  const selectProvider = useCallback(
    (next: ReviewProvider) => {
      setProvider(next);
      closeMenu();
    },
    [closeMenu, setProvider],
  );

  // Outside click + Escape
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        closeMenu({ restoreFocus: false });
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeMenu]);

  // Focus active menuitem when opened / index changes
  useEffect(() => {
    if (!open) return;
    const item = rootRef.current?.querySelector<HTMLElement>(
      `[data-provider-index="${activeIndex}"]`,
    );
    item?.focus();
  }, [open, activeIndex]);

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openMenu();
      }
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu();
    }
  }

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + options.length) % options.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) {
        selectProvider(option.value);
      }
      return;
    }
    if (event.key === "Tab") {
      closeMenu({ restoreFocus: false });
    }
  }

  const label = getProviderLabel(provider);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 shadow-sm transition-colors duration-150 hover:border-slate-700 hover:bg-zinc-800 sm:px-3 sm:text-sm",
          focusRing,
          open && "border-slate-700 bg-zinc-800",
        )}
        aria-label={`Default provider: ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="max-w-[5.5rem] truncate sm:max-w-none">{label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-slate-400 transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Default provider"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-slate-800 bg-zinc-950 p-1 shadow-lg shadow-black/40"
        >
          <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Default for new reviews
          </p>
          {options.map((option, index) => {
            const selected = option.value === provider;
            const active = index === activeIndex;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                data-provider-index={index}
                tabIndex={active ? 0 : -1}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-150",
                  focusRing,
                  active || selected
                    ? "bg-zinc-900 text-slate-50"
                    : "text-slate-300 hover:bg-zinc-900/80 hover:text-slate-50",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectProvider(option.value)}
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  {selected ? (
                    <Check className="size-3.5 text-blue-400" aria-hidden />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
