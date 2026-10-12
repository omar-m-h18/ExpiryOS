import { useMemo, type CSSProperties, type ReactNode } from "react";
import { useGetItemsSummary, useListItems, type Item, type ItemsSummary } from "@workspace/api-client-react";
import {
  AlertCircle,
  AppWindow,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  HeartPulse,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/status-badge";
import { SpotlightAction } from "@/components/spotlight-action";
import { FirstRunEmpty } from "@/components/first-run/first-run-empty";
import { useRoomIsEmpty } from "@/hooks/use-room-is-empty";
import { cn, formatDate } from "@/lib/utils";
import { pickSoonestItem, selectNeedsAttention } from "@/lib/select-needs-attention";

type StatusKey = "active" | "expiring_soon" | "expired";

/**
 * Presentation for each computed status. Class names are spelled out in full
 * so Tailwind can find them. Status colours are reserved for status, and every
 * use is paired with the icon and the label, never colour alone.
 */
const STATUS_META: Record<
  StatusKey,
  { label: string; icon: LucideIcon; href: string; chip: string; glow: string; fill: string; track: string }
> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    href: "/demo/items?status=active",
    chip: "bg-success/10 text-success ring-success/20",
    glow: "bg-success/15",
    fill: "bg-success",
    track: "bg-success/15",
  },
  expiring_soon: {
    label: "Expiring soon",
    icon: Clock,
    href: "/demo/items?status=expiring_soon",
    chip: "bg-warning/10 text-warning ring-warning/25",
    glow: "bg-warning/20",
    fill: "bg-warning",
    track: "bg-warning/15",
  },
  expired: {
    label: "Expired",
    icon: AlertCircle,
    href: "/demo/items?status=expired",
    chip: "bg-destructive/10 text-destructive ring-destructive/20",
    glow: "bg-destructive/15",
    fill: "bg-destructive",
    track: "bg-destructive/15",
  },
};

const STATUS_ORDER: StatusKey[] = ["active", "expiring_soon", "expired"];

