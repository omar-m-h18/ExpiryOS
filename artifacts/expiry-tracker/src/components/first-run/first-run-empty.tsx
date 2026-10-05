import { useQueryClient } from "@tanstack/react-query";
import { useResetSession } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Inbox, Sparkles } from "lucide-react";
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
    body: "The overview puts anything expiring this week at the top, so nothing slips past.",
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
      onError: () => {
        toast({ title: "Could not add examples", variant: "destructive" });
      },
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>

          <h2 className="text-2xl font-display font-bold tracking-tight">
            Nothing tracked yet
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            Add your first item and ExpiryOS will keep an eye on its date for you.
          </p>

          <Link href="/demo/items/new" className="mt-6">
            <Button size="lg">Add your first item</Button>
          </Link>

          <ol className="mt-8 w-full max-w-lg text-left space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="shrink-0 w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold flex items-center justify-center mt-0.5"
                >
                  {index + 1}
                </span>
                <span className="flex flex-col">
                  <span className="font-medium">{step.title}</span>
                  <span className="text-sm text-muted-foreground">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-8 pt-6 border-t w-full max-w-lg">
            <p className="text-sm text-muted-foreground mb-3">
              Would rather look around first?
            </p>
            <Button
              variant="outline"
              onClick={handleShowExamples}
              disabled={resetSession.isPending}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {resetSession.isPending ? "Adding examples..." : "Show me examples"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Adds eight example items to a fresh room. You can clear them at any
              time.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}