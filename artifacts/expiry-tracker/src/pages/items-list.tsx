import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { 
  useListItems, 
  useDeleteItem, 
  getListItemsQueryKey,
  getGetItemsSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Search, ListFilter, Trash2, ArrowUpDown, MoreHorizontal, Inbox } from "lucide-react";
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
  const [searchParams] = useLocation();
  // Simple extraction of status from URL since we don't have react-router's useSearchParams
  // e.g. /items?status=active
  const initialStatus = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get("status") 
    : null;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(initialStatus || "all");
  const [sort, setSort] = useState<"asc" | "desc">("asc");

  const { data: items, isLoading } = useListItems({
    search: search || undefined,
    status: status !== "all" ? (status as any) : undefined,
    sort
  });

  const queryClient = useQueryClient();
  const deleteItem = useDeleteItem();
  const { toast } = useToast();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteItem.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Item deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
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
          <h1 className="text-3xl font-display font-bold tracking-tight">All Items</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your expirations.
          </p>
        </div>
        <Link href="/items/new">
          <Button>Add Item</Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search items..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px] bg-background">
                <ListFilter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className="w-[140px] bg-background">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Date (Asc)</SelectItem>
                <SelectItem value="desc">Date (Desc)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </Card>
          ))
        ) : items && items.length > 0 ? (
          items.map((item) => (
            <Link key={item.id} href={`/items/${item.id}/edit`} className="block outline-none group">
              <Card className="hover-elevate transition-all overflow-hidden flex items-stretch">
                <div className={`w-1 shrink-0 ${
                  item.status === 'expired' ? 'bg-destructive' :
                  item.status === 'expiring_soon' ? 'bg-[#f59e0b]' :
                  'bg-[#10b981]'
                }`} />
                <div className="p-4 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {item.category && (
                        <span className="bg-secondary px-2 py-0.5 rounded text-secondary-foreground font-medium text-xs">
                          {item.category}
                        </span>
                      )}
                      <span>Expires: <span className="font-medium text-foreground">{formatDate(item.expiration_date)}</span></span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <StatusBadge status={item.status} daysRemaining={item.days_remaining} />
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
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
            </Link>
          ))
        ) : (
          <Card className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-display font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {search || status !== "all" 
                ? "Try adjusting your search or filters to find what you're looking for." 
                : "You don't have any items yet. Add your first item to start tracking."}
            </p>
            {(search || status !== "all") ? (
              <Button variant="outline" onClick={() => { setSearch(""); setStatus("all"); }}>
                Clear Filters
              </Button>
            ) : (
              <Link href="/items/new">
                <Button>Add Your First Item</Button>
              </Link>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
