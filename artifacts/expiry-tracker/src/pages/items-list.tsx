import { Link, useLocation } from "wouter";
import {
  useListItems,
  useDeleteItem,
  getGetItemsSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { FirstRunEmpty } from "@/components/first-run/first-run-empty";
import { useRoomIsEmpty } from "@/hooks/use-room-is-empty";
import { formatDate, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useItemFilters } from "@/hooks/use-item-filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Search, Trash2, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export function ItemsList() {
  const [, setLocation] = useLocation();
  const { search, status, sort, setSearch, setStatus, toggleSort } = useItemFilters();

  // Debounce the search box: without this, every keystroke changes the query
  // key and fires a request, and each request is an unindexed `%term%` scan.
  const debouncedSearch = useDebouncedValue(search);

  const { data: items, isLoading, isError, refetch } = useListItems({
    search: debouncedSearch || undefined,
    status: status !== "all" ? status : undefined,
    sort
  });

  const queryClient = useQueryClient();
  const deleteItem = useDeleteItem();
  const { toast } = useToast();

  // Room-wide emptiness, independent of the search box and status tabs below.
  // A room with items must never show the first-run screen just because the
  // current filter happens to match nothing.
  const { isEmpty: isRoomEmpty } = useRoomIsEmpty();
  const hasActiveFilters = Boolean(search) || status !== "all";

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteItem.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Item deleted successfully" });
        // Prefix-based invalidation: the list is keyed by `["/api/items", {search, status, sort}]`,
        // so invalidating just the `/api/items` prefix refreshes every filtered variant.
        queryClient.invalidateQueries({ queryKey: ["/api/items"] });
        queryClient.invalidateQueries({ queryKey: getGetItemsSummaryQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to delete item", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">All Items</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage and track all your expirations.
          </p>
        </div>
        <Link href="/demo/items/new">
          <Button className="font-semibold shadow-2xs">Add Item</Button>
        </Link>
      </div>

      <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search items by name or category..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background w-full"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 w-full sm:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "expiring_soon", label: "Expiring Soon" },
              { id: "expired", label: "Expired" }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id as import("@/hooks/use-item-filters").FilterStatus)}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors outline-none",
                  status === s.id 
                    ? "bg-primary text-primary-foreground shadow-2xs" 
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="shrink-0 self-end sm:self-auto h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={toggleSort}
            aria-label={sort === "asc" ? "Switch to latest first" : "Switch to soonest first"}
          >
            {sort === "asc" ? <ArrowUp className="w-3.5 h-3.5 mr-1.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 mr-1.5 text-primary" />}
            <span>{sort === "asc" ? "Soonest first" : "Latest first"}</span>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden flex items-stretch">
              <div className="w-1.5 bg-muted shrink-0" />
              <div className="p-4 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44 sm:w-60" />
                  <Skeleton className="h-3 w-28 sm:w-36" />
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </Card>
          ))
        ) : items && items.length > 0 ? (
          items.map((item) => (
            <Card
              key={item.id}
              className="hover-elevate transition-all overflow-hidden flex items-stretch"
            >
              <div className={`w-1.5 shrink-0 ${
                item.status === 'expired' ? 'bg-destructive' :
                item.status === 'expiring_soon' ? 'bg-warning' :
                'bg-success'
              }`} />
              <div className="p-4 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                {/* Only the title + expiry info are the clickable link to edit.
                    Keep interactive controls (delete) OUTSIDE any <a> so their
                    clicks can never navigate away or be swallowed by the link. */}
                <Link href={`/demo/items/${item.id}/edit`} className="flex flex-col gap-1 outline-none group min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors tracking-tight truncate">
                    {item.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-muted-foreground">
                    {item.category && (
                      <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/50">
                        {item.category}
                      </span>
                    )}
                    <span>Expires: <span className="font-medium text-foreground">{formatDate(item.expiration_date)}</span></span>
                  </div>
                </Link>

                {/* Status + Delete — unrelated to navigation, sits outside the <a>. */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <StatusBadge status={item.status} daysRemaining={item.days_remaining} />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10 h-8 w-8"
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the item "{item.title}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => handleDelete(item.id, e)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))
        ) : isError ? (
          <Card className="p-10 sm:p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-lg sm:text-xl font-display font-semibold tracking-tight text-foreground mb-1">
              Failed to load items
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
              Could not retrieve your tracked items. Please check your connection and try again.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </Card>
        ) : isRoomEmpty && !hasActiveFilters ? (
          /* The room genuinely holds nothing, so explain the product instead of
             showing a bare "no results" card. Never shown while a filter is
             active, because then "empty" only means "no matches". */
          <FirstRunEmpty />
        ) : (
          <Card className="p-10 sm:p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-muted/80 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-display font-semibold tracking-tight text-foreground mb-1">
              No matching items
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
              {search || status !== "all" 
                ? "No items match your active search or filter criteria. Reset them to see all tracked items." 
                : "You don't have any items yet. Add your first item to start tracking."}
            </p>
            {(search || status !== "all") ? (
              <Button variant="outline" size="sm" onClick={() => { setSearch(""); setStatus("all"); }}>
                Clear Filters
              </Button>
            ) : (
              <Link href="/demo/items/new">
                <Button size="sm">Add Your First Item</Button>
              </Link>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
