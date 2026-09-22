/**
 * useItemFilters — manages filter and sort state for the items list.
 *
 * The `status` filter is derived from the URL and kept in step with it.
 * wouter matches on pathname only, so navigating from
 * `/demo/items?status=expired` to `/demo/items` does **not** remount the list
 * component. Without an explicit re-sync the initial state would be computed
 * once and then go stale — which is why clicking "All Items" in the nav failed
 * to clear an active filter.
 *
 * @module hooks/use-item-filters
 */

import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { parseStatusParam } from "@/lib/item-filters";
import type { FilterStatus, SortDirection } from "@/lib/item-filters";

export type { FilterStatus, SortDirection };

export interface ItemFilters {
  search: string;
  status: FilterStatus;
  sort: SortDirection;
  setSearch: (value: string) => void;
  setStatus: (value: FilterStatus) => void;
  toggleSort: () => void;
}

/**
 * Hook that owns all filter/sort state for the items list.
 *
 * @returns Current filter values and stable setters
 *
 * @example
 * ```tsx
 * const { search, status, sort, setSearch, setStatus, toggleSort } = useItemFilters();
 * ```
 */
export function useItemFilters(): ItemFilters {
  const urlSearch = useSearch();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>(() =>
    parseStatusParam(urlSearch),
  );
  const [sort, setSort] = useState<SortDirection>("asc");

  // Re-sync whenever the URL's query string changes, including query-only
  // navigations that leave this component mounted.
  useEffect(() => {
    setStatus(parseStatusParam(urlSearch));
  }, [urlSearch]);

  const toggleSort = () =>
    setSort((previous) => (previous === "asc" ? "desc" : "asc"));

  return { search, status, sort, setSearch, setStatus, toggleSort };
}