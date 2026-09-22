import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { pickSoonestItem } from "@/lib/select-needs-attention";

interface SpotlightActionProps {
  /** Raw `expiring_soon` items returned by the API. */
  items: Array<{ id: string; days_remaining?: number | null }> | undefined;
  /** The server's count of items inside its own "expiring this week" window. */
  count: number;
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
export function SpotlightAction({ items, count }: SpotlightActionProps) {
  if (count === 0) {
    return (
      <Link href="/demo/items" className="mt-2 w-full">
        <Button variant="secondary" className="w-full">
          View Items
        </Button>
      </Link>
    );
  }

  if (count === 1) {
    const onlyItem = pickSoonestItem(items);
    if (onlyItem) {
      return (
        <Link href={`/demo/items/${onlyItem.id}/edit`} className="mt-2 w-full">
          <Button variant="secondary" className="w-full">
            View Item
          </Button>
        </Link>
      );
    }
  }

  return (
    <Link href="/demo/items?status=expiring_soon" className="mt-2 w-full">
      <Button variant="secondary" className="w-full">
        View Expiring Items
      </Button>
    </Link>
  );
}