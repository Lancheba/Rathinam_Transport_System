import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** What the person picked. "system" follows the operating system setting. */
export type ThemePreference = "light" | "dark" | "system";
/** What is actually on screen. */
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
  /** Flip between light and dark (leaves "system" mode and pins the opposite of what is showing) */
  toggleTheme: () => void;
}

const STORAGE_KEY = "rsbp-theme";
const DARK_HEX = "#080808";
const LIGHT_HEX = "#eef2f9";

const systemQuery = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: light)")
    : null;

const readPreference = (): ThemePreference => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage can be blocked (private mode); fall back to following the system */
  }
  return "system";
};

const systemTheme = (): ResolvedTheme => (systemQuery()?.matches ? "light" : "dark");

const ThemeContext = createContext<ThemeContextType>({
  preference: "system",
  theme: "dark",
  setPreference: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);

  // Follow the OS while the preference is "system"
  useEffect(() => {
    const mq = systemQuery();
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? "light" : "dark");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const theme: ResolvedTheme = preference === "system" ? system : preference;

  // Apply to the document so every CSS variable in index.css switches at once
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? LIGHT_HEX : DARK_HEX);
  }, [theme]);

  // Keep several open tabs in step
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPreferenceState(readPreference());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* not persisted, still applied for this session */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [theme, setPreference]);

  const value = useMemo(
    () => ({ preference, theme, setPreference, toggleTheme }),
    [preference, theme, setPreference, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
