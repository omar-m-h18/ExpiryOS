import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Light" : "Dark";

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center gap-2 rounded-md transition-colors outline-none",
        showLabel ? "px-3 py-2 text-sm font-medium w-full" : "justify-center w-9 h-9",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      {showLabel && <span>{label}</span>}
    </button>
  );
}
