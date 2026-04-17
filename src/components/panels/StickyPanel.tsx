import { useState, useCallback, useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useStickyContext } from '../../contexts/StickyContext';
import { useProject } from '../../contexts/ProjectContext';
import { saveStickies } from '../../lib/tauri';
import type { Sticky, StickyCategory } from '../../types';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { categoryColorClasses } from '../../lib/categoryColors';

// --- AddStickyPopover ---

interface AddStickyPopoverProps {
  categories: StickyCategory[];
  onAdd: (categoryId: string, text: string) => void;
}

function AddStickyPopover({ categories, onAdd }: AddStickyPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [text, setText] = useState('');

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setSelectedCategoryId(categories[0]?.id ?? '');
      setText('');
    }
  }

  function handleCreate() {
    if (!text.trim() || !selectedCategoryId) return;
    onAdd(selectedCategoryId, text.trim());
    setText('');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 px-2 text-xs shrink-0">
          + Add
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 flex flex-col gap-2 p-3">
        {categories.length === 0 ? (
          <p className="text-xs text-zinc-500">No categories defined in project.json.</p>
        ) : (
          <>
            <p className="text-xs text-zinc-400 font-medium">Category</p>
            <div className="flex flex-wrap gap-1">
              {categories.map(cat => {
                const colors = categoryColorClasses(cat.color);
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors ${
                      isSelected
                        ? 'border-zinc-400 bg-zinc-700 text-zinc-100'
                        : 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Sticky note text…"
              className="min-h-[80px] text-xs bg-zinc-900 border-zinc-600 text-zinc-200 resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              disabled={!text.trim() || !selectedCategoryId}
              onClick={handleCreate}
            >
              Add Sticky
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// --- StickyCard ---

interface StickyCardProps {
  sticky: Sticky;
  category: StickyCategory | undefined;
  highlighted: boolean;
  opacity: number;
  onEdit: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
}

function StickyCard({ sticky, category, highlighted, opacity, onEdit, onDelete }: StickyCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(sticky.text);

  const color = category?.color ?? 'zinc';
  const colors = categoryColorClasses(color);
  const isUnattached = sticky.anchorId === null;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `sticky-${sticky.id}`,
    data: { type: 'sticky', stickyId: sticky.id } satisfies { type: 'sticky'; stickyId: string },
  });

  function startEdit() {
    setEditText(sticky.text);
    setEditing(true);
  }

  function commitEdit() {
    const trimmed = editText.trim();
    if (trimmed !== sticky.text) {
      onEdit(sticky.id, trimmed);
    }
    setEditing(false);
  }

  function cancelEdit() {
    setEditText(sticky.text);
    setEditing(false);
  }

  const cardClass = isUnattached
    ? 'mb-2 p-3 gap-0 ring-0 rounded-lg bg-zinc-800 border border-dashed border-zinc-600'
    : `mb-2 p-3 gap-0 ring-0 rounded-lg bg-zinc-800 border-l-4 ${colors.border}`;

  function handleCategoryClick() {
    if (isUnattached || !sticky.anchorId) return;
    const el = document.querySelector<HTMLElement>(`[data-anchor-id="${sticky.anchorId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <Card
      className={`group relative ${cardClass} ${highlighted ? 'outline outline-1 outline-zinc-400' : ''}`}
      style={{ opacity: isDragging ? 0.4 : opacity }}
      data-sticky-id={sticky.id}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div
          className={`flex items-center gap-1 text-xs ${colors.text} ${!isUnattached ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={handleCategoryClick}
          title={!isUnattached ? 'Jump to anchor in manuscript' : undefined}
        >
          {/* Drag handle — stopPropagation so it doesn't trigger nav click */}
          <span
            ref={setDragRef}
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 mr-0.5 select-none"
            title="Drag to anchor in manuscript"
            onClick={e => e.stopPropagation()}
          >
            ⠿
          </span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
          {category?.name ?? 'Unknown'}
        </div>
        <button
          onClick={() => onDelete(sticky.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 text-xs leading-none px-1"
          title="Delete sticky"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      {editing ? (
        <Textarea
          autoFocus
          value={editText}
          onChange={e => setEditText(e.target.value)}
          className="text-sm text-zinc-300 bg-zinc-900 border-zinc-600 min-h-[60px] resize-none"
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitEdit();
            } else if (e.key === 'Escape') {
              cancelEdit();
            }
          }}
        />
      ) : (
        <p
          className="text-sm text-zinc-300 cursor-text whitespace-pre-wrap"
          onClick={startEdit}
        >
          {sticky.text || <span className="text-zinc-500 italic">Empty note</span>}
        </p>
      )}

      {/* Footer row */}
      <div className="mt-2 flex justify-end">
        {isUnattached ? (
          <span className="text-xs text-zinc-600">○ Unattached</span>
        ) : (
          <span className="text-xs text-zinc-500">📌 Anchored</span>
        )}
      </div>
    </Card>
  );
}

// --- StickyPanel ---

export default function StickyPanel() {
  const {
    stickies,
    setStickies,
    categories,
    categoryFilter,
    toggleCategoryFilter,
    highlightedStickyId,
    anchorOpacities,
  } = useStickyContext();
  const { project, activeChapter } = useProject();

  // When an editor badge is clicked, scroll the panel to the highlighted card.
  useEffect(() => {
    if (!highlightedStickyId) return;
    const el = document.querySelector<HTMLElement>(`[data-sticky-id="${highlightedStickyId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlightedStickyId]);

  // As the editor scrolls, keep the most prominent (highest-opacity) anchored
  // sticky card visible in the panel.
  const prevMaxStickyIdRef = useRef<string | null>(null);
  useEffect(() => {
    let maxOpacity = -1;
    let maxAnchorId: string | null = null;
    anchorOpacities.forEach((opacity, anchorId) => {
      if (opacity > maxOpacity) {
        maxOpacity = opacity;
        maxAnchorId = anchorId;
      }
    });
    if (!maxAnchorId) return;

    const sticky = stickies.find(s => s.anchorId === maxAnchorId);
    if (!sticky) return;
    if (prevMaxStickyIdRef.current === sticky.id) return;
    prevMaxStickyIdRef.current = sticky.id;

    const el = document.querySelector<HTMLElement>(`[data-sticky-id="${sticky.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [anchorOpacities, stickies]);

  const persist = useCallback(
    (updated: Sticky[]) => {
      if (!project || !activeChapter) return;
      saveStickies(project.rootPath, activeChapter.filename, updated).catch(console.error);
    },
    [project, activeChapter],
  );

  function handleAdd(categoryId: string, text: string) {
    if (!activeChapter) return;
    const newSticky: Sticky = {
      id: crypto.randomUUID(),
      chapterId: activeChapter.filename,
      text,
      categoryId,
      anchorId: null,
      createdAt: new Date().toISOString(),
    };
    const updated = [...stickies, newSticky];
    setStickies(updated);
    persist(updated);
  }

  function handleEdit(id: string, newText: string) {
    const updated = stickies.map(s => (s.id === id ? { ...s, text: newText } : s));
    setStickies(updated);
    persist(updated);
  }

  function handleDelete(id: string) {
    const updated = stickies.filter(s => s.id !== id);
    setStickies(updated);
    persist(updated);
  }

  // Derive active filter values for ToggleGroup
  const activeFilterValues = categories
    .filter(cat => categoryFilter.get(cat.id) !== false)
    .map(cat => cat.id);

  function handleFilterChange(newValues: string[]) {
    const newSet = new Set(newValues);
    for (const cat of categories) {
      const isActive = categoryFilter.get(cat.id) !== false;
      const shouldBeActive = newSet.has(cat.id);
      if (isActive !== shouldBeActive) {
        toggleCategoryFilter(cat.id);
      }
    }
  }

  // Split stickies into anchored / unattached, respecting category filter
  const visibleCategoryIds = new Set(
    categories
      .filter(cat => categoryFilter.get(cat.id) !== false)
      .map(cat => cat.id),
  );

  // Sort anchored stickies by their position in the manuscript.
  // querySelectorAll returns elements in DOM (document) order, which matches
  // top-to-bottom anchor position in the visible editor layer.
  const anchorIdOrder = Array.from(
    document.querySelectorAll<HTMLElement>('[data-anchor-id]'),
  ).map(el => el.dataset.anchorId!);
  const anchorPositionMap = new Map(anchorIdOrder.map((id, i) => [id, i]));

  const anchored = stickies
    .filter(s => s.anchorId !== null && visibleCategoryIds.has(s.categoryId))
    .sort((a, b) => {
      const ai = anchorPositionMap.get(a.anchorId!) ?? Infinity;
      const bi = anchorPositionMap.get(b.anchorId!) ?? Infinity;
      return ai - bi;
    });
  const unattached = stickies.filter(
    s => s.anchorId === null && visibleCategoryIds.has(s.categoryId),
  );

  if (!activeChapter) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm px-4 text-center">
        Open a chapter to view sticky notes.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 px-3 py-2 border-b border-zinc-700 flex flex-wrap items-center gap-2">
        <AddStickyPopover categories={categories} onAdd={handleAdd} />
        {categories.length > 0 && (
          <ToggleGroup
            type="multiple"
            value={activeFilterValues}
            onValueChange={handleFilterChange}
            className="flex flex-wrap gap-1"
          >
            {categories.map(cat => {
              const colors = categoryColorClasses(cat.color);
              return (
                <ToggleGroupItem
                  key={cat.id}
                  value={cat.id}
                  className="flex items-center gap-1 h-5 px-2 text-xs rounded-full border border-zinc-600 bg-zinc-900 data-[state=on]:bg-zinc-700 data-[state=on]:border-zinc-500 data-[state=on]:text-zinc-200 text-zinc-400"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                  {cat.name}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        )}
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto p-3">
        {anchored.length === 0 && unattached.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center mt-8">
            No sticky notes yet.{'\u00a0'}Use "+ Add" to create one.
          </p>
        ) : (
          <>
            {anchored.map(sticky => {
              const cat = categories.find(c => c.id === sticky.categoryId);
              const opacity = sticky.anchorId
                ? (anchorOpacities.get(sticky.anchorId) ?? 1)
                : 1;
              return (
                <StickyCard
                  key={sticky.id}
                  sticky={sticky}
                  category={cat}
                  highlighted={highlightedStickyId === sticky.id}
                  opacity={opacity}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              );
            })}

            {unattached.length > 0 && (
              <>
                {anchored.length > 0 && (
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 border-t border-zinc-700" />
                    <span className="text-xs text-zinc-600">Unattached</span>
                    <div className="flex-1 border-t border-zinc-700" />
                  </div>
                )}
                {unattached.map(sticky => {
                  const cat = categories.find(c => c.id === sticky.categoryId);
                  return (
                    <StickyCard
                      key={sticky.id}
                      sticky={sticky}
                      category={cat}
                      highlighted={highlightedStickyId === sticky.id}
                      opacity={1}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