/** Icons for the item form's quick-pick categories; anything else gets a box. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  documents: FileText,
  subscriptions: CreditCard,
  insurance: ShieldCheck,
  software: AppWindow,
  warranties: BadgeCheck,
  health: HeartPulse,
};

function categoryIcon(category: string | null | undefined): LucideIcon {
  return CATEGORY_ICONS[category?.trim().toLowerCase() ?? ""] ?? Package;
}

function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** "today" / "tomorrow" / "in 3 days" for a non-negative day count. */
function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Staggered entrance; `fill-mode: both` keeps a delayed block hidden until its turn. */
const ENTER = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500";
const enterDelay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms`, animationFillMode: "both" });

export function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary, isError: isErrorSummary, refetch: refetchSummary } = useGetItemsSummary();
  const { isEmpty: isRoomEmpty } = useRoomIsEmpty();
  const { data: expiringSoonItems, isLoading: isLoadingExpiring, isError: isErrorExpiring, refetch: refetchExpiring } = useListItems({
    status: "expiring_soon",
    sort: "asc"
  });
  const { data: expiredItems, isLoading: isLoadingExpired, isError: isErrorExpired, refetch: refetchExpired } = useListItems({
    status: "expired",
    sort: "desc"
  });

  const isLoadingItems = isLoadingExpiring || isLoadingExpired;
  const isErrorItems = isErrorExpiring || isErrorExpired;

  // Selection logic lives in a pure helper because it must NOT mutate the
  // arrays it is given — they are the objects held in the React Query cache,
  // and `Array.prototype.sort` sorts in place.
  const needsAttentionItems = useMemo(
    () => selectNeedsAttention(expiredItems ?? [], expiringSoonItems ?? []),
    [expiredItems, expiringSoonItems],
  );

  // The soonest item that has not lapsed yet, whether or not it falls inside
  // the server's "this week" window. Spotlight shows it as "next up".
  const nextUp = useMemo(() => pickSoonestItem(expiringSoonItems), [expiringSoonItems]);

  const viewAllHref = (expiredItems && expiredItems.length > 0)
    ? "/demo/items?status=expired"
    : "/demo/items?status=expiring_soon";

  // An empty room gets the first-run screen instead of a dashboard full of
  // zeroes. Every hook above has already run, so returning early here is safe.
  if (isRoomEmpty) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* No "Add item" here: the first-run tour is the call to action. */}
        <OverviewHeader summary={undefined} showAddButton={false} />
        <FirstRunEmpty />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <OverviewHeader summary={summary} />

      {isLoadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl border border-card-border bg-card p-4 sm:p-5 shadow-sm">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-4 h-3.5 w-20" />
              <Skeleton className="mt-2 h-8 w-12 rounded-md" />
              <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : isErrorSummary ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-destructive">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Could not load summary metrics.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchSummary()} className="h-8 text-xs border-destructive/40 hover:bg-destructive/10">
            Retry
          </Button>
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile
            href="/demo/items"
            label="Total items"
            value={summary.total}
            icon={Package}
            chipClassName="bg-primary/5 text-foreground ring-border dark:bg-primary/10"
            glowClassName="bg-primary/5 dark:bg-primary/10"
            style={enterDelay(0)}
          >
            <StatusMixBar summary={summary} />
            <p className="mt-2 text-xs text-muted-foreground">All tracked items</p>
          </StatTile>

          {STATUS_ORDER.map((key, index) => {
            const meta = STATUS_META[key];
            const share = percentOf(summary[key], summary.total);
            return (
              <StatTile
                key={key}
                href={meta.href}
                label={meta.label}
                value={summary[key]}
                icon={meta.icon}
                chipClassName={meta.chip}
                glowClassName={meta.glow}
                style={enterDelay((index + 1) * 70)}
              >
                <div
                  role="meter"
                  aria-label={`${meta.label} share of all items`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={share}
                  className={cn("h-1.5 w-full overflow-hidden rounded-full", meta.track)}
                >
                  <div className={cn("h-full rounded-full", meta.fill)} style={{ width: `${share}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{share}% of items</p>
              </StatTile>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 xl:items-start gap-6">
        <section
          aria-labelledby="needs-attention-heading"
          className={cn("xl:col-span-2 rounded-2xl border border-card-border bg-card shadow-sm", ENTER)}
          style={enterDelay(280)}
        >
          <div className="flex items-start justify-between gap-4 p-4 pb-3 sm:p-6 sm:pb-3">
            <div className="flex items-start gap-3 min-w-0">
              <AttentionIcon
                isLoading={isLoadingItems}
                isError={isErrorItems}
                hasExpired={(expiredItems?.length ?? 0) > 0}
                hasItems={needsAttentionItems.length > 0}
              />
              <div className="min-w-0">
                <h2 id="needs-attention-heading" className="text-lg sm:text-xl font-display font-semibold tracking-tight">
                  Needs attention
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isLoadingItems
                    ? "Checking your items…"
                    : isErrorItems
                      ? "This list could not be loaded."
                      : attentionCaption(needsAttentionItems.length, summary)}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="group h-8 shrink-0 rounded-full px-3 text-xs">
              <Link href={viewAllHref}>
                View all
                <ArrowRight className="ml-1 w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>

          <div className="@container px-2 pb-2 sm:px-3 sm:pb-3">
            {isLoadingItems ? (
              <div className="space-y-1 p-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-36 sm:w-48" />
                      <Skeleton className="h-3 w-24 sm:w-32" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full shrink-0" />
                  </div>
                ))}
              </div>
            ) : isErrorItems ? (
              <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <p className="font-semibold text-foreground text-sm sm:text-base">Unable to check items</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  Failed to retrieve expiring or overdue items. Please check your connection and try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchExpiring();
                    refetchExpired();
                  }}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            ) : needsAttentionItems.length > 0 ? (
              <AttentionGroups items={needsAttentionItems} />
            ) : (
              <div className="m-2 sm:m-3 rounded-xl border border-dashed border-success/30 bg-success/5 p-8 sm:p-10 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-success/10 ring-1 ring-inset ring-success/20 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <p className="font-semibold text-foreground text-sm sm:text-base">You're all caught up</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs">
                  No items are expired or expiring soon. Everything is up to date!
                </p>
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="spotlight-heading"
          className={cn(
            "@container relative isolate flex flex-col overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-6 text-white shadow-lg shadow-slate-900/15",
            "bg-[linear-gradient(150deg,hsl(222_34%_22%)_0%,hsl(226_40%_14%)_55%,hsl(232_44%_10%)_100%)]",
            ENTER,
          )}
          style={enterDelay(350)}
        >
          {/* Decorative light: two soft glows and a fading dot grid. */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 -z-10 h-64 w-64 rounded-full bg-indigo-400/25 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 -bottom-20 -z-10 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(rgb(255_255_255/0.09)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,black,transparent_65%)]"
          />

          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
              <Sparkles className="h-5 w-5 text-amber-200" />
            </span>
            <div>
              <h2 id="spotlight-heading" className="text-lg sm:text-xl font-display font-semibold tracking-tight text-white">
                Spotlight
              </h2>
              <p className="text-xs sm:text-sm text-white/65">What's coming up next.</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-white/[0.06] p-4 sm:p-5 ring-1 ring-inset ring-white/10 backdrop-blur-sm">
            {isLoadingSummary ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32 bg-white/15 rounded" />
                <Skeleton className="h-14 w-20 bg-white/15 rounded-lg" />
                <Skeleton className="h-4 w-44 bg-white/10 rounded" />
              </div>
            ) : isErrorSummary ? (
              <div className="flex flex-col gap-3 py-1">
                <p className="text-xs text-white/80 leading-relaxed">
                  Could not load weekly status.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refetchSummary()}
                  className="w-full text-xs border-white bg-white text-slate-900 hover:bg-white/90"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 @lg:grid-cols-2 @lg:gap-6">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <CalendarClock className="h-4 w-4 text-white/80" />
                    Expiring this week
                  </p>
                  <p className="mt-2 font-display text-6xl font-semibold leading-none tracking-tight">
                    {summary?.expiring_this_week ?? 0}
                  </p>
                  <p className="mt-3 text-xs sm:text-sm text-white/70 leading-relaxed">
                    {(summary?.expiring_this_week ?? 0) > 0
                      ? "Items need renewal shortly. Check the list to take action before they lapse."
                      : "No renewals due this week. Everything is on schedule."}
                  </p>
                </div>

                <div className="border-t border-white/10 pt-4 @lg:border-t-0 @lg:border-l @lg:pt-0 @lg:pl-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Next up</p>
                  {isLoadingExpiring ? (
                    <Skeleton className="mt-2 h-10 w-full bg-white/10 rounded-lg" />
                  ) : nextUp ? (
                    <Link
                      href={`/demo/items/${nextUp.id}/edit`}
                      className="group mt-2 -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10">
                        <CategoryGlyph category={nextUp.category} className="h-4 w-4 text-white/85" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{nextUp.title}</span>
                        <span className="block text-xs text-white/60" title={formatDate(nextUp.expiration_date)}>
                          Due {relativeDays(nextUp.days_remaining ?? 0)}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/50 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ) : (
                    <p className="mt-2 text-sm text-white/70">Nothing on the horizon yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isLoadingSummary && !isErrorSummary && (
            <SpotlightAction
              items={expiringSoonItems}
              count={summary?.expiring_this_week ?? 0}
              className="mt-4 border-white bg-white text-slate-900 hover:bg-white/90"
            />
          )}
        </section>
      </div>
    </div>
  );
}

