import { useState, useRef, useEffect } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { addCategory, updateCategory, deleteCategory } from '../../lib/tauri';
import { COLOR_MAP, CATEGORY_COLOR_NAMES, categoryColorClasses } from '../../lib/categoryColors';
import type { StickyCategory } from '../../types';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

// --- Color swatch popover ---

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const colors = categoryColorClasses(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-5 h-5 rounded border border-zinc-600 shrink-0 hover:border-zinc-400 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400"
          style={{}}
          title="Change color"
        >
          <span className={`block w-full h-full rounded ${colors.dot}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2 flex flex-wrap gap-1.5">
        {CATEGORY_COLOR_NAMES.map(name => {
          const c = COLOR_MAP[name];
          const isSelected = name === value;
          return (
            <button
              key={name}
              onClick={() => { onChange(name); setOpen(false); }}
              className={`w-5 h-5 rounded border transition-colors focus:outline-none ${
                isSelected
                  ? 'border-zinc-300 ring-1 ring-zinc-300'
                  : 'border-zinc-600 hover:border-zinc-400'
              }`}
              title={name}
            >
              <span className={`block w-full h-full rounded ${c.dot}`} />
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

// --- Inline-editable category row ---

interface CategoryRowProps {
  category: StickyCategory;
  onUpdate: (id: string, name: string, color: string) => Promise<void>;
  onDelete: (id: string) => void;
}

function CategoryRow({ category, onUpdate, onDelete }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commitName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(category.name);
      setEditing(false);
      return;
    }
    if (trimmed !== category.name) {
      onUpdate(category.id, trimmed, category.color);
    }
    setEditing(false);
  }

  function handleColorChange(color: string) {
    onUpdate(category.id, category.name, color);
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-zinc-800 last:border-0 group">
      <ColorPicker value={category.color} onChange={handleColorChange} />

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitName(); }
            else if (e.key === 'Escape') { setName(category.name); setEditing(false); }
          }}
          className="flex-1 h-7 rounded bg-zinc-800 border border-zinc-500 px-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
      ) : (
        <span
          className="flex-1 text-sm text-zinc-200 cursor-text hover:text-zinc-100"
          onClick={() => setEditing(true)}
          title="Click to rename"
        >
          {category.name}
        </span>
      )}

      <button
        onClick={() => onDelete(category.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-rose-400 text-xs px-1 focus:outline-none"
        title="Delete category"
      >
        ✕
      </button>
    </div>
  );
}

// --- Main CategorySettings ---

export default function CategorySettings() {
  const { project, updateProjectState } = useProject();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('zinc');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  if (!project) return null;

  const categories = project.stickyCategories ?? [];

  async function handleUpdate(id: string, name: string, color: string) {
    if (!project) return;
    try {
      const updated = await updateCategory(project.rootPath, id, name, color);
      const next = categories.map(c => c.id === id ? updated : c);
      updateProjectState({ stickyCategories: next });
    } catch (e) {
      console.error('Failed to update category:', e);
    }
  }

  async function handleAdd() {
    if (!project || !newName.trim()) return;
    setAdding(true);
    try {
      const created = await addCategory(project.rootPath, newName.trim(), newColor);
      updateProjectState({ stickyCategories: [...categories, created] });
      setNewName('');
      setNewColor('zinc');
    } catch (e) {
      console.error('Failed to add category:', e);
    } finally {
      setAdding(false);
    }
  }

  async function confirmDelete() {
    if (!project || !pendingDelete) return;
    try {
      await deleteCategory(project.rootPath, pendingDelete);
      updateProjectState({ stickyCategories: categories.filter(c => c.id !== pendingDelete) });
    } catch (e) {
      console.error('Failed to delete category:', e);
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-zinc-100">Sticky Note Categories</h2>

        <div>
          {categories.length === 0 ? (
            <p className="text-xs text-zinc-500 py-3 text-center">
              No categories yet — add one below.
            </p>
          ) : (
            <div>
              {categories.map(cat => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  onUpdate={handleUpdate}
                  onDelete={(id) => setPendingDelete(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add new category */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
          <ColorPicker value={newColor} onChange={setNewColor} />
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newName.trim()) handleAdd();
            }}
            placeholder="New category name…"
            className="flex-1 h-7 rounded bg-zinc-800 border border-zinc-600 px-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          <Button
            size="sm"
            className="h-7 text-xs px-3"
            disabled={!newName.trim() || adding}
            onClick={handleAdd}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing sticky notes assigned to this category will be orphaned and
              shown with a fallback color.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction size="sm" variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
