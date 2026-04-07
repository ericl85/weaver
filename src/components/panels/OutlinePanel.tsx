import { useState, useEffect, useCallback } from 'react';
import { $insertNodes, $nodesOfType } from 'lexical';
import { useProject } from '../../contexts/ProjectContext';
import { useEditor } from '../../contexts/EditorContext';
import { readOutline, saveOutline } from '../../lib/tauri';
import { AnchorNode, $createAnchorNode } from '../../nodes/AnchorNode';
import type { OutlineItem } from '../../types';

type ItemType = OutlineItem['type'];

const TYPE_LABELS: Record<ItemType, string> = {
  note: 'Notes',
  todo: 'To-Do',
  feedback: 'Feedback',
};

const TYPE_COLORS: Record<ItemType, string> = {
  note: 'text-zinc-400',
  todo: 'text-amber-400',
  feedback: 'text-blue-400',
};

const TYPE_DOT: Record<ItemType, string> = {
  note: 'bg-zinc-500',
  todo: 'bg-amber-400',
  feedback: 'bg-blue-400',
};

const ALL_TYPES: ItemType[] = ['note', 'todo', 'feedback'];

export default function OutlinePanel() {
  const { project, activeChapter } = useProject();
  const { editor } = useEditor();
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [newType, setNewType] = useState<ItemType>('note');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Load items when chapter changes
  useEffect(() => {
    if (!project || !activeChapter) {
      setItems([]);
      return;
    }
    readOutline(project.rootPath, activeChapter.filename)
      .then(setItems)
      .catch(() => setItems([]));
  }, [project, activeChapter]);

  const persist = useCallback(async (updated: OutlineItem[]) => {
    if (!project || !activeChapter) return;
    setItems(updated);
    await saveOutline(project.rootPath, activeChapter.filename, updated).catch(console.error);
  }, [project, activeChapter]);

  function addItem() {
    if (!editor || !project || !activeChapter) return;
    const anchorId = crypto.randomUUID();
    const item: OutlineItem = {
      id: crypto.randomUUID(),
      chapterId: activeChapter.id,
      text: 'New item',
      anchorId,
      type: newType,
    };
    editor.update(() => {
      $insertNodes([$createAnchorNode(anchorId)]);
    });
    persist([...items, item]);
  }

  function startEdit(item: OutlineItem) {
    setEditingId(item.id);
    setEditingText(item.text);
  }

  function commitEdit(id: string) {
    const updated = items.map(i => (i.id === id ? { ...i, text: editingText } : i));
    persist(updated);
    setEditingId(null);
  }

  function deleteItem(id: string) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (editor) {
      editor.update(() => {
        const nodes = $nodesOfType(AnchorNode);
        nodes.find(n => n.__anchorId === item.anchorId)?.remove();
      });
    }
    persist(items.filter(i => i.id !== id));
  }

  function scrollToItem(item: OutlineItem) {
    if (!editor) return;
    editor.getEditorState().read(() => {
      const nodes = $nodesOfType(AnchorNode);
      const node = nodes.find(n => n.__anchorId === item.anchorId);
      if (node) {
        const el = editor.getElementByKey(node.__key);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  if (!activeChapter) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm px-4 text-center">
        Open a chapter to view its outline.
      </div>
    );
  }

  const grouped = ALL_TYPES.map(type => ({
    type,
    items: items.filter(i => i.type === type),
  })).filter(g => g.items.length > 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Add item bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-700">
        <select
          value={newType}
          onChange={e => setNewType(e.target.value as ItemType)}
          className="flex-1 bg-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-600 focus:outline-none"
        >
          {ALL_TYPES.map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <button
          onClick={addItem}
          disabled={!editor}
          title="Insert anchor at cursor and add item"
          className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded border border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm px-4 text-center">
            No outline items yet. Place your cursor and click Add.
          </div>
        ) : (
          grouped.map(({ type, items: groupItems }) => (
            <div key={type}>
              <div className="flex items-center gap-2 px-3 py-1.5 sticky top-0 bg-zinc-800">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[type]}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${TYPE_COLORS[type]}`}>
                  {TYPE_LABELS[type]}
                </span>
              </div>
              {groupItems.map(item => (
                <div
                  key={item.id}
                  className="group flex items-start gap-2 px-3 py-2 hover:bg-zinc-700/40 cursor-pointer"
                  onClick={() => scrollToItem(item)}
                >
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[item.type]}`} />
                  <div className="flex-1 min-w-0">
                    {editingId === item.id ? (
                      <input
                        autoFocus
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onBlur={() => commitEdit(item.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit(item.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-zinc-700 text-zinc-100 text-sm rounded px-1 py-0.5 focus:outline-none border border-zinc-500"
                      />
                    ) : (
                      <span className="text-sm text-zinc-300 break-words">{item.text}</span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); startEdit(item); }}
                      title="Edit"
                      className="text-zinc-500 hover:text-zinc-300 text-xs"
                    >
                      ✎
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                      title="Delete"
                      className="text-zinc-500 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
