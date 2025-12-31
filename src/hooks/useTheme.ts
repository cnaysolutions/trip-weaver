import { useState, useEffect } from "react";

type Theme = "light" | "dark";
type Mode = "planning" | "results";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  const [mode, setMode] = useState<Mode>("planning");

  useEffect(() => {
    localStorage.setItem("theme", theme);

    const body = document.body;
    const html = document.documentElement;

    // Clear old classes
    body.classList.remove("theme-light", "theme-dark", "mode-planning", "mode-results");

    // Apply current state to BODY (CRITICAL)
    body.classList.add(`theme-${theme}`, `mode-${mode}`);

    // Keep Tailwind dark mode working
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [theme, mode]);

  return {
    theme,
    mode,
    toggleTheme: () => setTheme((prev) => (prev === "light" ? "dark" : "light")),
    setResultsMode: () => setMode("results"),
    setPlanningMode: () => setMode("planning"),

    // Still useful for components if needed
    themeClass: `theme-${theme}`,
    modeClass: `mode-${mode}`,
  };
}
