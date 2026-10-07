import { Link, useLocation } from "wouter";
import { LayoutDashboard, List, PlusCircle, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { DemoBanner } from "@/components/demo-banner";
import { TALLY_FORM_ID, openTallyWaitlist } from "@/lib/tally";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/demo", label: "Dashboard", icon: LayoutDashboard },
    { href: "/demo/items", label: "All Items", icon: List },
    { href: "/demo/items/new", label: "Add Item", icon: PlusCircle },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar (Desktop) */}
      <nav className="hidden md:flex border-r border-border bg-sidebar shrink-0 w-64 flex-col justify-between">
        <div className="p-6">
          <Link href="/demo" className="flex items-center gap-2.5 mb-8 no-underline group outline-none">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold shadow-sm">
              E
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
              ExpiryOS
            </span>
          </Link>

          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/demo"
                  ? location === "/demo"
                  : item.href === "/demo/items"
                  ? location === "/demo/items"
                  : location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors outline-none",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer with Elevated Early Access Card and Theme Toggle */}
        <div className="p-4 space-y-3">
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>Automated Alerts</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Get email & WhatsApp reminders before renewals expire when cloud sync launches.
            </p>
            <button
              type="button"
              data-tally-open={TALLY_FORM_ID}
              data-tally-layout="modal"
              data-tally-width="540"
              data-tally-emoji-text="👋"
              data-tally-emoji-animation="wave"
              onClick={openTallyWaitlist}
              className="w-full h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Join Waitlist</span>
            </button>
          </div>

          <ThemeToggle showLabel className="w-full rounded-lg" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto p-5 sm:p-6 md:p-8 lg:p-10">
          <DemoBanner />
          {children}
        </div>
      </main>

      {/* Bottom Tab Bar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-border flex items-center justify-around z-50 px-2 pb-[env(safe-area-inset-bottom)] h-16">
        {navItems.map((item) => {
          const isActive =
            item.href === "/demo"
              ? location === "/demo"
              : item.href === "/demo/items"
              ? location === "/demo/items"
              : location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[56px] h-full outline-none",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          data-tally-open={TALLY_FORM_ID}
          data-tally-layout="modal"
          data-tally-width="540"
          data-tally-emoji-text="👋"
          data-tally-emoji-animation="wave"
          onClick={openTallyWaitlist}
          className="flex flex-col items-center justify-center gap-1 min-w-[56px] h-full text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-[10px] font-medium">Waitlist</span>
        </button>
        <div className="flex flex-col items-center justify-center gap-1 min-w-[56px] h-full">
          <ThemeToggle />
          <span className="text-[10px] font-medium text-muted-foreground">Theme</span>
        </div>
      </nav>
    </div>
  );
}
