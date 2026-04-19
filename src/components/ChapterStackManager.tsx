import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { readChapter, saveChapter, countProjectWords, updateDailyProgress } from '../lib/tauri';
import ChapterEditorLayer from './ChapterEditorLayer';
import type { Chapter } from '../types';
import { useWordCount, countWords } from '../contexts/WordCountContext';
import { useStickyContext } from '../contexts/StickyContext';
import { reconcileOrphans } from '../lib/stickyOrphans';
import { useStats } from '../contexts/StatsContext';

interface OpenChapter {
  chapter: Chapter;
  initialContent: string;
}

const DEBOUNCE_MS = 1000;

/**
 * Owns all open editor instances and all save logic.
 *
 * - Renders a stack of ChapterEditorLayer instances (one per open chapter).
 * - Only the active layer is visible; others stay mounted (display:none) so
 *   Lexical undo history survives chapter switches.
 * - latestContent and saveTimers are refs, not state, so they never trigger
 *   re-renders.
 * - A file overwrite caused by stale component state is architecturally
 *   impossible: latestContent.get(filename) and filename are always the same key.
 */
export default function ChapterStackManager() {
  const { project, activeChapter } = useProject();
  const { wordCounts, setWordCount, projectTotal, setProjectTotal } = useWordCount();
  const { reloadStickies } = useStickyContext();
  const { stats, setStats, markCelebrated } = useStats();

  const [openChapters, setOpenChapters] = useState<OpenChapter[]>([]);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [dirtyFilenames, setDirtyFilenames] = useState<Set<string>>(new Set());

  // Refs — must not trigger re-renders
  const loadingFilenames = useRef<Set<string>>(new Set());
  const latestContent = useRef<Map<string, string>>(new Map());
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // --- Save helpers ---

  const flush = useCallback(async (filename: string) => {
    if (!project) return;
    const content = latestContent.current.get(filename);
    if (content === undefined) return;
    try {
      await saveChapter(project.rootPath, filename, content);
      setDirtyFilenames(prev => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
      const total = await countProjectWords(project.rootPath);
      setProjectTotal(total);
      const prevDailyDelta = stats?.currentDay && projectTotal !== null
        ? projectTotal - stats.currentDay.startingWordCount
        : -1;
      const nextStats = await updateDailyProgress(project.rootPath, total);
      setStats(nextStats);
      const dailyGoal = project.goals?.dailyWordCount;
      if (dailyGoal && nextStats.currentDay) {
        const nextDelta = total - nextStats.currentDay.startingWordCount;
        if (prevDailyDelta < dailyGoal && nextDelta >= dailyGoal && !nextStats.currentDay.celebrated) {
          markCelebrated();
        }
      }
      const changed = await reconcileOrphans(project.rootPath, filename, content);
      if (changed) reloadStickies(filename);
    } catch (err) {
      console.error(`Failed to save chapter ${filename}:`, err);
    }
  }, [project, reloadStickies, projectTotal, setProjectTotal, stats, setStats, markCelebrated]);

  const scheduleFlush = useCallback((filename: string) => {
    const existing = saveTimers.current.get(filename);
    if (existing !== undefined) clearTimeout(existing);
    const timer = setTimeout(() => {
      saveTimers.current.delete(filename);
      flush(filename);
    }, DEBOUNCE_MS);
    saveTimers.current.set(filename, timer);
  }, [flush]);

  // --- Open a chapter ---

  const openChapter = useCallback(async (chapter: Chapter) => {
    if (!project) return;
    const { filename } = chapter;

    // Already active
    if (activeFilename === filename) return;

    // Already loaded — just switch visibility
    setOpenChapters(prev => {
      if (prev.some(oc => oc.chapter.filename === filename)) {
        setActiveFilename(filename);
        return prev;
      }
      return prev;
    });

    // Check without triggering re-render
    if (loadingFilenames.current.has(filename)) return;

    // Need to check if already in openChapters without depending on state inside async fn
    // We'll do the full load flow; the setOpenChapters above handles the already-loaded case
    loadingFilenames.current.add(filename);
    try {
      const content = await readChapter(project.rootPath, filename);
      await reconcileOrphans(project.rootPath, filename, content);
      latestContent.current.set(filename, content);
      setWordCount(filename, countWords(content));
      setOpenChapters(prev => {
        if (prev.some(oc => oc.chapter.filename === filename)) {
          // Was loaded while we were fetching — just switch
          setActiveFilename(filename);
          return prev;
        }
        setActiveFilename(filename);
        return [...prev, { chapter, initialContent: content }];
      });
    } catch (err) {
      console.error(`Failed to load chapter ${filename}:`, err);
    } finally {
      loadingFilenames.current.delete(filename);
    }
  }, [project, activeFilename]);

  // --- React to activeChapter changes from ProjectContext ---

  useEffect(() => {
    if (activeChapter) {
      openChapter(activeChapter);
    }
  }, [activeChapter]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Content change handler (called by each layer) ---

  const handleContentChange = useCallback((filename: string, markdown: string) => {
    latestContent.current.set(filename, markdown);
    setWordCount(filename, countWords(markdown));
    setDirtyFilenames(prev => {
      const next = new Set(prev);
      next.add(filename);
      return next;
    });
    scheduleFlush(filename);
  }, [scheduleFlush]);

  // --- Ctrl+S: immediate save of active chapter ---

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (!activeFilename) return;
      const timer = saveTimers.current.get(activeFilename);
      if (timer !== undefined) {
        clearTimeout(timer);
        saveTimers.current.delete(activeFilename);
      }
      flush(activeFilename);
    }
  }, [activeFilename, flush]);

  // --- Render ---

  if (openChapters.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
        Open a chapter to start writing.
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 flex flex-col"
      onKeyDown={handleKeyDown}
    >
      {/* Editor layers live in a flex-1 relative container so the status bar below is never covered */}
      <div className="flex-1 min-h-0 relative">
        {openChapters.map(({ chapter, initialContent }) => (
          <ChapterEditorLayer
            key={chapter.filename}
            chapter={chapter}
            initialContent={initialContent}
            visible={chapter.filename === activeFilename}
            onContentChange={(md) => handleContentChange(chapter.filename, md)}
          />
        ))}
        {/* Dirty indicator for active chapter */}
        {activeFilename && dirtyFilenames.has(activeFilename) && (
          <div className="absolute top-2 right-3 w-2 h-2 rounded-full bg-amber-400 opacity-70 pointer-events-none" title="Unsaved changes" />
        )}
      </div>
      {/* Status bar as a real flex child — never overlaps the editor or scrollbar */}
      <div className="h-6 flex-shrink-0 flex items-center justify-end px-4 bg-zinc-900 border-t border-zinc-800 pointer-events-none">
        <span className="text-xs text-zinc-600">
          {activeFilename != null ? `${wordCounts[activeFilename] ?? 0} words` : ''}
        </span>
      </div>
    </div>
  );
}
