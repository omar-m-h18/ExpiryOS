const getBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  throw new Error("VITE_API_BASE_URL environment variable is not set");
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
