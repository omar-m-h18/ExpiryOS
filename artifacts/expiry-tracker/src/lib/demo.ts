/**
 * Thin client helpers for the anonymous-demo endpoints.
 *
 * `insertLead` posts to the early-bird waitlist from the landing page. The
 * legacy "reset sample data" endpoint is intentionally not wired up anymore —
 * sample data is auto-seeded on every fresh room by the backend.
 *
 * IMPORTANT: In production the frontend (Netlify) and backend (Render) are on
 * different origins, so relative `/api/...` paths would hit Netlify and fail.
 * We therefore resolve the API base the same way the generated client does —
 * from `VITE_API_BASE_URL` when set; otherwise same-origin (handled by the
 * Netlify `_redirects` proxy to Render).
 */

function getApiBaseUrl(): string {
  const explicit =
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE_URL : undefined;
  return typeof explicit === "string" && explicit.length > 0
    ? explicit.replace(/\/$/, "")
    : "";
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
