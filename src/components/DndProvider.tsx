import { ReactNode } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDndContext,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useStickyContext } from '../contexts/StickyContext';
import { useProject } from '../contexts/ProjectContext';
import { reorderChapters } from '../lib/tauri';

// Explicit lookup table — Tailwind needs full class names to include them in the build
const OVERLAY_COLORS: Record<string, string> = {
  amber:   'bg-amber-400',
  blue:    'bg-blue-400',
  cyan:    'bg-cyan-400',
  emerald: 'bg-emerald-400',
  fuchsia: 'bg-fuchsia-400',
  green:   'bg-green-400',
  indigo:  'bg-indigo-400',
  orange:  'bg-orange-400',
  pink:    'bg-pink-400',
  purple:  'bg-purple-400',
  red:     'bg-red-400',
  rose:    'bg-rose-400',
  sky:     'bg-sky-400',
  teal:    'bg-teal-400',
  violet:  'bg-violet-400',
  yellow:  'bg-yellow-400',
  zinc:    'bg-zinc-400',
};

function colorDot(color: string) {
  return OVERLAY_COLORS[color] ?? 'bg-zinc-400';
}

/** Renders the floating ghost card while a drag is in progress. */
function DragOverlayContent() {
  const { active } = useDndContext();
  const { categories, stickies } = useStickyContext();
  const { chapters } = useProject();

  if (!active) return null;

  const data = active.data.current as { type?: string; stickyId?: string; anchorId?: string; categoryColor?: string; filename?: string } | undefined;
  if (!data) return null;

  if (data.type === 'chapter' && data.filename) {
    const chapter = chapters.find(c => c.filename === data.filename);
    return (
      <div
        style={{ pointerEvents: 'none' }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-600 bg-zinc-800 shadow-lg text-xs text-zinc-200 cursor-grabbing select-none"
      >
        <span className="w-2 h-2 rounded-full shrink-0 bg-zinc-400" />
        {chapter?.title ?? 'Chapter'}
      </div>
    );
  }

  let color = data.categoryColor ?? 'zinc';
  let label = 'Note';

  if (data.type === 'sticky' && data.stickyId) {
    const sticky = stickies.find(s => s.id === data.stickyId);
    if (sticky) {
      const cat = categories.find(c => c.id === sticky.categoryId);
      color = cat?.color ?? 'zinc';
      label = cat?.name ?? 'Note';
    }
  } else if (data.type === 'anchor-move' && data.anchorId) {
    const sticky = stickies.find(s => s.anchorId === data.anchorId);
    if (sticky) {
      const cat = categories.find(c => c.id === sticky.categoryId);
      color = cat?.color ?? 'zinc';
      label = cat?.name ?? 'Note';
    }
  }

  return (
    <div
      style={{ pointerEvents: 'none' }}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-600 bg-zinc-800 shadow-lg text-xs text-zinc-200 cursor-grabbing select-none`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${colorDot(color)}`} />
      {label}
    </div>
  );
}

/** Configures @dnd-kit/core for the Weaver layout. Must wrap both the StickyPanel and the Editor. */
export default function DndProvider({ children }: { children: ReactNode }) {
  const { project, chapters, setChapters, refreshChapters } = useProject();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const type = active.data.current?.type as string | undefined;
    if (type !== 'chapter') return;

    if (!project) return;

    const oldIndex = chapters.findIndex(c => c.filename === active.id);
    const newIndex = chapters.findIndex(c => c.filename === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(chapters, oldIndex, newIndex);
    setChapters(reordered);

    try {
      await reorderChapters(project.rootPath, reordered.map(c => c.filename));
    } catch (err) {
      console.error('reorderChapters failed:', err);
      await refreshChapters();
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay dropAnimation={null} style={{ pointerEvents: 'none' }}>
        <DragOverlayContent />
      </DragOverlay>
    </DndContext>
  );
}
