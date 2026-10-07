import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";

/**
 * 404 — page not found.
 *
 * Shown by the Wouter router's catch-all `<Route>` when no registered path matches.
 */
export default function NotFound() {
  return (
    <main className="min-h-[80vh] w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border/80">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-7 w-7 text-destructive shrink-0" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground">
              Page Not Found
            </h1>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Link href="/demo">
            <Button variant="outline" size="sm" className="gap-2 mt-2 font-medium">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to Overview
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
