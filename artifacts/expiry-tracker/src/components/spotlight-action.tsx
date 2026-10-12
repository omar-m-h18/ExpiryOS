import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pickSoonestItem } from "@/lib/select-needs-attention";
import { cn } from "@/lib/utils";

interface SpotlightActionProps {
  /** Raw `expiring_soon` items returned by the API. */
  items: Array<{ id: string; days_remaining?: number | null }> | undefined;
  /** The server's count of items inside its own "expiring this week" window. */
  count: number;
  /** Extra classes for the button, e.g. to suit the card it sits on. */
  className?: string;
}

/**
 * Spotlight call-to-action button.
 *
 * - Nothing in the window → the full items list.
 * - Exactly one item in the window → straight to that item's edit page.
 * - More than one → the filtered "Expiring Soon" list.
 *
 * The window's size is deliberately unknown here. `count` is computed by the
 * server from `EXPIRING_THIS_WEEK_DAYS`, so re-deriving the window in the
 * browser would drift whenever that setting changes (e.g. `count === 1` while
 * a hard-coded 7-day filter finds zero items). When the server reports exactly
 * one item in the window, that item is simply the soonest non-expired one.
 */
export function SpotlightAction({ items, count, className }: SpotlightActionProps) {
  let href = "/demo/items?status=expiring_soon";
  let label = "View Expiring Items";

  if (count === 0) {
    href = "/demo/items";
    label = "View Items";
  } else if (count === 1) {
    const onlyItem = pickSoonestItem(items);
    if (onlyItem) {
      href = `/demo/items/${onlyItem.id}/edit`;
      label = "View Item";
    }
  }

  // `asChild` renders the link itself as the button, so there is no <button>
  // nested inside an <a>.
  return (
    <Button asChild variant="secondary" className={cn("group w-full", className)}>
      <Link href={href}>
        {label}
        <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Button>
  );
}
