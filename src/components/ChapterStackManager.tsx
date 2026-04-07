import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { readChapter, saveChapter } from '../lib/tauri';
import ChapterEditorLayer from './ChapterEditorLayer';
import type { Chapter } from '../types';

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
    } catch (err) {
      console.error(`Failed to save chapter ${filename}:`, err);
    }
  }, [project]);

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
      latestContent.current.set(filename, content);
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
  );
}
