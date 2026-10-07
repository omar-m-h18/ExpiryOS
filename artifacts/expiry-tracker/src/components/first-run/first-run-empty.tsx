import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useResetSession } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  CalendarCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RotateCcw,
  FileText,
  Shield,
  Globe,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "expiryos_tutorial_skipped";

interface PresetItem {
  id: string;
  title: string;
  category: string;
  icon: typeof FileText;
  daysRemaining: number;
  status: "active" | "expiring_soon" | "expired";
  formattedDate: string;
  description: string;
}

const PRESET_ITEMS: PresetItem[] = [
  {
    id: "passport",
    title: "Passport Renewal",
    category: "Documents",
    icon: FileText,
    daysRemaining: 184,
    status: "active",
    formattedDate: "Oct 15, 2027",
    description: "Important document renewals tracked years in advance.",
  },
  {
    id: "insurance",
    title: "Car Insurance Policy",
    category: "Insurance",
    icon: Shield,
    daysRemaining: 14,
    status: "expiring_soon",
    formattedDate: "Oct 22, 2026",
    description: "Urgent renewal warning triggers 30 days before expiry.",
  },
  {
    id: "domain",
    title: "mydomain.com",
    category: "Software",
    icon: Globe,
    daysRemaining: -3,
    status: "expired",
    formattedDate: "Oct 5, 2026",
    description: "Overdue items bubble to the top of your overview triage.",
  },
  {
    id: "streaming",
    title: "Streaming Subscription",
    category: "Subscriptions",
    icon: Tv,
    daysRemaining: 28,
    status: "expiring_soon",
    formattedDate: "Nov 5, 2026",
    description: "Recurring subscriptions flag in advance to avoid auto-charges.",
  },
];

const STATUS_EXPLANATIONS = [
  {
    status: "active" as const,
    label: "Active",
    subtitle: "> 30 days remaining",
    description: "Items that are safe and far from renewal stay neatly organized in your active inventory.",
    days: 120,
    badgeVariant: "success",
  },
  {
    status: "expiring_soon" as const,
    label: "Expiring Soon",
    subtitle: "≤ 30 days remaining",
    description: "Items nearing their renewal date are automatically flagged in warning amber so you have time to act.",
    days: 12,
    badgeVariant: "warning",
  },
  {
    status: "expired" as const,
    label: "Expired",
    subtitle: "Past expiration date",
    description: "Overdue items are immediately prioritized with high urgency so nothing slips past unnoticed.",
    days: -4,
    badgeVariant: "destructive",
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
  const [selectedPreset, setSelectedPreset] = useState<string>("passport");
  const [selectedStatusTab, setSelectedStatusTab] = useState<"active" | "expiring_soon" | "expired">("expiring_soon");

  const activePreset = PRESET_ITEMS.find((p) => p.id === selectedPreset) ?? PRESET_ITEMS[0];
  const activeStatusInfo = STATUS_EXPLANATIONS.find((s) => s.status === selectedStatusTab) ?? STATUS_EXPLANATIONS[1];

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

  // If the user skipped the interactive walkthrough, render the clean empty state
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
                <Button size="lg" className="h-11 px-6 font-semibold shadow-2xs">
                  Add your first item
                </Button>
              </Link>
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
            </div>

            <div className="mt-8 pt-6 border-t border-border/60">
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Show interactive tour</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/80 shadow-xs overflow-hidden">
      <CardContent className="p-6 sm:p-10">
        {/* Header with step pill & skip button */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              {currentStep + 1}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              Step {currentStep + 1} of 3: {
                currentStep === 0
                  ? "Track Anything"
                  : currentStep === 1
                  ? "Automated Calculation"
                  : "Start Tracking"
              }
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 gap-1.5 cursor-pointer"
          >
            <span>Skip tutorial</span>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Step Content */}
        <div className="py-6 min-h-[300px] flex flex-col justify-between">
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground">
                  Track anything with an expiration date
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xl leading-relaxed">
                  Passports, vehicle registrations, SaaS subscriptions, or warranties. Click an example below to see how it looks:
                </p>
              </div>

              {/* Preset Selector Chips */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {PRESET_ITEMS.map((item) => {
                  const isSelected = item.id === selectedPreset;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPreset(item.id)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs scale-[1.02]"
                          : "bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border-border/80"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Live Interactive Preview Card */}
              <div className="p-4 sm:p-5 rounded-xl border border-border/80 bg-muted/20 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <activePreset.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-foreground tracking-tight">
                        {activePreset.title}
                      </h4>
                      <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/50 mt-0.5">
                        {activePreset.category}
                      </span>
                    </div>
                  </div>

                  <StatusBadge status={activePreset.status} daysRemaining={activePreset.daysRemaining} />
                </div>

                <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div>
                    Expiration Date: <span className="font-semibold text-foreground">{activePreset.formattedDate}</span>
                  </div>
                  <div className="italic text-foreground/80">{activePreset.description}</div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground">
                  Statuses compute automatically — never stale
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xl leading-relaxed">
                  You never manually mark an item as expired. ExpiryOS recalculates urgency against the calendar daily:
                </p>
              </div>

              {/* Status Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {STATUS_EXPLANATIONS.map((tab) => {
                  const isSelected = tab.status === selectedStatusTab;
                  return (
                    <button
                      key={tab.status}
                      type="button"
                      onClick={() => setSelectedStatusTab(tab.status)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                        isSelected
                          ? "bg-card border-primary/50 shadow-xs ring-1 ring-primary/20"
                          : "bg-muted/20 hover:bg-muted/40 border-border/60 text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">{tab.label}</span>
                        {tab.status === "active" && <CheckCircle2 className="w-4 h-4 text-success" />}
                        {tab.status === "expiring_soon" && <Clock className="w-4 h-4 text-warning" />}
                        {tab.status === "expired" && <AlertCircle className="w-4 h-4 text-destructive" />}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{tab.subtitle}</span>
                    </button>
                  );
                })}
              </div>

              {/* Status Explanation Card */}
              <div className="p-4 sm:p-5 rounded-xl border border-border/80 bg-muted/20 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Computed Status:
                  </span>
                  <StatusBadge status={activeStatusInfo.status} daysRemaining={activeStatusInfo.days} />
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {activeStatusInfo.description}
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground">
                  Ready to explore?
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xl leading-relaxed">
                  You can jump right in and add your first real item, or populate 4 sample items to explore all views and filtering.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-base text-foreground">Start fresh</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Create your first item right away. Clean workspace ready for your documents and renewals.
                    </p>
                  </div>
                  <Link href="/demo/items/new" className="w-full">
                    <Button className="w-full font-semibold shadow-2xs">
                      Add your first item
                    </Button>
                  </Link>
                </div>

                <div className="p-5 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-foreground font-semibold text-base">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h4>Load sample items</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Loads 4 sample items (Passport, Insurance, Domain, Netflix) so you can test search and triage.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleShowExamples}
                    disabled={resetSession.isPending}
                    className="w-full font-semibold gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    {resetSession.isPending ? "Adding examples..." : "Load 4 sample items"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stepper Footer Controls */}
        <div className="pt-6 border-t border-border/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((stepIdx) => (
              <button
                key={stepIdx}
                type="button"
                onClick={() => setCurrentStep(stepIdx)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all cursor-pointer",
                  stepIdx === currentStep
                    ? "w-7 bg-primary rounded-full"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to step ${stepIdx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
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
                Finish tour
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}