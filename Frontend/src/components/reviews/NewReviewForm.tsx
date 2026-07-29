"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import { Toggle } from "@/components/settings/Toggle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useHealth } from "@/hooks/useHealth";
import { useStartReview } from "@/hooks/useStartReview";
import { loadReviewFormDraft, saveReviewFormDraft } from "@/lib/session-reviews";
import type { ReviewProvider, StartReviewRequest } from "@/types/api";

const PROVIDER_OPTIONS: Array<{ value: ReviewProvider; label: string }> = [
  { value: "gemini", label: "Gemini" },
  { value: "groq", label: "Groq" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "ollama", label: "Ollama" },
];

const DEFAULT_FORM: StartReviewRequest = {
  project_path: "",
  provider: "gemini",
  include_git: true,
  include_bandit: true,
  include_ruff: true,
  include_pytest: true,
  include_coverage: true,
  coverage_target: 80,
  timeout_seconds: 900,
  enable_fallback: true,
};

type FieldErrors = {
  project_path?: string;
  provider?: string;
  coverage_target?: string;
  timeout_seconds?: string;
};

function subscribeDraft() {
  return () => {};
}

function readDraftForm(): StartReviewRequest {
  const draft = loadReviewFormDraft();
  return draft ? { ...DEFAULT_FORM, ...draft } : DEFAULT_FORM;
}

