/**
 * Tally form integration helper.
 * Form: ExpiryOS Early Access & Waitlist
 * URL: https://tally.so/r/lbPjoV
 */

export const TALLY_FORM_ID = "lbPjoV";
export const TALLY_URL = `https://tally.so/r/${TALLY_FORM_ID}`;

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

/**
 * Open the Tally popup modal for early access / waitlist.
 * If the embed script hasn't loaded or is blocked, falls back gracefully to opening in a new tab.
 */
export function openTallyWaitlist(): void {
  if (typeof window !== "undefined" && window.Tally) {
    window.Tally.openPopup(TALLY_FORM_ID, {
      layout: "modal",
      width: 540,
      emoji: {
        text: "👋",
        animation: "wave",
      },
    });
  } else if (typeof window !== "undefined") {
    window.open(TALLY_URL, "_blank", "noopener,noreferrer");
  }
}

