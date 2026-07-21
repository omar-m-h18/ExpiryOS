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
    <main className="min-h-[80vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive shrink-0" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-foreground">404 — Page Not Found</h1>
          </div>

          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
