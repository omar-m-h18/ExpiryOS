/**
 * Thin client helpers for the anonymous-demo endpoints.
 *
 * These call the two new backend routes directly (rather than generated hooks,
 * which don't exist yet for `/session` and `/leads` until codegen runs). They
 * reuse the same `credentials: include` and JSON conventions as the rest of
 * the app so the session cookie is always sent.
 */

/** Reset the current demo room and load a fresh batch of sample data. */
export async function resetDemoSession(): Promise<void> {
  const res = await fetch("/api/session/reset", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to reset demo session");
  }
}

/** Join the early-bird waitlist with an email. */
export async function insertLead(email: string): Promise<void> {
  const res = await fetch("/api/leads", {
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
