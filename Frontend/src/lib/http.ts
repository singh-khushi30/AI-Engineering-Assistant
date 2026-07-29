import type { ApiErrorBody, HttpMethod, RequestConfig } from "@/types/api";

const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly url: string;

  constructor(message: string, options: { status: number; body?: unknown; url: string }) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.body = options.body ?? null;
    this.url = options.url;
  }
}

function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = configured && configured.length > 0 ? configured : "http://localhost:8000";
  return base.replace(/\/+$/, "");
}

function joinUrl(base: string, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function extractErrorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const payload = body as ApiErrorBody;
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }
    if (Array.isArray(payload.detail) && payload.detail.length > 0) {
      const first = payload.detail[0];
      if (first?.msg) {
        return first.msg;
      }
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  }

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (status === 0) {
    return "Unable to reach the backend. Check that the API is running.";
  }

  return `Request failed with status ${status}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiError("Backend returned invalid JSON.", {
        status: response.status,
        body: text,
        url: response.url,
      });
    }
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function mergeAbortSignals(
  timeoutMs: number,
  external?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("Request timed out.", "TimeoutError"));
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort(external?.reason);
  };

  if (external) {
    if (external.aborted) {
      controller.abort(external.reason);
    } else {
      external.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      if (external) {
        external.removeEventListener("abort", onExternalAbort);
      }
    },
  };
}

export async function http<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    parseJson = true,
  } = config;

  const url = joinUrl(getApiBaseUrl(), path);
  const { signal: requestSignal, cleanup } = mergeAbortSignals(timeoutMs, signal);

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  let requestBody: string | undefined;
  if (body !== undefined && body !== null) {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      method: method as HttpMethod,
      headers: requestHeaders,
      body: requestBody,
      signal: requestSignal,
    });

    const parsed = parseJson ? await parseResponseBody(response) : null;

    if (!response.ok) {
      throw new ApiError(extractErrorMessage(response.status, parsed), {
        status: response.status,
        body: parsed,
        url,
      });
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError("Request timed out while contacting the backend.", {
        status: 0,
        url,
      });
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request was cancelled.", {
        status: 0,
        url,
      });
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to reach the backend. Check that the API is running.";

    throw new ApiError(message, {
      status: 0,
      url,
    });
  } finally {
    cleanup();
  }
}

export function getHttpBaseUrl(): string {
  return getApiBaseUrl();
}
