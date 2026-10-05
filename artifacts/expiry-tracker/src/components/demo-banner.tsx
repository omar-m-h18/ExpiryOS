import { Info } from "lucide-react";

/**
 * Slim, on-brand banner clarifying that this is a temporary demo session.
 *
 * Rooms are no longer pre-filled by the backend. A fresh room starts empty and
 * the first-run screen (`components/first-run`) explains the product. Example
 * items are available on request through that screen's "show me examples"
 * button, which calls the reset endpoint — so this banner must not promise
 * sample data that may not be there.
 */
export function DemoBanner() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-3 mb-6">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Info className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <span>
          <span className="font-medium text-foreground">Demo session</span>
          {" — this is a private, temporary room. Your changes aren't saved permanently and reset when you close this browser. Add your own items below."}
        </span>
      </p>
    </div>
  );
}

export default DemoBanner;
