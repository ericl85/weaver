import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { useCodex } from '../../contexts/CodexContext';
import { listCodex, createCodexEntry, findReferences } from '../../lib/tauri';
import type { CodexEntry } from '../../types';

// Default categories are always shown so the writer can create the first entry
// in a category even before its directory exists on disk.
const DEFAULT_CATEGORIES = ['characters', 'places', 'items'];

/**
 * Sidebar codex navigator. Lists entries grouped by category with at-a-glance
 * mention-count badges; clicking an entry opens its profile in the center pane.
 * This is a navigator, not an editor — all content lives in the CodexProfile.
 */
export default function CodexPanel() {
  const { project } = useProject();
  const { activeCodexEntry, openCodexEntry } = useCodex();

  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creatingCategory, setCreatingCategory] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const newInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    if (!project) return;
    listCodex(project.rootPath).then(setEntries).catch(console.error);
  }, [project]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (creatingCategory) newInputRef.current?.focus();
  }, [creatingCategory]);

  // Mention counts are computed lazily after the list renders so the panel never
  // blocks on the scan. (A cached count is a possible later optimization.)
  useEffect(() => {
    if (!project || entries.length === 0) {
      setCounts({});
      return;
    }
    let cancelled = false;
    Promise.all(
      entries.map(async (e) => {
        try {
          const hits = await findReferences(
            project.rootPath,
            [e.title, ...e.aliases],
            e.matchCase,
          );
          const n = hits.reduce((s, h) => s + h.occurrences.length, 0);
          return [e.id, n] as const;
        } catch {
          return [e.id, 0] as const;
        }
      }),
    ).then((pairs) => {
      if (!cancelled) setCounts(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [project, entries]);

  const byCategory = entries.reduce<Record<string, CodexEntry[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});
  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...Object.keys(byCategory)]),
  );

  function toggleCategory(category: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  async function handleCreate(category: string) {
    const title = newTitle.trim();
    setCreatingCategory(null);
    setNewTitle('');
    if (!project || !title) return;
    try {
      const created = await createCodexEntry(project.rootPath, category, title);
      refresh();
      openCodexEntry(created);
    } catch (err) {
      console.error(err);
    }
  }

  if (!project) return null;

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {categories.map((category) => {
        const items = byCategory[category] ?? [];
        const isCollapsed = collapsed.has(category);
        return (
          <div key={category} className="mb-1">
            {/* Category header */}
            <div className="group flex items-center px-3 py-1">
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-1 flex-1 text-left"
              >
                <span className="text-muted-foreground text-[10px] w-2">
                  {isCollapsed ? '▸' : '▾'}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">
                  {category}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {items.length > 0 ? items.length : ''}
                </span>
              </button>
              <button
                onClick={() => {
                  setCreatingCategory(category);
                  setNewTitle('');
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    next.delete(category);
                    return next;
                  });
                }}
                title={`New ${category} entry`}
                className="text-muted-foreground hover:text-foreground text-base leading-none px-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                +
              </button>
            </div>

            {!isCollapsed && (
              <ul className="flex flex-col">
                {items.map((entry) => {
                  const count = counts[entry.id];
                  const isActive = activeCodexEntry?.id === entry.id;
                  return (
                    <li key={entry.id} className="relative">
                      <button
                        onClick={() => openCodexEntry(entry)}
                        className={`w-full text-left pl-7 pr-10 py-1 text-sm truncate ${
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground hover:bg-accent/50 hover:text-accent-foreground'
                        }`}
                      >
                        {entry.title}
                      </button>
                      {count !== undefined && count > 0 && (
                        <span
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums pointer-events-none"
                          title={`${count} mention${count === 1 ? '' : 's'}`}
                        >
                          {count}
                        </span>
                      )}
                    </li>
                  );
                })}

                {creatingCategory === category && (
                  <li className="pl-7 pr-3 py-1">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCreate(category);
                      }}
                    >
                      <input
                        ref={newInputRef}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onBlur={() => handleCreate(category)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setCreatingCategory(null);
                            setNewTitle('');
                          }
                        }}
                        placeholder="Entry name…"
                        className="w-full bg-secondary border border-border rounded px-2 py-0.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                    </form>
                  </li>
                )}

                {items.length === 0 && creatingCategory !== category && (
                  <li className="pl-7 pr-3 py-0.5 text-xs text-muted-foreground italic">
                    No entries
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
