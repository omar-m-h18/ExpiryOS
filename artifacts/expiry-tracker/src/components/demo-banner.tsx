import { Info, AlertCircle } from "lucide-react";
import { useGetItemsSummary } from "@workspace/api-client-react";

const DEMO_ITEM_LIMIT = 10;

/**
 * Slim, on-brand banner clarifying that this is a temporary demo session
 * and displaying the 10-item demo quota.
 */
export function DemoBanner() {
  const { data: summary } = useGetItemsSummary();
  const count = summary?.total ?? 0;
  const isAtLimit = count >= DEMO_ITEM_LIMIT;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border px-4 py-3 mb-6 transition-colors ${
        isAtLimit
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-border bg-muted/40"
      }`}
    >
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        {isAtLimit ? (
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" aria-hidden="true" />
        ) : (
          <Info className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        )}
        <span>
          <span className="font-medium text-foreground">Demo session</span>
          {isAtLimit ? (
            <span className="text-destructive font-medium">
              {" — demo limit reached (10/10 items). Delete an item or start fresh to add more."}
            </span>
          ) : (
            <span>
              {" — private, temporary room (up to 10 items). Resets when you close this browser."}
            </span>
          )}
        </span>
      </p>

      {summary !== undefined && (
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded shrink-0 self-start sm:self-auto ${
            isAtLimit
              ? "bg-destructive text-destructive-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          {count} / {DEMO_ITEM_LIMIT} items
        </span>
      )}
    </div>
  );
}

export default DemoBanner;
