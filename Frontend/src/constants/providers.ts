import type { ReviewProvider } from "@/types/api";

export type ProviderConfig = {
  value: ReviewProvider;
  label: string;
  description?: string;
  enabled: boolean;
};

/** Providers exposed in the UI for new reviews / default selection. */
export const REVIEW_PROVIDERS: ProviderConfig[] = [
  {
    value: "gemini",
    label: "Gemini",
    description: "Google Gemini via configured API key",
    enabled: true,
  },
  {
    value: "groq",
    label: "Groq",
    description: "Fast inference via Groq",
    enabled: true,
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    description: "Multi-model routing via OpenRouter",
    enabled: true,
  },
  {
    value: "ollama",
    label: "Ollama",
    description: "Local models via Ollama",
    enabled: true,
  },
];

export const DEFAULT_REVIEW_PROVIDER: ReviewProvider = "gemini";

export const DEFAULT_PROVIDER_STORAGE_KEY =
  "ai-engineering-assistant-default-provider";

const ENABLED_VALUES = new Set(
  REVIEW_PROVIDERS.filter((p) => p.enabled).map((p) => p.value),
);

export function isReviewProvider(value: unknown): value is ReviewProvider {
  return typeof value === "string" && ENABLED_VALUES.has(value as ReviewProvider);
}

export function parseReviewProvider(
  value: unknown,
  fallback: ReviewProvider = DEFAULT_REVIEW_PROVIDER,
): ReviewProvider {
  return isReviewProvider(value) ? value : fallback;
}

export function getProviderLabel(value: string): string {
  const key = value.trim().toLowerCase();
  const match = REVIEW_PROVIDERS.find((p) => p.value === key);
  return match?.label ?? value;
}

export function getProviderOptions(): Array<{ value: ReviewProvider; label: string }> {
  return REVIEW_PROVIDERS.filter((p) => p.enabled).map((p) => ({
    value: p.value,
    label: p.label,
  }));
}
