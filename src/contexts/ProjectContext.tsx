import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Project, Chapter } from '../types';
import { listChapters } from '../lib/tauri';

interface ProjectContextValue {
  project: Project | null;
  chapters: Chapter[];
  activeChapter: Chapter | null;
  setProject: (project: Project | null) => void;
  setActiveChapter: (chapter: Chapter | null) => void;
  setChapters: (chapters: Chapter[]) => void;
  refreshChapters: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProjectState] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);

  const setProject = useCallback((p: Project | null) => {
    setProjectState(p);
    setChapters([]);
    setActiveChapter(null);
    if (p) {
      listChapters(p.rootPath).then(setChapters).catch(console.error);
    }
  }, []);

  const refreshChapters = useCallback(async () => {
    if (!project) return;
    const updated = await listChapters(project.rootPath);
    setChapters(updated);
  }, [project]);

  return (
    <ProjectContext.Provider
      value={{ project, chapters, activeChapter, setProject, setActiveChapter, setChapters, refreshChapters }}
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
