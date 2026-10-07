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
              const isActive = location === item.href || (item.href !== "/demo" && location.startsWith(item.href));
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

        <div className="p-6 space-y-2">
          <button
            type="button"
            data-tally-open={TALLY_FORM_ID}
            data-tally-layout="modal"
            data-tally-width="540"
            data-tally-emoji-text="👋"
            data-tally-emoji-animation="wave"
            onClick={openTallyWaitlist}
            className="flex items-center gap-2 justify-center w-full h-9 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-border/80 hover:bg-muted/50 cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Early Access List</span>
          </button>
          <ThemeToggle showLabel className="w-full rounded-lg" />
          <Link
            href="/demo/items/new"
            className="flex items-center gap-2 justify-center w-full h-10 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-2xs hover:opacity-90 transition-opacity outline-none"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Item</span>
          </Link>
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
          const isActive = location === item.href || (item.href !== "/demo" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] h-full outline-none",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/demo/items/new"
          className={cn(
            "flex flex-col items-center justify-center gap-1 min-w-[64px] h-full outline-none",
            location === "/demo/items/new" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium">Add Item</span>
        </Link>
        <div className="flex flex-col items-center justify-center gap-1 min-w-[64px] h-full">
          <ThemeToggle />
          <span className="text-[10px] font-medium text-muted-foreground">Theme</span>
        </div>
      </nav>
    </div>
  );
}
