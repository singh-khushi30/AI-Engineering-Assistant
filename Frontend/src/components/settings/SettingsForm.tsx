"use client";

import { useState } from "react";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { Toggle } from "@/components/settings/Toggle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  defaultSettings,
  type ProviderOption,
  type SettingsState,
} from "@/types/settings";

const providerOptions: Array<{ value: ProviderOption; label: ProviderOption }> = [
  { value: "Gemini", label: "Gemini" },
  { value: "Groq", label: "Groq" },
  { value: "OpenRouter", label: "OpenRouter" },
  { value: "Ollama", label: "Ollama" },
];

export function SettingsForm() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [message, setMessage] = useState<string | null>(null);

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function handleSave() {
    setMessage("Preferences saved locally for this session.");
  }

  function handleReset() {
    setSettings(defaultSettings);
    setMessage("Defaults restored.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Providers, preferences, and defaults
        </p>
      </div>

      {message ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
        >
          {message}
        </p>
      ) : null}

      <SettingsSection
        title="Provider Preferences"
        description="Choose the default LLM provider for review runs."
      >
        <Select
          label="Default provider"
          value={settings.defaultProvider}
          options={providerOptions}
          onChange={(event) =>
            update("defaultProvider", event.target.value as ProviderOption)
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Fallback Providers"
        description="Try these providers if the primary provider fails."
      >
        <Toggle
          label="Groq"
          checked={settings.fallbackGroq}
          onChange={(checked) => update("fallbackGroq", checked)}
        />
        <Toggle
          label="OpenRouter"
          checked={settings.fallbackOpenRouter}
          onChange={(checked) => update("fallbackOpenRouter", checked)}
        />
        <Toggle
          label="Ollama"
          checked={settings.fallbackOllama}
          onChange={(checked) => update("fallbackOllama", checked)}
        />
      </SettingsSection>

      <SettingsSection title="Review Preferences">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Coverage target (%)"
            type="number"
            min={0}
            max={100}
            value={settings.coverageTarget}
            onChange={(event) =>
              update("coverageTarget", Number(event.target.value) || 0)
            }
          />
          <Input
            label="Review timeout (seconds)"
            type="number"
            min={30}
            value={settings.reviewTimeoutSeconds}
            onChange={(event) =>
              update("reviewTimeoutSeconds", Number(event.target.value) || 30)
            }
          />
        </div>
        <Toggle
          label="Include Git analysis"
          checked={settings.includeGit}
          onChange={(checked) => update("includeGit", checked)}
        />
        <Toggle
          label="Include Bandit"
          checked={settings.includeBandit}
          onChange={(checked) => update("includeBandit", checked)}
        />
        <Toggle
          label="Include Ruff"
          checked={settings.includeRuff}
          onChange={(checked) => update("includeRuff", checked)}
        />
        <Toggle
          label="Include Pytest"
          checked={settings.includePytest}
          onChange={(checked) => update("includePytest", checked)}
        />
        <Toggle
          label="Include Coverage"
          checked={settings.includeCoverage}
          onChange={(checked) => update("includeCoverage", checked)}
        />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <Input label="Theme" value={settings.theme} readOnly />
        <Toggle
          label="Compact mode"
          description="Reduce card padding for denser layouts."
          checked={settings.compactMode}
          onChange={(checked) => update("compactMode", checked)}
        />
      </SettingsSection>

      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={handleSave}>
          Save Preferences
        </Button>
        <Button variant="secondary" onClick={handleReset}>
          Reset Defaults
        </Button>
      </div>
    </div>
  );
}
