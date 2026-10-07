import { Link } from "wouter";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TALLY_FORM_ID, openTallyWaitlist } from "@/lib/tally";

export function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Brand */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-sm">
              E
            </div>
            <span className="font-display font-bold text-3xl tracking-tight text-foreground">
              ExpiryOS
            </span>
          </div>

          {/* Hero */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight leading-tight">
              Never miss another renewal.
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Track your licenses, subscriptions, documents, and insurance
              policies — ExpiryOS tells you what's active, expiring soon, or
              already expired.
            </p>
          </div>

          {/* Clear demo notice */}
          <div className="mx-auto max-w-md rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm text-muted-foreground flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-left">
              <span className="font-medium text-foreground">This is a live demo.</span>{" "}
              You get your own private room, and it's cleared when you
              close your browser. No signup needed.
            </p>
          </div>

          {/* CTA */}
          <div>
            <Link href="/demo" className="inline-block">
              <Button size="lg" className="gap-2 text-base px-8 py-6">
                Start the demo
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          {/* Tally Early Access / Waitlist */}
          <div className="mx-auto max-w-md space-y-3 pt-4 border-t border-border/60">
            <p className="text-sm font-medium text-foreground">
              Interested in self-hosting or cloud accounts?
            </p>
            <p className="text-xs text-muted-foreground">
              Join the early-access list to get notified when new versions launch.
            </p>
            <div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="gap-2 h-12 px-6 font-medium shadow-sm hover:bg-muted"
                data-tally-open={TALLY_FORM_ID}
                data-tally-layout="modal"
                data-tally-width="540"
                data-tally-emoji-text="👋"
                data-tally-emoji-animation="wave"
                onClick={openTallyWaitlist}
              >
                <Mail className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>Join Early Access List</span>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        ExpiryOS demo — your data is private to this browser and resets on close.
      </footer>
    </div>
  );
}

export default Landing;