/** Today's date, the page title and a one-line read of the room. */
function OverviewHeader({ summary, showAddButton = true }: { summary: ItemsSummary | undefined; showAddButton?: boolean }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          {today}
        </p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground">Overview</h1>
        <p className="mt-1.5 text-sm sm:text-base text-muted-foreground">
          <Headline summary={summary} />
        </p>
      </div>
      {showAddButton && (
        <Button asChild size="sm" className="h-9 self-start sm:self-auto rounded-full px-4 shadow-sm">
          <Link href="/demo/items/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Add item
          </Link>
        </Button>
      )}
    </header>
  );
}

function Headline({ summary }: { summary: ItemsSummary | undefined }) {
  if (!summary || summary.total === 0) {
    return <>Keep track of your important dates and renewals.</>;
  }

  const overdue = summary.expired > 0 && <span className="font-semibold text-foreground">{summary.expired} overdue</span>;
  const soon = summary.expiring_soon > 0 && (
    <span className="font-semibold text-foreground">{summary.expiring_soon} expiring soon</span>
  );

  if (!overdue && !soon) {
    return summary.total === 1
      ? <>Your item is up to date. Nice work.</>
      : <>All {summary.total} items are up to date. Nice work.</>;
  }

  return (
    <>
      {overdue}
      {overdue && soon && " and "}
      {soon} out of {pluralize(summary.total, "tracked item")}.
    </>
  );
}

function attentionCaption(shown: number, summary: ItemsSummary | undefined): string {
  if (shown === 0) return "Expired and soon-to-expire items show up here.";
  const total = summary ? summary.expired + summary.expiring_soon : shown;
  return total > shown ? `Most urgent first · showing ${shown} of ${total}` : "Most urgent first";
}

