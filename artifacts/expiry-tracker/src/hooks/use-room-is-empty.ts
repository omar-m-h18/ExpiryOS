import { useGetItemsSummary } from "@workspace/api-client-react";

/**
 * Single source of truth for "does this visitor's room hold any items?".
 *
 * Both the dashboard and the items list need this answer, and they must agree.
 * It reads the room-wide `total` from the summary endpoint rather than a
 * filtered list, so a search term or a status tab can never make a populated
 * room look empty.
 *
 * The `isLoading` flag matters: without it the first-run screen would flash on
 * every page load, because React Query has no data yet on the first render.
 *
 * An error leaves `summary` undefined, and undefined is reported as NOT empty
 * so a failed request never replaces real content with an onboarding prompt.
 */
export interface RoomEmptiness {
  /** True while the summary request is still in flight. */
  isLoading: boolean;
  /** True only when the server has confirmed the room holds zero items. */
  isEmpty: boolean;
}

export function useRoomIsEmpty(): RoomEmptiness {
  const { data: summary, isLoading } = useGetItemsSummary();

  return {
    isLoading,
    isEmpty: summary !== undefined && summary.total === 0,
  };
}