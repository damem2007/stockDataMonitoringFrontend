"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
  cyclePreference: () => void;
};

const THEME_STORAGE_KEY = "stockSignalThemePreference";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme() {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function normalizePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = normalizePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
    setPreferenceState(stored);
    setResolvedTheme(stored === "system" ? systemTheme() : stored);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => setResolvedTheme(preference === "system" ? systemTheme() : preference);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [preference, resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const cyclePreference = useCallback(() => {
    setPreferenceState((current) => {
      const next: ThemePreference = current === "system" ? "light" : current === "light" ? "dark" : "system";
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference, cyclePreference }),
    [cyclePreference, preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