function AttentionIcon({
  isLoading,
  isError,
  hasExpired,
  hasItems,
}: {
  isLoading: boolean;
  isError: boolean;
  hasExpired: boolean;
  hasItems: boolean;
}) {
  // While loading or after an error we know nothing, so stay neutral rather
  // than flashing the green "all clear" state.
  const isUnknown = isLoading || isError;
  const tone = isUnknown
    ? "bg-muted text-muted-foreground ring-border"
    : hasExpired
      ? "bg-destructive/10 text-destructive ring-destructive/20"
      : hasItems
        ? "bg-warning/10 text-warning ring-warning/25"
        : "bg-success/10 text-success ring-success/20";
  const Icon = isUnknown || hasItems ? BellRing : CheckCircle2;

  return (
    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition-colors", tone)}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

/** Overdue items first, then the ones still running out, each under its own label. */
function AttentionGroups({ items }: { items: Item[] }) {
  const groups = [
    { key: "overdue", label: "Overdue", dot: "bg-destructive", items: items.filter(i => i.status === "expired") },
    { key: "upcoming", label: "Coming up", dot: "bg-warning", items: items.filter(i => i.status !== "expired") },
  ].filter(g => g.items.length > 0);

  return (
    <div className="space-y-2">
      {groups.map(group => (
        <div key={group.key}>
          <p className="flex items-center gap-2 px-3 sm:px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", group.dot)} />
            {group.label}
            <span className="font-medium text-muted-foreground/70">· {group.items.length}</span>
          </p>
          <ul>
            {group.items.map(item => (
              <li key={item.id}>
                <AttentionRow item={item} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AttentionRow({ item }: { item: Item }) {
  return (
    <Link
      href={`/demo/items/${item.id}/edit`}
      className="group flex items-center gap-3 sm:gap-4 rounded-xl px-3 py-3 sm:px-4 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl bg-secondary ring-1 ring-inset ring-border/70 transition-colors group-hover:bg-card">
        <CategoryGlyph category={item.category} className="h-5 w-5 text-foreground/70" />
      </span>
      <div className="min-w-0 flex-1 @md:flex @md:items-center @md:justify-between @md:gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm sm:text-base font-semibold text-foreground transition-colors group-hover:text-primary">
            {item.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            {item.category && <span className="truncate">{item.category}</span>}
            {item.category && <span aria-hidden="true">•</span>}
            <span className="shrink-0">
              {item.status === "expired" ? "Expired" : "Expires"} {formatDate(item.expiration_date)}
            </span>
          </p>
        </div>
        <div className="mt-2 @md:mt-0 @md:shrink-0">
          <StatusBadge status={item.status} daysRemaining={item.days_remaining} />
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function CategoryGlyph({ category, className }: { category: string | null | undefined; className?: string }) {
  const Icon = categoryIcon(category);
  return <Icon className={className} aria-hidden="true" />;
}

function StatTile({
  href,
  label,
  value,
  icon: Icon,
  chipClassName,
  glowClassName,
  style,
  children,
}: {
  href: string;
  label: string;
  value: number;
  icon: LucideIcon;
  chipClassName: string;
  glowClassName: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={style}
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card p-4 sm:p-5 shadow-sm outline-none",
        "transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/15",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        ENTER,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-10 -bottom-14 -z-10 h-40 w-40 rounded-full blur-2xl opacity-80 transition-opacity duration-300 group-hover:opacity-100",
          glowClassName,
        )}
      />
      <div className="flex items-start justify-between">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl ring-1 ring-inset", chipClassName)}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-200 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0"
        />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">{label}</p>
      <p className="mt-0.5 font-display text-3xl sm:text-4xl font-semibold leading-tight tracking-tight text-foreground">{value}</p>
      <div className="mt-auto pt-3">{children}</div>
    </Link>
  );
}

/**
 * One bar split by status, each segment sized by its count. The neighbouring
 * tiles act as its legend (same icon, colour and label); the tooltip and the
 * accessible label carry the exact numbers.
 */
function StatusMixBar({ summary }: { summary: ItemsSummary }) {
  const segments = STATUS_ORDER.filter(key => summary[key] > 0);
  const description = STATUS_ORDER.map(key => `${summary[key]} ${STATUS_META[key].label.toLowerCase()}`).join(", ");

  return (
    <div role="img" aria-label={`Status mix: ${description}`} className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full">
      {segments.map(key => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <span className={cn("h-full min-w-1.5", STATUS_META[key].fill)} style={{ flexGrow: summary[key], flexBasis: 0 }} />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {STATUS_META[key].label} · {pluralize(summary[key], "item")} ({percentOf(summary[key], summary.total)}%)
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
