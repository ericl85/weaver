import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import type { Stats } from '../types';
import { markCelebrated as markCelebratedTauri, updateDailyProgress } from '../lib/tauri';
import { useProject } from './ProjectContext';
import { useWordCount } from './WordCountContext';

interface StatsContextValue {
  stats: Stats | null;
  setStats: (s: Stats) => void;
  markCelebrated: () => Promise<void>;
  celebrationTick: number;
  progressDismissed: boolean;
  setProgressDismissed: (v: boolean) => void;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [celebrationTick, setCelebrationTick] = useState(0);
  const [progressDismissed, setProgressDismissed] = useState(false);
  const { project } = useProject();
  const { projectTotal } = useWordCount();
  const seededForProject = useRef<string | null>(null);

  // Seed stats once per project open, after projectTotal resolves from disk.
  // The effect depends on projectTotal so it retries when the word count arrives,
  // but the ref prevents re-seeding on subsequent saves.
  useEffect(() => {
    if (!project || projectTotal === null) return;
    if (seededForProject.current === project.rootPath) return;
    seededForProject.current = project.rootPath;
    setProgressDismissed(false);
    updateDailyProgress(project.rootPath, projectTotal)
      .then(setStats)
      .catch(console.error);
  }, [project, projectTotal]);

  const markCelebrated = useCallback(async () => {
    if (!project) return;
    const updated = await markCelebratedTauri(project.rootPath);
    setStats(updated);
    setCelebrationTick(t => t + 1);
  }, [project]);

  return (
    <StatsContext.Provider value={{ stats, setStats, markCelebrated, celebrationTick, progressDismissed, setProgressDismissed }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be used within StatsProvider');
  return ctx;
}
