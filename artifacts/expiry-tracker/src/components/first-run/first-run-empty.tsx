import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useResetSession } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  CalendarCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  RotateCcw,
  FileText,
  Shield,
  Globe,
  Tv,
  Check,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "expiryos_tutorial_skipped";

/**
 * NOTE FOR FUTURE WORK:
 * The user requested to hide the sample data button for now without scrapping
 * or attempting to fix the underlying API reset flow yet.
 * Set to `true` when ready to re-enable.
 */
const SHOW_SAMPLE_BUTTON = false;

interface PresetItem {
  id: string;
  name: string;
  category: string;
  icon: typeof FileText;
  exampleNote: string;
}

const PRESET_ITEMS: PresetItem[] = [
  {
    id: "passport",
    name: "Passport",
    category: "Documents",
    icon: FileText,
    exampleNote: "Passport renewal tracked ahead of international travel.",
  },
  {
    id: "insurance",
    name: "Car Insurance",
    category: "Insurance",
    icon: Shield,
    exampleNote: "Policy renewal reminder to avoid driving uninsured.",
  },
  {
    id: "streaming",
    name: "Netflix",
    category: "Subscriptions",
    icon: Tv,
    exampleNote: "Annual plan renewal before auto-charge triggers.",
  },
  {
    id: "domain",
    name: "example.com",
    category: "Software",
    icon: Globe,
    exampleNote: "Registrar expiration warning before domain drops.",
  },
];

interface TimelineOption {
  id: "active" | "soon" | "expired";
  label: string;
  sublabel: string;
  daysOffset: number;
  status: "active" | "expiring_soon" | "expired";
  note: string;
}

const TIMELINE_OPTIONS: TimelineOption[] = [
  {
    id: "active",
    label: "In 1 Year",
    sublabel: "Far away",
    daysOffset: 365,
    status: "active",
    note: "Safe. ExpiryOS keeps it organized in your inventory without bothering you.",
  },
  {
    id: "soon",
    label: "In 2 Weeks",
    sublabel: "Renewal approaching",
    daysOffset: 14,
    status: "expiring_soon",
    note: "Warning! Automatically highlighted in amber so you have plenty of time to renew.",
  },
  {
    id: "expired",
    label: "5 Days Ago",
    sublabel: "Passed due date",
    daysOffset: -5,
    status: "expired",
    note: "Overdue! Pinned in red to the top of your dashboard so nothing slips through.",
  },
];

