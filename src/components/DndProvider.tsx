import { ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDndContext,
} from '@dnd-kit/core';
import { useStickyContext } from '../contexts/StickyContext';

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

  if (!active) return null;

  const data = active.data.current as { type?: string; stickyId?: string; anchorId?: string; categoryColor?: string } | undefined;
  if (!data) return null;

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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  return (
    <DndContext sensors={sensors}>
      {children}
      <DragOverlay dropAnimation={null} style={{ pointerEvents: 'none' }}>
        <DragOverlayContent />
      </DragOverlay>
    </DndContext>
  );
}
