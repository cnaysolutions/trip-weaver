import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';
type Mode = 'planning' | 'results';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check for stored preference or system preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme | null;
      if (stored) return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [mode, setMode] = useState<Mode>('planning');

  useEffect(() => {
    // Store theme preference
    localStorage.setItem('theme', theme);
    
    // Update document class for dark mode CSS variables
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setResultsMode = () => setMode('results');
  const setPlanningMode = () => setMode('planning');

  return {
    theme,
    mode,
    toggleTheme,
    setTheme,
    setMode,
    setResultsMode,
    setPlanningMode,
    themeClass: `theme-${theme}`,
    modeClass: `mode-${mode}`,
  };
}
