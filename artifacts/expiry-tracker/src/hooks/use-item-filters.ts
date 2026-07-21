/**
 * useItemFilters — manages filter and sort state for the items list.
 *
 * Extracts URL-driven initial state and provides stable setters so the
 * items list page stays focused on rendering rather than state management.
 *
 * @module hooks/use-item-filters
 */

import { useState } from "react";

export type FilterStatus = "all" | "active" | "expiring_soon" | "expired";
export type SortDirection = "asc" | "desc";

export interface ItemFilters {
  search: string;
  status: FilterStatus;
  sort: SortDirection;
  setSearch: (value: string) => void;
  setStatus: (value: FilterStatus) => void;
  toggleSort: () => void;
}

/**
 * Reads the initial `status` filter from the URL search params so that links
 * like `/items?status=expired` pre-filter the list on arrival.
 */
function getInitialStatus(): FilterStatus {
  if (typeof window === "undefined") return "all";
  const param = new URLSearchParams(window.location.search).get("status");
  const valid: FilterStatus[] = ["all", "active", "expiring_soon", "expired"];
  return valid.includes(param as FilterStatus) ? (param as FilterStatus) : "all";
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>(getInitialStatus);
  const [sort, setSort] = useState<SortDirection>("asc");

  const toggleSort = () => setSort((prev) => (prev === "asc" ? "desc" : "asc"));

  return { search, status, sort, setSearch, setStatus, toggleSort };
}
