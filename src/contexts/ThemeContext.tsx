import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { ThemeManifest } from '../types';
import {
  listThemes,
  readThemeCss,
  getActiveTheme,
  setActiveTheme as persistActiveTheme,
} from '../lib/tauri';
import { injectThemeCss } from '../lib/themes';
import { useProject } from './ProjectContext';

interface ThemeContextValue {
  // Active theme folder name, or null for the built-in Default.
  activeTheme: string | null;
  // Manifests of themes installed under .weaver/themes/ (excludes Default).
  themes: ThemeManifest[];
  // Set when a theme's CSS could not be read (e.g. deleted out from under us);
  // the app falls back to Default and surfaces this message.
  error: string | null;
  setActiveTheme: (name: string | null) => Promise<void>;
  refreshThemes: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { project } = useProject();
  const projectPath = project?.rootPath ?? null;

  const [activeTheme, setActiveThemeState] = useState<string | null>(null);
  const [themes, setThemes] = useState<ThemeManifest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refreshThemes = useCallback(async () => {
    if (!projectPath) {
      setThemes([]);
      return;
    }
    try {
      setThemes(await listThemes(projectPath));
    } catch (e) {
      console.error('Failed to list themes:', e);
      setThemes([]);
    }
  }, [projectPath]);

  // Apply a theme by name (null = Default). Always re-reads CSS from disk so the
  // edit-CSS-then-reapply loop works; never short-circuits on name === activeTheme.
  const setActiveTheme = useCallback(
    async (name: string | null) => {
      if (!projectPath) return;
      await persistActiveTheme(projectPath, name);
      setActiveThemeState(name);

      if (name === null) {
        injectThemeCss(null);
        setError(null);
        return;
      }

      try {
        const css = await readThemeCss(projectPath, name);
        injectThemeCss(css);
        setError(null);
      } catch (e) {
        console.error('Failed to read theme CSS:', e);
        injectThemeCss(null);
        setError(`Could not load theme "${name}". Falling back to Default.`);
      }
    },
    [projectPath],
  );

  // On project change, load the installed themes and apply the persisted active
  // theme. Clears any previously injected CSS when no project is open.
  useEffect(() => {
    let cancelled = false;

    if (!projectPath) {
      injectThemeCss(null);
      setActiveThemeState(null);
      setThemes([]);
      setError(null);
      return;
    }

    (async () => {
      try {
        const list = await listThemes(projectPath);
        if (cancelled) return;
        setThemes(list);
      } catch (e) {
        console.error('Failed to list themes:', e);
        if (!cancelled) setThemes([]);
      }

      let name: string | null = null;
      try {
        name = await getActiveTheme(projectPath);
      } catch (e) {
        console.error('Failed to read active theme:', e);
      }
      if (cancelled) return;
      setActiveThemeState(name);

      if (name === null) {
        injectThemeCss(null);
        setError(null);
        return;
      }

      try {
        const css = await readThemeCss(projectPath, name);
        if (cancelled) return;
        injectThemeCss(css);
        setError(null);
      } catch (e) {
        console.error('Failed to read theme CSS:', e);
        if (cancelled) return;
        injectThemeCss(null);
        setError(`Could not load theme "${name}". Falling back to Default.`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  return (
    <ThemeContext.Provider value={{ activeTheme, themes, error, setActiveTheme, refreshThemes }}>
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
