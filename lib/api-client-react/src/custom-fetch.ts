const getBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, ''); // trim trailing slash
  }
  throw new Error(
    'VITE_API_BASE_URL environment variable is required but was not provided. ' +
    'Please set this in your Netlify environment variables to your backend API URL (e.g., https://your-api.onrender.com/api).'
  );
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

  return response.json();
};
