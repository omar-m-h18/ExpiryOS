import { Link, useLocation } from "wouter";
import { LayoutDashboard, List, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/items", label: "All Items", icon: List },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar (Desktop) / Topbar (Mobile) */}
      <nav className="border-r border-border bg-sidebar shrink-0 md:w-64 flex flex-col justify-between">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 mb-8 no-underline group outline-none">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
              E
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
              ExpiryTracker
            </span>
          </Link>

          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors outline-none",
                    isActive
                      ? "bg-secondary text-secondary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          <Link
            href="/items/new"
            className="flex items-center gap-2 justify-center w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium shadow-sm hover:opacity-90 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Item</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
