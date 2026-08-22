import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Theme preferences.
 *
 * `mode` is what the user chose: always apply light, always apply dark, or
 * follow the operating system's preference ("system"). `resolvedTheme` is the
 * actual theme currently applied to the document, factoring in system
 * preference when mode is "system".
 */
type Theme = "light" | "dark";
type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  /** User choice ("system" = follow device). */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** The theme actually applied after resolving system preference. */
  resolvedTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MODE_KEY = "expiry-os-theme-mode";

/** Only resolve a stored/supported mode; anything else falls back to "system". */
function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

/** Read the device/system color preference. */
function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/** Resolve a chosen mode into an actual applied theme. */
function resolveTheme(mode: ThemeMode): Theme {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return systemPrefersDark() ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem(MODE_KEY);
    return isThemeMode(stored) ? stored : "system";
  });

  const resolvedTheme = resolveTheme(mode);

  // Apply the resolved theme to the document root + persist the mode.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    localStorage.setItem(MODE_KEY, mode);
  }, [mode, resolvedTheme]);

  // Only re-resolve the applied theme when following system; an explicit
  // choice must not be overridden when the OS theme changes.
  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(e.matches ? "dark" : "light");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [mode]);

  const setMode = (next: ThemeMode) => setModeState(next);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
