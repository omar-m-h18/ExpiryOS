/**
 * Thin client helpers for the anonymous-demo endpoints.
 *
 * These call the two new backend routes directly (rather than generated hooks,
 * which don't exist yet for `/session` and `/leads` until codegen runs).
 *
 * IMPORTANT: In production the frontend (Netlify) and backend (Render) are on
 * different origins, so relative `/api/...` paths would hit Netlify and fail.
 * We therefore resolve the API base the same way the generated client does —
 * from `VITE_API_BASE_URL` when set (dev proxy / prod), else relative.
 */

function getApiBaseUrl(): string {
  const explicit =
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE_URL : undefined;
  return typeof explicit === "string" && explicit.length > 0
    ? explicit.replace(/\/$/, "")
    : "";
}

/** Reset the current demo room and load a fresh batch of sample data. */
export async function resetDemoSession(): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/session/reset`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to reset demo session");
  }
}

/** Join the early-bird waitlist with an email. */
export async function insertLead(email: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to join the waitlist" }));
    throw new Error(err.error || "Failed to join the waitlist");
  }
}
