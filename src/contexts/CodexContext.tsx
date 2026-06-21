import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { CodexEntry } from '../types';

interface CodexContextValue {
  /** The codex entry whose profile is open in the center pane, or null. */
  activeCodexEntry: CodexEntry | null;
  /** Open a codex entry's profile in the center pane (or null to close it). */
  openCodexEntry: (entry: CodexEntry | null) => void;
}

const CodexContext = createContext<CodexContextValue | null>(null);

/**
 * Holds which codex entry's profile (if any) currently owns the center pane.
 * The codex navigator (sidebar) sets it; AppShell reads it to route the center
 * pane to the CodexProfile, and the right tool-sidebar reads it to yield.
 */
export function CodexProvider({ children }: { children: ReactNode }) {
  const [activeCodexEntry, setActiveCodexEntry] = useState<CodexEntry | null>(null);
  const openCodexEntry = useCallback((entry: CodexEntry | null) => {
    setActiveCodexEntry(entry);
  }, []);

  return (
    <CodexContext.Provider value={{ activeCodexEntry, openCodexEntry }}>
      {children}
    </CodexContext.Provider>
  );
}

export function useCodex() {
  const ctx = useContext(CodexContext);
  if (!ctx) throw new Error('useCodex must be used within CodexProvider');
  return ctx;
}
