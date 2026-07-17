import { useGetItemsSummary, useListItems } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetItemsSummary();
  const { data: expiringSoonItems, isLoading: isLoadingItems } = useListItems({
    status: "expiring_soon",
    sort: "asc"
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Keep track of your important dates and renewals.
        </p>
      </div>

      {isLoadingSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          
          <Link href="/items?status=active" className="group outline-none">
            <Card className="hover-elevate cursor-pointer border-l-4 border-l-[#10b981] transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Active</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.active}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/items?status=expiring_soon" className="group outline-none">
            <Card className="hover-elevate cursor-pointer border-l-4 border-l-[#f59e0b] transition-all bg-[#f59e0b]/5">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Expiring Soon</CardTitle>
                <Clock className="w-4 h-4 text-[#f59e0b]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#f59e0b]">{summary.expiring_soon}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/items?status=expired" className="group outline-none">
            <Card className="hover-elevate cursor-pointer border-l-4 border-l-destructive transition-all bg-destructive/5">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Expired</CardTitle>
                <AlertCircle className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{summary.expired}</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold">Needs Attention</h2>
            <Link href="/items?status=expiring_soon" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <Card>
            <div className="divide-y border-t-0">
              {isLoadingItems ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-5/6" />
                </div>
              ) : expiringSoonItems && expiringSoonItems.length > 0 ? (
                expiringSoonItems.slice(0, 5).map(item => (
                  <Link key={item.id} href={`/items/${item.id}/edit`} className="block hover:bg-muted/50 transition-colors p-4 group outline-none">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium group-hover:text-primary transition-colors">{item.title}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {item.category && <span>{item.category}</span>}
                          {item.category && <span>•</span>}
                          <span>Expires: {formatDate(item.expiration_date)}</span>
                        </div>
                      </div>
                      <StatusBadge status={item.status} daysRemaining={item.days_remaining} />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                  <ShieldAlert className="w-12 h-12 text-muted mb-3" />
                  <p>No items require immediate attention.</p>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Spotlight</h2>
          <Card className="bg-primary text-primary-foreground border-primary-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary-foreground">
                <Clock className="w-5 h-5" />
                Expiring This Week
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Items requiring action in the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-12 w-16 bg-white/20" />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="text-5xl font-bold font-display">
                    {summary?.expiring_this_week ?? 0}
                  </div>
                  {(summary?.expiring_this_week ?? 0) > 0 ? (
                    <p className="text-sm text-primary-foreground/90">
                      Don't let these slip by. Check the items list for details.
                    </p>
                  ) : (
                    <p className="text-sm text-primary-foreground/90">
                      Clear schedule for the week. Relax!
                    </p>
                  )}
                  <Link href="/items" className="mt-2 w-full">
                    <Button variant="secondary" className="w-full">
                      View Items
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
