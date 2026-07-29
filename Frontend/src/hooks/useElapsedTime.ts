"use client";

import { useEffect, useState } from "react";

/**
 * Elapsed seconds since `startedAt` (ISO) or since mount if omitted.
 * Stops updating when `active` is false.
 */
export function useElapsedTime(
  startedAt?: string | null,
  options?: { active?: boolean },
): number {
  const active = options?.active ?? true;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }

    const startMs = startedAt ? new Date(startedAt).getTime() : Date.now();
    const safeStart = Number.isNaN(startMs) ? Date.now() : startMs;

    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - safeStart) / 1000)));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, active]);

  return elapsed;
}
