import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Settings {
  autoSave: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  autoSave: true,
};

const STORAGE_KEY = 'weaver_settings';

interface SettingsContextValue {
  settings: Settings;
  setSettings: (settings: Settings) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const setSettings = (s: Settings) => {
    setSettingsState(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // ignore
    }
  };

  // Keep localStorage in sync on mount (handles first load)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export { SettingsContext };
export type { Settings };