export function FirstRunEmpty() {
  const queryClient = useQueryClient();
  const resetSession = useResetSession();
  const { toast } = useToast();

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  });

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("passport");
  const [selectedTimelineId, setSelectedTimelineId] = useState<"active" | "soon" | "expired">("soon");

  const selectedPreset = useMemo(
    () => PRESET_ITEMS.find((p) => p.id === selectedPresetId) ?? PRESET_ITEMS[0],
    [selectedPresetId]
  );

  const selectedTimeline = useMemo(
    () => TIMELINE_OPTIONS.find((t) => t.id === selectedTimelineId) ?? TIMELINE_OPTIONS[1],
    [selectedTimelineId]
  );

  const simulatedDateString = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedTimeline.daysOffset);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [selectedTimeline.daysOffset]);

  const handleSkip = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, "true");
    }
  };

  const handleRestart = () => {
    setIsDismissed(false);
    setCurrentStep(0);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  // Preserved logic: user requested to keep rather than scrap or fix for now
  const handleShowExamples = () => {
    resetSession.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "4 example items loaded" });
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Could not add examples";
        toast({ title: msg, variant: "destructive" });
      },
    });
  };

  // If the user dismissed or finished the guided tour, render the clean empty state
  if (isDismissed) {
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

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
              <Link href="/demo/items/new">
                <Button size="lg" className="h-11 px-6 font-semibold shadow-2xs gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Add your first item</span>
                </Button>
              </Link>

              {/* Sample button hidden per user request */}
              {SHOW_SAMPLE_BUTTON && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleShowExamples}
                  disabled={resetSession.isPending}
                  className="h-11 px-5 font-medium gap-2"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  {resetSession.isPending ? "Loading..." : "Load 4 sample items"}
                </Button>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-border/60">
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Take the guided tour</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const PresetIcon = selectedPreset.icon;

  return (
    <Card className="border border-border/80 shadow-xs overflow-hidden">
      <CardContent className="p-6 sm:p-10">
        {/* Header with guided progress & skip */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    idx === currentStep
                      ? "w-7 bg-primary rounded-full"
                      : idx < currentStep
                      ? "bg-primary/50"
                      : "bg-muted-foreground/25"
                  )}
                />
              ))}
            </div>
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {currentStep === 0 && "Step 1: Choose an item"}
              {currentStep === 1 && "Step 2: See how it works"}
              {currentStep === 2 && "Step 3: Start tracking"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 gap-1.5 cursor-pointer"
          >
            <span>Skip tour</span>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Guided Step 1: Choose an item */}
        {currentStep === 0 && (
          <div className="py-6 space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground">
                What do you want to track?
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
                Click an example to test how ExpiryOS organizes your renewals:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_ITEMS.map((item) => {
                const isSelected = item.id === selectedPresetId;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPresetId(item.id)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 group",
                      isSelected
                        ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                        : "bg-card hover:bg-muted/40 border-border/80 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.category}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="inline-block w-5 h-5 rounded-full border border-border/80 group-hover:border-foreground/40" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3.5 rounded-lg bg-muted/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>
                Selected: <strong className="text-foreground">{selectedPreset.name}</strong> ({selectedPreset.category}). Click <strong>Next</strong> to see how ExpiryOS monitors its date.
              </span>
            </div>
          </div>
        )}

        {/* Guided Step 2: See how date controls status */}
        {currentStep === 1 && (
          <div className="py-6 space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground">
                See how dates control the urgency
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
                Click a timeframe below to see how ExpiryOS automatically calculates urgency for your{" "}
                <span className="font-semibold text-foreground">{selectedPreset.name}</span>:
              </p>
            </div>

            {/* Timeframe selector buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {TIMELINE_OPTIONS.map((opt) => {
                const isSelected = opt.id === selectedTimelineId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedTimelineId(opt.id)}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                      isSelected
                        ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                        : "bg-muted/20 hover:bg-muted/40 border-border/70 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "font-semibold text-sm",
                          isSelected ? "text-foreground" : "text-foreground/80"
                        )}
                      >
                        {opt.label}
                      </span>
                      {opt.id === "active" && <CheckCircle2 className="w-4 h-4 text-success" />}
                      {opt.id === "soon" && <Clock className="w-4 h-4 text-warning" />}
                      {opt.id === "expired" && <AlertCircle className="w-4 h-4 text-destructive" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{opt.sublabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Interactive Item Card Preview */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all">
              <div
                className={cn(
                  "h-1.5 w-full transition-colors",
                  selectedTimeline.status === "expired"
                    ? "bg-destructive"
                    : selectedTimeline.status === "expiring_soon"
                    ? "bg-warning"
                    : "bg-success"
                )}
              />
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <PresetIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base text-foreground">
                      {selectedPreset.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium text-[11px]">
                        {selectedPreset.category}
                      </span>
                      <span>Expires: <strong className="text-foreground">{simulatedDateString}</strong></span>
                    </div>
                  </div>
                </div>

                <StatusBadge
                  status={selectedTimeline.status}
                  daysRemaining={selectedTimeline.daysOffset}
                />
              </div>

              <div className="px-4 py-3 bg-muted/20 border-t border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                <span className="font-medium text-foreground">What happens:</span>
                <span>{selectedTimeline.note}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Notice: you never have to manually update or calculate status. ExpiryOS recalculates urgency against the calendar every day.
            </p>
          </div>
        )}

        {/* Guided Step 3: Start tracking */}
        {currentStep === 2 && (
          <div className="py-6 space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground">
                You're ready to track
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
                Add your real documents, subscriptions, and policies. ExpiryOS keeps them safe and warns you before anything lapses.
              </p>
            </div>

            {/* Quick value cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span>Zero Manual Upkeep</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter the expiry date once. ExpiryOS tracks the days automatically.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span>Urgency Triage</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Overdue and upcoming items immediately rise to the top of your overview.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span>Private Sandbox</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No account needed. Your data is isolated to your private browser session.
                </p>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <Link href="/demo/items/new" className="block sm:inline-block">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 font-semibold shadow-xs gap-2 text-base">
                  <Plus className="w-5 h-5" />
                  <span>Add your first item</span>
                </Button>
              </Link>

              {/* Sample button hidden per user request */}
              {SHOW_SAMPLE_BUTTON && (
                <Button
                  variant="outline"
                  onClick={handleShowExamples}
                  disabled={resetSession.isPending}
                  className="mt-3 sm:mt-0 sm:ml-3"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Load sample items</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stepper Footer Controls */}
        <div className="pt-6 border-t border-border/60 flex items-center justify-between gap-4">
          <div>
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="gap-1.5 h-9 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 2 ? (
              <Button
                size="sm"
                onClick={() => setCurrentStep((s) => s + 1)}
                className="gap-1.5 h-9 font-semibold shadow-2xs"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground h-9"
              >
                Close tour
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}