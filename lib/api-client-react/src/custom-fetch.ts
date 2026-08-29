export type AuthTokenGetter = () => string | undefined | Promise<string | undefined>;

let configuredBaseUrl: string | undefined;
let authTokenGetter: AuthTokenGetter | undefined;

export const setBaseUrl = (baseUrl: string): void => {
  configuredBaseUrl = baseUrl.replace(/\/$/, "");
};

export const setAuthTokenGetter = (getter: AuthTokenGetter): void => {
  authTokenGetter = getter;
};

const getBaseUrl = () => {
  if (configuredBaseUrl !== undefined) {
    return configuredBaseUrl;
  }

  // In production, Netlify's `_redirects` proxies /api/* to the Render backend,
  // so all calls stay same-origin — no CORS, no env var required.
  // When VITE_API_BASE_URL is set (rare), honor it explicitly.
  const explicit =
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE_URL : undefined;
  return typeof explicit === "string" && explicit.length > 0
    ? explicit.replace(/\/$/, "")
    : "";
};

const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Parse a successful response body, handling empty responses (204 No Content
 * and friends). Previously `response.json()` was called unconditionally, which
 * threw `SyntaxError: Unexpected end of JSON input` on DELETE's empty 204 —
 * the root cause of the "delete item button doesn't work" bug.
 *
 * Pure function so it can be unit-tested without a real fetch.
 */
export const parseResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 204 || response.status === 205) {
    return undefined as unknown as T;
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as unknown as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response body (status ${response.status})`);
  }
};

const performRequest = async <T>(
  url: string,
  options: RequestInit,
  baseUrl: string,
): Promise<T> => {
  // Abort any request that hangs, so the UI never waits forever on a dead
  // backend. Combines with any caller-supplied signal. 60s instead of 15s:
  // Render's free instance sleeps when idle and needs time to cold-boot.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Only set Content-Type when there's a body (POST/PATCH). Avoids noise on
  // GET/HEAD/DELETE and lets any explicit header win.
  const headers = new Headers(options.headers);
  if (options.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authTokenGetter && !headers.has("Authorization")) {
    const token = await authTokenGetter();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  try {
    const signal =
      typeof options.signal === "undefined"
        ? controller.signal
        : AbortSignal.any([options.signal, controller.signal]);

    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers,
      signal,
      // The API identifies anonymous demo visitors with an httpOnly cookie.
      // Include it on every request so created items remain in the same room
      // after the form navigates back to the items list. This is also required
      // for the separate frontend/API origins used in production.
      credentials: options.credentials ?? "include",
    });

    // If the server returns an error, throw it so the UI can show it.
    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return await parseResponse<T>(response);
  } finally {
    clearTimeout(timer);
  }
};

export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const baseUrl = getBaseUrl();

  try {
    return await performRequest<T>(url, options, baseUrl);
  } catch (err) {
    // Retry exactly once on a network-level failure (Render cold-boot dropping
    // the first request, transient DNS/TLS hiccup, or our own timeout). Do NOT
    // retry when the server answered with an HTTP error (4xx/5xx) or when a
    // caller-supplied signal aborted the request — those outcomes are final.
    const name = (err as { name?: string } | null)?.name;
    const abortingCaller = options.signal?.aborted === true;
    const isNetwork = err instanceof TypeError || (name === "AbortError" && !abortingCaller);

    if (!isNetwork) {
      throw err;
    }

    return await performRequest<T>(url, options, baseUrl);
  }
};
