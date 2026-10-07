import { Info, AlertCircle, Sparkles } from "lucide-react";
import { useGetItemsSummary } from "@workspace/api-client-react";
import { TALLY_FORM_ID, openTallyWaitlist } from "@/lib/tally";

const DEMO_ITEM_LIMIT = 10;

/**
 * Slim, on-brand banner clarifying that this is a temporary demo session,
 * displaying the 10-item demo quota, and offering quick 1-click access to the Early Access list.
 */
export function DemoBanner() {
  const { data: summary } = useGetItemsSummary();
  const count = summary?.total ?? 0;
  const isAtLimit = count >= DEMO_ITEM_LIMIT;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border px-3.5 py-2.5 sm:px-4 mb-6 transition-colors ${
        isAtLimit
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-border/80 bg-muted/30"
      }`}
    >
      <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
        {isAtLimit ? (
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" aria-hidden="true" />
        ) : (
          <Info className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        )}
        <span>
          <span className="font-semibold text-foreground">Demo session</span>
          {isAtLimit ? (
            <span className="text-destructive font-medium">
              {" — limit reached (10/10 items). Delete an item to add more."}
            </span>
          ) : (
            <span>
              {" — private sandbox (up to 10 items). Stored in your private session."}
            </span>
          )}
        </span>
      </p>

      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
        {summary !== undefined && (
          <span
            className={`text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              isAtLimit
                ? "bg-destructive text-destructive-foreground border-destructive"
                : "bg-secondary text-secondary-foreground border-border/50"
            }`}
          >
            {count} / {DEMO_ITEM_LIMIT} items
          </span>
        )}
        <button
          type="button"
          data-tally-open={TALLY_FORM_ID}
          data-tally-layout="modal"
          data-tally-width="540"
          data-tally-emoji-text="👋"
          data-tally-emoji-animation="wave"
          onClick={openTallyWaitlist}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-2xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Get Early Access</span>
        </button>
      </div>
    </div>
  );
}

export default DemoBanner;
