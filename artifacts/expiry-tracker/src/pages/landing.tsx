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
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-2xl shadow-sm">
              E
            </div>
            <span className="font-display font-bold text-3xl tracking-tight text-foreground">
              ExpiryOS
            </span>
          </div>

          {/* Hero */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight text-foreground leading-[1.1]">
              Never miss another renewal.
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Track your licenses, subscriptions, documents, and insurance
              policies — ExpiryOS tells you what's active, expiring soon, or
              already expired.
            </p>
          </div>

          {/* Clear demo notice */}
          <div className="mx-auto max-w-md rounded-xl border border-border/80 bg-muted/30 px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm text-muted-foreground flex items-center sm:items-start gap-3">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-left leading-relaxed">
              <span className="font-semibold text-foreground">Live demo session.</span>{" "}
              You get a private sandbox room with no signup needed. Data is stored in your private session.
            </p>
          </div>

          {/* Dual CTAs: Start demo & Join Early Access */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Link href="/demo" className="w-full sm:w-auto flex-1">
              <Button size="lg" className="w-full h-12 px-7 text-base font-semibold shadow-sm gap-2">
                Start the demo
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 px-6 text-sm font-semibold shadow-2xs gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 text-foreground cursor-pointer"
              data-tally-open={TALLY_FORM_ID}
              data-tally-layout="modal"
              data-tally-width="540"
              data-tally-emoji-text="👋"
              data-tally-emoji-animation="wave"
              onClick={openTallyWaitlist}
            >
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Join Waitlist</span>
            </Button>
          </div>

          {/* Tally Early Access / Waitlist feature highlight */}
          <div className="mx-auto max-w-md space-y-2.5 pt-6 border-t border-border/60">
            <p className="text-sm font-semibold text-foreground">
              Interested in self-hosting or cloud accounts?
            </p>
            <p className="text-xs text-muted-foreground">
              Join the early-access list to get notified when multi-user syncing and automated alert delivery launch.
            </p>
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 h-10 px-5 text-xs font-medium shadow-2xs hover:bg-muted"
                data-tally-open={TALLY_FORM_ID}
                data-tally-layout="modal"
                data-tally-width="540"
                data-tally-emoji-text="👋"
                data-tally-emoji-animation="wave"
                onClick={openTallyWaitlist}
              >
                <Mail className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Get Launch Updates</span>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground/80">
        ExpiryOS demo — your data is private to this browser session.
      </footer>
    </div>
  );
}

export default Landing;
