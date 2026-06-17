import { createContext, useContext, ReactNode } from 'react';

// Minimal shell — full theming (CSS injection, theme picker) lands in #7/#34.
// The active theme name is held here; applying it (injecting theme.css) is #34's job.

interface ThemeContextValue {
  activeThemeName: string | null;
}

const ThemeContext = createContext<ThemeContextValue>({ activeThemeName: null });

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ activeThemeName: null }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { ThemeContext };
export type { ThemeContextValue };
