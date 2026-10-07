import { useQueryClient } from "@tanstack/react-query";
import { useResetSession } from "@workspace/api-client-react";
import { Link } from "wouter";
import { CalendarCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

/**
 * First-run screen for an empty room.
 *
 * Shown when the server confirms the room holds zero items. It does two jobs:
 *
 * 1. It replaces the automatic sample data that used to be inserted on every
 *    new room. The server no longer writes those eight rows, so this screen has
 *    to explain what the product is instead of a wall of pre-filled data.
 * 2. It offers examples on request. The "show me examples" button calls the same
 *    `POST /api/session/reset` endpoint as "start fresh", which mints a new room
 *    and writes the example roster there.
 *
 * The button only ever renders on an empty room, so a visitor can never destroy
 * real items by clicking it.
 *
 * The tutorial is deliberately three short steps. A visitor who arrived from the
 * landing page wants to see the product work, not read documentation.
 */

const STEPS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Add what expires for you",
    body: "A passport, a licence, an insurance policy, a subscription. Anything with a date on it.",
  },
  {
    title: "ExpiryOS works out the status",
    body: "Active, expiring soon, or expired. You never set this yourself and it never goes stale.",
  },
  {
    title: "See what needs attention first",
    body: "The overview prioritizes overdue items and renewals coming due soon, so nothing slips past.",
  },
];

export function FirstRunEmpty() {
  const queryClient = useQueryClient();
  const resetSession = useResetSession();
  const { toast } = useToast();

  const handleShowExamples = () => {
    resetSession.mutate(undefined, {
      onSuccess: () => {
        // The room id changed, so every cached query belongs to a room that no
        // longer exists. Invalidate all of them rather than guessing keys.
        queryClient.invalidateQueries();
        toast({ title: "Example items added" });
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Could not add examples";
        toast({ title: msg, variant: "destructive" });
      },
    });
  };

  return (
    <Card className="border border-border/80 shadow-xs overflow-hidden">
      <CardContent className="p-8 sm:p-12">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 text-primary">
            <CalendarCheck className="w-7 h-7" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">
            Nothing tracked yet
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-md leading-relaxed">
            Add your first item and ExpiryOS will keep an eye on its renewal and expiry dates for you.
          </p>

          <Link href="/demo/items/new" className="mt-6">
            <Button size="lg" className="h-11 px-6 font-semibold shadow-2xs">
              Add your first item
            </Button>
          </Link>

          <ol className="mt-8 w-full max-w-lg text-left space-y-2.5">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border/60 bg-muted/20"
              >
                <span
                  aria-hidden="true"
                  className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5 border border-primary/20"
                >
                  {index + 1}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground">{step.title}</span>
                  <span className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-8 pt-6 border-t border-border/60 w-full max-w-lg">
            <p className="text-sm font-medium text-foreground mb-1">
              Would rather look around first?
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Loads 4 sample items into this temporary session so you can explore all views.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowExamples}
              disabled={resetSession.isPending}
              className="gap-2 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {resetSession.isPending ? "Adding examples..." : "Show me examples"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}