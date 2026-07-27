export type ProviderOption = "Gemini" | "Groq" | "OpenRouter" | "Ollama";

export type SettingsState = {
  defaultProvider: ProviderOption;
  fallbackGroq: boolean;
  fallbackOpenRouter: boolean;
  fallbackOllama: boolean;
  coverageTarget: number;
  reviewTimeoutSeconds: number;
  includeGit: boolean;
  includeBandit: boolean;
  includeRuff: boolean;
  includePytest: boolean;
  includeCoverage: boolean;
  theme: "Dark";
  compactMode: boolean;
};

export const defaultSettings: SettingsState = {
  defaultProvider: "Gemini",
  fallbackGroq: true,
  fallbackOpenRouter: true,
  fallbackOllama: false,
  coverageTarget: 80,
  reviewTimeoutSeconds: 300,
  includeGit: true,
  includeBandit: true,
  includeRuff: true,
  includePytest: true,
  includeCoverage: true,
  theme: "Dark",
  compactMode: false,
};
