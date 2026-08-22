import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListItemsQueryKey,
  getGetItemsSummaryQueryKey,
} from "@workspace/api-client-react";
import { RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { resetDemoSession } from "@/lib/demo";

/**
 * Slim, on-brand banner clarifying that this is a temporary demo session and
 * offering a "Start a sample" reset so visitors can try the app fresh.
 */
export function DemoBanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetDemoSession();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetItemsSummaryQueryKey() }),
      ]);
      toast({ title: "Fresh demo started", description: "Here's a new set of sample items." });
    } catch {
      toast({
        title: "Couldn't reset the demo",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between rounded-md border border-border bg-muted/40 px-4 py-3 mb-6">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Info className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <span>
          <span className="font-medium text-foreground">Demo session</span>
          {" — your changes aren't saved permanently and reset when you close this browser."}
        </span>
      </p>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 shrink-0"
        onClick={handleReset}
        disabled={resetting}
      >
        <RotateCcw className="w-4 h-4" aria-hidden="true" />
        {resetting ? "Restarting..." : "Start a sample"}
      </Button>
    </div>
  );
}

export default DemoBanner;
