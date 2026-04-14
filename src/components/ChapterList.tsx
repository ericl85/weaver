import { useState, useEffect, useRef } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useWordCount } from '../contexts/WordCountContext';
import type { Chapter, CodexEntry } from '../types';
import {
  createChapter,
  renameChapter,
  deleteChapter,
  listCodex,
} from '../lib/tauri';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface Props {
  onChapterClick?: () => void;
}

interface SortableChapterItemProps {
  chapter: Chapter;
  isActive: boolean;
  isRenaming: boolean;
  wordCount: number | undefined;
  renameValue: string;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: () => void;
  onStartRename: () => void;
  onRenameChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onDeleteRequest: () => void;
}

function SortableChapterItem({
  chapter,
  isActive,
  isRenaming,
  wordCount,
  renameValue,
  renameInputRef,
  onSelect,
  onStartRename,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onDeleteRequest,
}: SortableChapterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: chapter.filename,
    data: { type: 'chapter', filename: chapter.filename },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? 'opacity-40' : ''}`}
    >
      {isRenaming ? (
        <form
          onSubmit={(e) => { e.preventDefault(); onRenameSubmit(); }}
          className="px-3 py-1"
        >
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={onRenameSubmit}
            onKeyDown={(e) => { if (e.key === 'Escape') onRenameCancel(); }}
            className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-0.5 text-sm text-zinc-100 focus:outline-none"
          />
        </form>
      ) : (
        <button
          onClick={onSelect}
          className={`w-full text-left px-3 py-1.5 text-sm truncate pr-20 ${
            isActive
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100'
          }`}
        >
          {chapter.title}
        </button>
      )}

      {/* Word count (hidden on hover) */}
      {!isRenaming && wordCount !== undefined && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex group-hover:hidden">
          <span className="text-zinc-600 text-xs">{wordCount}</span>
        </div>
      )}

      {/* Action icons (visible on hover) */}
      {!isRenaming && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1">
          <button
            {...attributes}
            {...listeners}
            title="Drag to reorder"
            className="text-zinc-500 hover:text-zinc-200 text-xs px-0.5 cursor-grab active:cursor-grabbing"
          >
            ⠿
          </button>
          <button
            onClick={onStartRename}
            title="Rename"
            className="text-zinc-500 hover:text-zinc-200 text-xs px-0.5"
          >
            ✎
          </button>
          <button
            onClick={onDeleteRequest}
            title="Delete"
            className="text-zinc-500 hover:text-red-400 text-xs px-0.5"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}

export default function ChapterList({ onChapterClick }: Props) {
  const { project, chapters, activeChapter, setActiveChapter, refreshChapters } = useProject();
  const { wordCounts } = useWordCount();

  const [codexEntries, setCodexEntries] = useState<CodexEntry[]>([]);
  const [codexOpen, setCodexOpen] = useState(false);

  const [creatingNew, setCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const [renamingFilename, setRenamingFilename] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [pendingDelete, setPendingDelete] = useState<Chapter | null>(null);

  const newInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingNew) newInputRef.current?.focus();
  }, [creatingNew]);

  useEffect(() => {
    if (renamingFilename) renameInputRef.current?.focus();
  }, [renamingFilename]);

  useEffect(() => {
    if (!project) return;
    listCodex(project.rootPath).then(setCodexEntries).catch(console.error);
  }, [project]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !newTitle.trim()) return;
    try {
      const chapter = await createChapter(project.rootPath, newTitle.trim());
      await refreshChapters();
      setActiveChapter(chapter);
      onChapterClick?.();
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingNew(false);
      setNewTitle('');
    }
  }

  async function handleRename(filename: string) {
    if (!project || !renameValue.trim()) {
      setRenamingFilename(null);
      return;
    }
    try {
      const chapter = await renameChapter(project.rootPath, filename, renameValue.trim());
      await refreshChapters();
      if (activeChapter?.filename === filename) setActiveChapter(chapter);
    } catch (err) {
      console.error(err);
    } finally {
      setRenamingFilename(null);
      setRenameValue('');
    }
  }

  async function confirmDelete() {
    if (!project || !pendingDelete) return;
    const filename = pendingDelete.filename;
    try {
      await deleteChapter(project.rootPath, filename);
      if (activeChapter?.filename === filename) setActiveChapter(null);
      await refreshChapters();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingDelete(null);
    }
  }

  const codexByCategory = codexEntries.reduce<Record<string, CodexEntry[]>>((acc, entry) => {
    (acc[entry.category] ??= []).push(entry);
    return acc;
  }, {});

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      {/* Chapters header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chapters</span>
        <button
          onClick={() => { setCreatingNew(true); setNewTitle(''); }}
          title="New chapter"
          className="text-zinc-400 hover:text-zinc-100 text-lg leading-none px-1"
        >
          +
        </button>
      </div>

      {/* Chapter list */}
      <SortableContext
        items={chapters.map(c => c.filename)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col">
          {chapters.map((chapter) => (
            <SortableChapterItem
              key={chapter.filename}
              chapter={chapter}
              isActive={activeChapter?.filename === chapter.filename}
              isRenaming={renamingFilename === chapter.filename}
              wordCount={wordCounts[chapter.filename]}
              renameValue={renameValue}
              renameInputRef={renameInputRef}
              onSelect={() => { setActiveChapter(chapter); onChapterClick?.(); }}
              onStartRename={() => { setRenamingFilename(chapter.filename); setRenameValue(chapter.title); }}
              onRenameChange={setRenameValue}
              onRenameSubmit={() => handleRename(chapter.filename)}
              onRenameCancel={() => { setRenamingFilename(null); setRenameValue(''); }}
              onDeleteRequest={() => setPendingDelete(chapter)}
            />
          ))}
        </ul>
      </SortableContext>

      {/* New chapter input */}
      {creatingNew && (
        <form onSubmit={handleCreate} className="px-3 py-1">
          <input
            ref={newInputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={() => { if (!newTitle.trim()) { setCreatingNew(false); } }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setCreatingNew(false); setNewTitle(''); } }}
            placeholder="Chapter title…"
            className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-0.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
        </form>
      )}

      {/* Codex section */}
      {codexEntries.length > 0 && (
        <div className="mt-3 border-t border-zinc-700">
          <button
            onClick={() => setCodexOpen((o) => !o)}
            className="flex items-center gap-1 w-full px-3 pt-3 pb-1 text-left"
          >
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Codex</span>
            <span className="text-zinc-500 text-xs ml-auto">{codexOpen ? '▴' : '▾'}</span>
          </button>

          {codexOpen && (
            <ul className="flex flex-col">
              {Object.entries(codexByCategory).map(([category, entries]) => (
                <li key={category}>
                  <div className="px-3 py-1 text-xs text-zinc-500 capitalize">{category}</div>
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="px-5 py-1 text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer truncate"
                    >
                      {entry.title}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chapter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-semibold text-zinc-100">{pendingDelete?.title}</span>{' '}
              and its stickies. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
