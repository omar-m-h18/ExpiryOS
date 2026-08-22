const getBaseUrl = () => {
  const explicit =
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE_URL : undefined;
  if (typeof explicit === "string" && explicit.length > 0) {
    return explicit.replace(/\/$/, "");
  }
  // Fall back to same-origin (relative) when not configured. In development
  // Vite proxies /api to the Express server; in production the deploy must set
  // VITE_API_BASE_URL to the Render backend URL.
  return "";
};

export const customFetch = async <T>(
  url: string,
  options: RequestInit
): Promise<T> => {
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // FIX #3: If the server returns an error, throw it so the UI can show it
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
};
