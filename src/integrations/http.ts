/**
 * Minimal HTTP client for provider APIs: timeouts, bounded retries with
 * exponential backoff (honouring Retry-After) for 429/5xx, and errors that carry
 * a safe classification only. Response bodies and tokens are never put into
 * error messages, because those messages can reach logs and the UI.
 */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ProviderErrorKind = "unauthorized" | "forbidden" | "rate_limited" | "server" | "bad_request" | "network" | "bad_response";

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    readonly status: number | null,
    readonly provider: string,
  ) {
    super(`${provider} request failed (${kind}${status ? ` ${status}` : ""})`);
    this.name = "ProviderError";
  }
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export type RequestOptions = {
  provider: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function retryDelayMs(response: Response | null, attempt: number): number {
  const header = response?.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 10_000);
  }
  return Math.min(500 * 2 ** attempt, 8_000);
}

function classify(status: number): ProviderErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "bad_request";
}

export async function requestJson(url: string, init: RequestInit, options: RequestOptions): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const retries = options.retries ?? 3;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 0; ; attempt += 1) {
    let response: Response | null = null;
    try {
      response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(options.timeoutMs ?? 8_000) });
    } catch {
      if (attempt >= retries) throw new ProviderError("network", null, options.provider);
      await sleep(retryDelayMs(null, attempt));
      continue;
    }
    if (response.ok) {
      try {
        return await response.json();
      } catch {
        throw new ProviderError("bad_response", response.status, options.provider);
      }
    }
    if (RETRYABLE.has(response.status) && attempt < retries) {
      await sleep(retryDelayMs(response, attempt));
      continue;
    }
    throw new ProviderError(classify(response.status), response.status, options.provider);
  }
}

export function formBody(values: Record<string, string>): string {
  return new URLSearchParams(values).toString();
}
