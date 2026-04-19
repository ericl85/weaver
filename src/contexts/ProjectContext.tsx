import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Project, Chapter } from '../types';
import { listChapters, updateGoals as updateGoalsTauri, countProjectWords } from '../lib/tauri';
import type { Goals } from '../types';
import { useWordCount } from './WordCountContext';

interface ProjectContextValue {
  project: Project | null;
  chapters: Chapter[];
  activeChapter: Chapter | null;
  setProject: (project: Project | null) => void;
  setActiveChapter: (chapter: Chapter | null) => void;
  setChapters: (chapters: Chapter[]) => void;
  refreshChapters: () => Promise<void>;
  updateProjectState: (partial: Partial<Project>) => void;
  updateGoals: (goals: Goals) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProjectState] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const { setProjectTotal } = useWordCount();

  const setProject = useCallback((p: Project | null) => {
    setProjectState(p);
    setChapters([]);
    setActiveChapter(null);
    if (p) {
      listChapters(p.rootPath).then(setChapters).catch(console.error);
      countProjectWords(p.rootPath).then(setProjectTotal).catch(console.error);
    }
  }, [setProjectTotal]);

  const refreshChapters = useCallback(async () => {
    if (!project) return;
    const updated = await listChapters(project.rootPath);
    setChapters(updated);
  }, [project]);

  const updateProjectState = useCallback((partial: Partial<Project>) => {
    setProjectState(prev => prev ? { ...prev, ...partial } : prev);
  }, []);

  const updateGoals = useCallback(async (goals: Goals) => {
    if (!project) return;
    const updated = await updateGoalsTauri(project.rootPath, goals);
    setProjectState(prev => prev ? { ...prev, goals: updated.goals } : prev);
  }, [project]);

  return (
    <ProjectContext.Provider
      value={{ project, chapters, activeChapter, setProject, setActiveChapter, setChapters, refreshChapters, updateProjectState, updateGoals }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