export function NewReviewForm() {
  const router = useRouter();
  const formId = useId();
  const pathRef = useRef<HTMLInputElement>(null);
  const { isOnline, isLoading: healthLoading, retry: retryHealth } = useHealth({
    pollIntervalMs: 30_000,
  });
  const { startReview, isSubmitting, error, clearError } = useStartReview();

  const storedForm = useSyncExternalStore(
    subscribeDraft,
    readDraftForm,
    () => DEFAULT_FORM,
  );
  const [formOverride, setFormOverride] = useState<StartReviewRequest | null>(null);
  const form = formOverride ?? storedForm;
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const offline = !isOnline && !healthLoading;

  const pathErrorId = `${formId}-path-error`;
  const formErrorId = `${formId}-form-error`;

  const canSubmit = useMemo(
    () => !isSubmitting && !offline,
    [isSubmitting, offline],
  );

  function updateField<K extends keyof StartReviewRequest>(
    key: K,
    value: StartReviewRequest[K],
  ) {
    clearError();
    setFormOverride((previous) => ({ ...(previous ?? storedForm), [key]: value }));
    setFieldErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  function validate(values: StartReviewRequest): FieldErrors {
    const next: FieldErrors = {};
    if (!values.project_path.trim()) {
      next.project_path = "Repository path is required.";
    }
    if (!values.provider) {
      next.provider = "Provider is required.";
    }
    const coverage = values.coverage_target;
    if (coverage !== null && coverage !== undefined) {
      if (!Number.isFinite(coverage) || coverage < 0 || coverage > 100) {
        next.coverage_target = "Coverage target must be between 0 and 100.";
      }
    }
    const timeout = values.timeout_seconds;
    if (timeout !== null && timeout !== undefined) {
      if (!Number.isFinite(timeout) || timeout < 30 || timeout > 7200) {
        next.timeout_seconds = "Timeout must be between 30 and 7200 seconds.";
      }
    }
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const payload: StartReviewRequest = {
      ...form,
      project_path: form.project_path.trim(),
    };
    const errors = validate(payload);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      pathRef.current?.focus();
      return;
    }

    saveReviewFormDraft(payload);
    const response = await startReview(payload);
    if (!response) {
      return;
    }

    router.push(`/reviews/${response.id}/running`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          New Code Review
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Run a multi-agent review on a local repository
        </p>
      </div>

      {offline ? (
        <div
          className="flex flex-col gap-3 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Backend is currently unavailable. Start the FastAPI server and try
              again.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={retryHealth}>
            <RefreshCw className="size-3.5" aria-hidden />
            Retry Connection
          </Button>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-xl border border-slate-800 bg-zinc-900/40 p-5 sm:p-6"
        noValidate
        aria-describedby={error ? formErrorId : undefined}
      >
        <div className="space-y-1.5">
          <Input
            ref={pathRef}
            id={`${formId}-path`}
            name="project_path"
            label="Repository Path"
            placeholder="/Users/your-name/projects/my-project"
            value={form.project_path}
            onChange={(event) => updateField("project_path", event.target.value)}
            required
            disabled={isSubmitting || offline}
            aria-invalid={Boolean(fieldErrors.project_path)}
            aria-describedby={
              fieldErrors.project_path
                ? pathErrorId
                : `${formId}-path-help`
            }
          />
          <p id={`${formId}-path-help`} className="text-xs text-slate-500">
            Enter the absolute path of a repository accessible to the backend
            server.
          </p>
          {fieldErrors.project_path ? (
            <p id={pathErrorId} className="text-xs text-red-400" role="alert">
              {fieldErrors.project_path}
            </p>
          ) : null}
        </div>

        <Select
          id={`${formId}-provider`}
          name="provider"
          label="Provider"
          options={PROVIDER_OPTIONS}
          value={form.provider}
          disabled={isSubmitting || offline}
          onChange={(event) =>
            updateField("provider", event.target.value as ReviewProvider)
          }
          aria-invalid={Boolean(fieldErrors.provider)}
        />
        {fieldErrors.provider ? (
          <p className="text-xs text-red-400" role="alert">
            {fieldErrors.provider}
          </p>
        ) : null}

        <fieldset className="space-y-3" disabled={isSubmitting || offline}>
          <legend className="text-sm font-medium text-slate-300">
            Review Tools
          </legend>
          <div className="space-y-3 rounded-lg border border-slate-800 bg-zinc-950/50 p-4">
            <Toggle
              label="Git analysis"
              checked={form.include_git}
              onChange={(checked) => updateField("include_git", checked)}
            />
            <Toggle
              label="Bandit security analysis"
              checked={form.include_bandit}
              onChange={(checked) => updateField("include_bandit", checked)}
            />
            <Toggle
              label="Ruff style analysis"
              checked={form.include_ruff}
              onChange={(checked) => updateField("include_ruff", checked)}
            />
            <Toggle
              label="Pytest"
              checked={form.include_pytest}
              onChange={(checked) => updateField("include_pytest", checked)}
            />
            <Toggle
              label="Coverage"
              checked={form.include_coverage}
              onChange={(checked) => updateField("include_coverage", checked)}
            />
          </div>
        </fieldset>

        <div>
          <button
            type="button"
            className="text-sm font-medium text-blue-400 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() => setShowAdvanced((value) => !value)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
          </button>

          {showAdvanced ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Input
                  id={`${formId}-timeout`}
                  name="timeout_seconds"
                  label="Timeout (seconds)"
                  type="number"
                  min={30}
                  max={7200}
                  value={form.timeout_seconds ?? 900}
                  disabled={isSubmitting || offline}
                  onChange={(event) =>
                    updateField("timeout_seconds", Number(event.target.value))
                  }
                />
                {fieldErrors.timeout_seconds ? (
                  <p className="text-xs text-red-400" role="alert">
                    {fieldErrors.timeout_seconds}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Input
                  id={`${formId}-coverage`}
                  name="coverage_target"
                  label="Coverage target (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={form.coverage_target ?? 80}
                  disabled={isSubmitting || offline}
                  onChange={(event) =>
                    updateField("coverage_target", Number(event.target.value))
                  }
                />
                {fieldErrors.coverage_target ? (
                  <p className="text-xs text-red-400" role="alert">
                    {fieldErrors.coverage_target}
                  </p>
                ) : null}
              </div>
              <div className="sm:col-span-2 rounded-lg border border-slate-800 bg-zinc-950/50 p-4">
                <Toggle
                  label="Enable provider fallback"
                  description="Allow the backend to try fallback providers if the primary fails."
                  checked={Boolean(form.enable_fallback)}
                  onChange={(checked) => updateField("enable_fallback", checked)}
                />
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <p id={formErrorId} className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/reviews"
            className="inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-zinc-900 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Back to Reviews
          </Link>
          <Button
            type="submit"
            variant="primary"
            disabled={!canSubmit}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Starting…
              </>
            ) : (
              "Start Review"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
