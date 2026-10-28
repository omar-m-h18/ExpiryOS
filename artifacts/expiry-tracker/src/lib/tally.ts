/**
 * Tally form integration helper.
 * Form: ExpiryOS Early Access & Waitlist
 * URL: https://tally.so/r/lbPjoV
 *
 * ## Why the embed script is loaded on demand
 *
 * The Tally embed used to be a static `<script async>` in `index.html`, which
 * meant every visitor's IP address and User-Agent were sent to Tally (a US
 * processor) on page load, before any interaction and with no consent. That is
 * the same GDPR problem as loading fonts from Google's CDN.
 *
 * The script is now injected the first time someone actually clicks a waitlist
 * CTA (`loadTallyScript`). Until then, no request leaves for Tally. The promise
 * is memoised, so only one `<script>` is ever added.
 *
 * ## Compliance follow-ups that are NOT in this file
 *
 * - The Tally form itself should carry a consent statement and a privacy-policy
 *   link, plus a checkbox if consent is to be recorded. That is configured in
 *   the Tally dashboard, not here.
 * - The disclosure line rendered under the landing CTA states the purpose and
 *   the opt-out expectation. Any new CTA should keep that disclosure visible
 *   somewhere on the path that reaches it.
 */

export const TALLY_FORM_ID = "lbPjoV";
export const TALLY_URL = `https://tally.so/r/${TALLY_FORM_ID}`;
export const TALLY_EMBED_URL = "https://tally.so/widgets/embed.js";

/** How long to wait for the embed before falling back to a new tab. */
const LOAD_TIMEOUT_MS = 4000;

declare global {
  interface Window {
    Tally?: {
      openPopup: (
        formId: string,
        options?: {
          layout?: "modal" | "default";
          width?: number;
          autoClose?: number;
          emoji?: {
            text?: string;
            animation?: "wave" | "bounce" | "heart-beat" | "spin";
          };
          onOpen?: () => void;
          onClose?: () => void;
          onSubmit?: (payload: unknown) => void;
        },
      ) => void;
      closePopup: (formId: string) => void;
      loadEmbeds: () => void;
    };
  }
}

/** Memoised loader — resolves true once `window.Tally` is usable. */
let scriptPromise: Promise<boolean> | null = null;

/**
 * Inject the Tally embed script, once.
 *
 * Never rejects: a blocked or slow CDN resolves `false` so callers can fall
 * back instead of leaving the click handler hanging.
 */
export function loadTallyScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Tally) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const settle = () => resolve(Boolean(window.Tally));

    const script = document.createElement("script");
    script.src = TALLY_EMBED_URL;
    script.async = true;
    script.onload = settle;
    script.onerror = () => resolve(false);

    document.head.appendChild(script);

    // A blocked request can fire neither onload nor onerror in some privacy
    // extensions, so cap the wait and fall back to a plain link.
    window.setTimeout(settle, LOAD_TIMEOUT_MS);
  });

  return scriptPromise;
}

/**
 * Open the Tally popup modal for early access / waitlist.
 *
 * Loads the embed on first use, then opens the modal. If the embed cannot be
 * loaded (blocked, offline, timeout), opens the hosted form in a new tab so the
 * CTA still works.
 *
 * The second click always opens synchronously-enough to keep user activation:
 * the loader is already resolved, so `.then` runs in a microtask rather than
 * after a network round-trip, which is what popup blockers key on.
 */
export function openTallyWaitlist(): void {
  if (typeof window === "undefined") return;

  void loadTallyScript().then((ready) => {
    if (ready && window.Tally) {
      window.Tally.openPopup(TALLY_FORM_ID, {
        layout: "modal",
        width: 540,
        emoji: {
          text: "👋",
          animation: "wave",
        },
      });
      return;
    }

    window.open(TALLY_URL, "_blank", "noopener,noreferrer");
  });
}
