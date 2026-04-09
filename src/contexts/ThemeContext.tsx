import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Theme } from '../types';
import { DEFAULT_THEME, applyTheme } from '../lib/themes';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  };

  // Apply default theme on mount
  useEffect(() => {
    applyTheme(DEFAULT_THEME);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export { ThemeContext };
export type { ThemeContextValue };
