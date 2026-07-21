import { Link } from "wouter";
import { Button } from "@/components/ui/button";

/** Number of days that count as "expiring this week". Kept in sync with the server-side threshold. */
const EXPIRING_THIS_WEEK_DAYS = 7;

interface SpotlightActionProps {
  /** Raw expiring_soon items returned by the API; the component filters the subset expiring this week. */
  items: Array<{ id: string; days_remaining?: number | null }> | undefined;
  /** The dashboard summary count for expiring this week (for a quick zero check). */
  count: number;
}

/**
 * Spotlight call-to-action button.
 *
 * - If exactly one item expires this week, jump directly to that item's edit page.
 * - If more than one item expires this week, go to the filtered "Expiring Soon" list.
 * - If nothing is expiring this week, go to the full items list.
 */
export function SpotlightAction({ items, count }: SpotlightActionProps) {
  if (count === 0) {
    return (
      <Link href="/items" className="mt-2 w-full">
        <Button variant="secondary" className="w-full">
          View Items
        </Button>
      </Link>
    );
  }

  const thisWeekItems =
    items?.filter(
      (item) =>
        item.days_remaining !== undefined &&
        item.days_remaining !== null &&
        item.days_remaining >= 0 &&
        item.days_remaining <= EXPIRING_THIS_WEEK_DAYS,
    ) ?? [];

  if (thisWeekItems.length === 1) {
    const target = `/items/${thisWeekItems[0].id}/edit`;
    return (
      <Link href={target} className="mt-2 w-full">
        <Button variant="secondary" className="w-full">
          View Item
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/items?status=expiring_soon" className="mt-2 w-full">
      <Button variant="secondary" className="w-full">
        View Expiring Items
      </Button>
    </Link>
  );
}
