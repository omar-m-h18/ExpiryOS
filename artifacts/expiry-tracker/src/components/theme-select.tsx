import { Monitor, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ThemeSelectProps {
  className?: string;
}

/**
 * A three-way theme selector: System (follow device), Light, or Dark.
 *
 * Uses the codebase's existing shadcn/ui Radix select so it looks native to
 * the rest of the app and works in both light and dark.
 */
export function ThemeSelect({ className }: ThemeSelectProps) {
  const { mode, setMode } = useTheme();

  return (
    <Select value={mode} onValueChange={(next) => setMode(next as "light" | "dark" | "system")}>
      <SelectTrigger className={cn("w-40 gap-2", className)} aria-label="Theme preference">
        <span className="sr-only">Theme</span>
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="system">
          <span className="flex items-center gap-2">
            <MonitorCog className="w-4 h-4" aria-hidden="true" />
            System
          </span>
        </SelectItem>
        <SelectItem value="light">
          <span className="flex items-center gap-2">
            <Sun className="w-4 h-4" aria-hidden="true" />
            Light
          </span>
        </SelectItem>
        <SelectItem value="dark">
          <span className="flex items-center gap-2">
            <Moon className="w-4 h-4" aria-hidden="true" />
            Dark
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export default ThemeSelect;