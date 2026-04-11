import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import type { Sticky, StickyCategory } from '../types';
import { readStickies } from '../lib/tauri';
import { useProject } from './ProjectContext';

interface AnchorMapEntry {
  stickyId: string;
  categoryColor: string;
  text: string;
}

interface StickyContextValue {
  stickies: Sticky[];
  setStickies: (stickies: Sticky[]) => void;

  categories: StickyCategory[];

  categoryFilter: Map<string, boolean>;
  toggleCategoryFilter: (categoryId: string) => void;

  anchorMap: Map<string, AnchorMapEntry>;

  highlightSticky: (stickyId: string) => void;
  highlightedStickyId: string | null;

  anchorOpacities: Map<string, number>;
  setAnchorOpacities: (opacities: Map<string, number>) => void;

  badgesVisible: boolean;
  setBadgesVisible: (visible: boolean) => void;
}

const StickyContext = createContext<StickyContextValue | null>(null);

export function StickyProvider({ children }: { children: ReactNode }) {
  const { project, activeChapter } = useProject();

  const [stickies, setStickies] = useState<Sticky[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<Map<string, boolean>>(new Map());
  const [highlightedStickyId, setHighlightedStickyId] = useState<string | null>(null);
  const [anchorOpacities, setAnchorOpacities] = useState<Map<string, number>>(new Map());
  const [badgesVisible, setBadgesVisible] = useState(true);

  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive categories from project
  const categories: StickyCategory[] = useMemo(
    () => project?.stickyCategories ?? [],
    [project],
  );

  // Initialise filter map whenever categories change (new category → visible by default)
  useEffect(() => {
    setCategoryFilter(prev => {
      const next = new Map(prev);
      for (const cat of categories) {
        if (!next.has(cat.id)) {
          next.set(cat.id, true);
        }
      }
      return next;
    });
  }, [categories]);

  // Load stickies whenever the active chapter changes
  useEffect(() => {
    if (!project || !activeChapter) {
      setStickies([]);
      return;
    }
    readStickies(project.rootPath, activeChapter.filename)
      .then(setStickies)
      .catch(console.error);
  }, [project, activeChapter]);

  // Derived anchor map: anchorId → { stickyId, categoryColor, text }
  const anchorMap = useMemo<Map<string, AnchorMapEntry>>(() => {
    const map = new Map<string, AnchorMapEntry>();
    for (const sticky of stickies) {
      if (!sticky.anchorId) continue;
      const category = categories.find(c => c.id === sticky.categoryId);
      map.set(sticky.anchorId, {
        stickyId: sticky.id,
        categoryColor: category?.color ?? 'zinc',
        text: sticky.text,
      });
    }
    return map;
  }, [stickies, categories]);

  const toggleCategoryFilter = useCallback((categoryId: string) => {
    setCategoryFilter(prev => {
      const next = new Map(prev);
      next.set(categoryId, !next.get(categoryId));
      return next;
    });
  }, []);

  const highlightSticky = useCallback((stickyId: string) => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    setHighlightedStickyId(stickyId);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedStickyId(null);
      highlightTimerRef.current = null;
    }, 2000);
  }, []);

  return (
    <StickyContext.Provider
      value={{
        stickies,
        setStickies,
        categories,
        categoryFilter,
        toggleCategoryFilter,
        anchorMap,
        highlightSticky,
        highlightedStickyId,
        anchorOpacities,
        setAnchorOpacities,
        badgesVisible,
        setBadgesVisible,
      }}
    >
      {children}
    </StickyContext.Provider>
  );
}

export function useStickyContext() {
  const ctx = useContext(StickyContext);
  if (!ctx) throw new Error('useStickyContext must be used within StickyProvider');
  return ctx;
}
