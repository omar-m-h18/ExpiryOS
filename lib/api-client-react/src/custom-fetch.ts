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

const REQUEST_TIMEOUT_MS = 15_000;

export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const baseUrl = getBaseUrl();

  // Abort any request that hangs, so the UI never waits forever on a dead
  // backend. Combines with any caller-supplied signal.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const signal =
    typeof options.signal === "undefined"
      ? controller.signal
      : AbortSignal.any([options.signal, controller.signal]);

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
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};
