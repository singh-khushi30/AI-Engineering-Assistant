"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getDefaultProviderServerSnapshot,
  readDefaultProvider,
  subscribeDefaultProvider,
  writeDefaultProvider,
} from "@/lib/default-provider";
import type { ReviewProvider } from "@/types/api";

/**
 * Hydration-safe default provider for future reviews.
 * Server + first client render use Gemini; then localStorage is applied.
 */
export function useDefaultProvider(): {
  provider: ReviewProvider;
  setProvider: (provider: ReviewProvider) => void;
} {
  const provider = useSyncExternalStore(
    subscribeDefaultProvider,
    readDefaultProvider,
    getDefaultProviderServerSnapshot,
  );

  const setProvider = useCallback((next: ReviewProvider) => {
    writeDefaultProvider(next);
  }, []);

  return { provider, setProvider };
}
