import {
  DEFAULT_PROVIDER_STORAGE_KEY,
  DEFAULT_REVIEW_PROVIDER,
  parseReviewProvider,
} from "@/constants/providers";
import type { ReviewProvider } from "@/types/api";

const CHANGE_EVENT = "aea-default-provider-change";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readDefaultProvider(): ReviewProvider {
  if (!canUseLocalStorage()) {
    return DEFAULT_REVIEW_PROVIDER;
  }
  try {
    return parseReviewProvider(window.localStorage.getItem(DEFAULT_PROVIDER_STORAGE_KEY));
  } catch {
    return DEFAULT_REVIEW_PROVIDER;
  }
}

export function writeDefaultProvider(provider: ReviewProvider): void {
  if (!canUseLocalStorage()) {
    return;
  }
  const next = parseReviewProvider(provider);
  try {
    window.localStorage.setItem(DEFAULT_PROVIDER_STORAGE_KEY, next);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeDefaultProvider(onStoreChange: () => void): () => void {
  if (!canUseLocalStorage()) {
    return () => {};
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === DEFAULT_PROVIDER_STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

export function getDefaultProviderServerSnapshot(): ReviewProvider {
  return DEFAULT_REVIEW_PROVIDER;
}
