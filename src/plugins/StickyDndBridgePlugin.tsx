/**
 * StickyDndBridgePlugin.tsx
 *
 * Lexical plugin that bridges @dnd-kit/core drag events into the Lexical editor.
 * Lives inside <LexicalComposer> so it can call editor.update() while also
 * subscribing to dnd-kit's drag lifecycle via useDndMonitor.
 *
 * Handles two interactions:
 *  1. Drag unattached sticky from panel → editor (creates a new StickyAnchorNode)
 *  2. Drag existing badge in editor → new position (moves the StickyAnchorNode)
 */

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDndMonitor } from '@dnd-kit/core';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createRangeSelection,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isTextNode,
  $setSelection,
  type LexicalNode,
} from 'lexical';
import {
  $createStickyAnchorNode,
  $isStickyAnchorNode,
} from '../nodes/StickyAnchorNode';
import { useStickyContext } from '../contexts/StickyContext';
import { useProject } from '../contexts/ProjectContext';
import { saveStickies } from '../lib/tauri';

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const CURSOR_COLORS: Record<string, string> = {
  amber:   '#fbbf24',
  blue:    '#60a5fa',
  cyan:    '#22d3ee',
  emerald: '#34d399',
  fuchsia: '#e879f9',
  green:   '#4ade80',
  indigo:  '#818cf8',
  orange:  '#fb923c',
  pink:    '#f472b6',
  purple:  '#c084fc',
  red:     '#f87171',
  rose:    '#fb7185',
  sky:     '#38bdf8',
  teal:    '#2dd4bf',
  violet:  '#a78bfa',
  yellow:  '#facc15',
  zinc:    '#a1a1aa',
};

function cursorColor(tailwindColor: string): string {
  return CURSOR_COLORS[tailwindColor] ?? CURSOR_COLORS.zinc;
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

/** Cross-browser caretRangeFromPoint / caretPositionFromPoint wrapper. */
function getCaretRangeAtPoint(x: number, y: number): Range | null {
  if (typeof document.caretRangeFromPoint === 'function') {
    return document.caretRangeFromPoint(x, y);
  }
  // Firefox
  const caretPos = (document as any).caretPositionFromPoint?.(x, y) as
    | { offsetNode: Node; offset: number }
    | undefined;
  if (!caretPos) return null;
  const range = document.createRange();
  range.setStart(caretPos.offsetNode, caretPos.offset);
  range.collapse(true);
  return range;
}

/**
 * Get a usable DOMRect from a collapsed caret range.
 * A collapsed range has no selected content, so getBoundingClientRect() returns
 * a zero rect in Chrome/WebView2. We expand by one character to get real line
 * metrics, then return only the insertion-point edge.
 */
function getRectFromCollapsedRange(range: Range): DOMRect | null {
  const container = range.startContainer;
  const offset = range.startOffset;

  if (container.nodeType === Node.TEXT_NODE) {
    const text = container as Text;
    // Try expanding forward one char
    if (offset < text.length) {
      const r = range.cloneRange();
      r.setEnd(container, offset + 1);
      const rect = r.getBoundingClientRect();
      if (rect.height > 0) {
        return new DOMRect(rect.left, rect.top, 0, rect.height);
      }
    }
    // Try expanding backward one char
    if (offset > 0) {
      const r = range.cloneRange();
      r.setStart(container, offset - 1);
      const rect = r.getBoundingClientRect();
      if (rect.height > 0) {
        return new DOMRect(rect.right, rect.top, 0, rect.height);
      }
    }
  }

  // Fall back: use the parent element's rect (coarse but better than nothing)
  const el = container.nodeType === Node.TEXT_NODE
    ? (container as Text).parentElement
    : (container as Element);
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0) return rect;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Lexical helpers
// ---------------------------------------------------------------------------

/**
 * Scan a DOM node's own properties for any __lexicalKey_* entry.
 * Lexical sets `dom[__lexicalKey_${editor._key}] = nodeKey` directly on the
 * element — a UUID suffix we can't know upfront — so we scan instead of
 * constructing the name.
 */
function getLexicalKeyFromDOMNode(node: Node): string | undefined {
  const props = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(props)) {
    if (key.startsWith('__lexicalKey_')) {
      return props[key] as string;
    }
  }
  return undefined;
}

/**
 * Bridges a native DOM Range (from caretRangeFromPoint) into a Lexical
 * RangeSelection and sets it as the active selection.
 * Must be called inside editor.update().
 * Returns true if the selection was successfully set.
 */
function $setSelectionFromRange(caretRange: Range): boolean {
  const container = caretRange.startContainer;
  const offset = caretRange.startOffset;

  // Walk up the DOM scanning for any __lexicalKey_* property (UUID suffix varies
  // per editor instance and is not derived from the namespace string).
  let node: Node | null = container;
  let lexicalKey: string | undefined;

  while (node) {
    lexicalKey = getLexicalKeyFromDOMNode(node);
    if (lexicalKey !== undefined) break;
    node = node.parentElement;
  }

  if (!lexicalKey) return false;

  const lexicalNode = $getNodeByKey(lexicalKey);
  if (!lexicalNode) return false;

  const sel = $createRangeSelection();

  if ($isTextNode(lexicalNode)) {
    const textOffset = Math.min(offset, lexicalNode.getTextContentSize());
    sel.anchor.set(lexicalKey, textOffset, 'text');
    sel.focus.set(lexicalKey, textOffset, 'text');
  } else if ($isElementNode(lexicalNode)) {
    const childOffset = Math.min(offset, lexicalNode.getChildrenSize());
    sel.anchor.set(lexicalKey, childOffset, 'element');
    sel.focus.set(lexicalKey, childOffset, 'element');
  } else {
    return false;
  }

  $setSelection(sel);
  return true;
}

/** DFS search for a StickyAnchorNode by anchorId, then removes it. */
function $findAndRemoveStickyAnchor(anchorId: string): boolean {
  function search(node: LexicalNode): boolean {
    if ($isStickyAnchorNode(node) && node.__anchorId === anchorId) {
      node.remove();
      return true;
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        if (search(child)) return true;
      }
    }
    return false;
  }
  return search($getRoot());
}

// ---------------------------------------------------------------------------
// Drop cursor state
// ---------------------------------------------------------------------------

interface DropCursor {
  x: number;
  y: number;
  height: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Drag data shapes
// ---------------------------------------------------------------------------

interface StickyDragData {
  type: 'sticky';
  stickyId: string;
}

interface AnchorMoveDragData {
  type: 'anchor-move';
  anchorId: string;
}

type DragData = StickyDragData | AnchorMoveDragData;

function isDragData(d: unknown): d is DragData {
  if (!d || typeof d !== 'object') return false;
  const type = (d as Record<string, unknown>).type;
  return type === 'sticky' || type === 'anchor-move';
}

// ---------------------------------------------------------------------------
// Plugin component
// ---------------------------------------------------------------------------

interface StickyDndBridgePluginProps {
  /** The droppable ID expected on this editor layer's scroll container. */
  dropzoneId: string;
}

export default function StickyDndBridgePlugin({ dropzoneId }: StickyDndBridgePluginProps) {
  const [editor] = useLexicalComposerContext();
  const { stickies, setStickies, categories } = useStickyContext();
  const { project, activeChapter } = useProject();

  const [dropCursor, setDropCursor] = useState<DropCursor | null>(null);

  // Refs for RAF-throttled drag move
  const rafScheduled = useRef(false);
  const latestPointer = useRef<{ x: number; y: number } | null>(null);
  const latestOverId = useRef<string | null>(null);
  const dragColor = useRef<string>('zinc');
  // Last caret range successfully resolved during drag (before the overlay settles at drop position)
  const lastValidCaretRange = useRef<Range | null>(null);
  // pointermove listener ref so we can remove it on drag end/cancel
  const pointerMoveListener = useRef<((e: PointerEvent) => void) | null>(null);

  function colorForDragData(data: DragData): string {
    if (data.type === 'sticky') {
      const sticky = stickies.find(s => s.id === data.stickyId);
      if (sticky) {
        const cat = categories.find(c => c.id === sticky.categoryId);
        return cat?.color ?? 'zinc';
      }
    } else {
      const sticky = stickies.find(s => s.anchorId === data.anchorId);
      if (sticky) {
        const cat = categories.find(c => c.id === sticky.categoryId);
        return cat?.color ?? 'zinc';
      }
    }
    return 'zinc';
  }

  function updateDropCursorAt(x: number, y: number, color: string) {
    const caretRange = getCaretRangeAtPoint(x, y);
    if (!caretRange) {
      setDropCursor(null);
      return;
    }
    const rect = getRectFromCollapsedRange(caretRange);
    if (!rect) {
      setDropCursor(null);
      return;
    }
    // Store the last valid range — the overlay hasn't moved here yet, so this
    // range points into the editor. We reuse it on drop instead of re-querying.
    lastValidCaretRange.current = caretRange;
    setDropCursor({
      x: rect.left,
      y: rect.top,
      height: Math.max(rect.height, 16),
      color: cursorColor(color),
    });
  }

  useDndMonitor({
    onDragStart(event) {
      const data = event.active.data.current;
      if (isDragData(data)) {
        dragColor.current = colorForDragData(data);
      }

      // Seed pointer from the activator event (correct at activation time)
      const activator = event.activatorEvent;
      if (activator instanceof PointerEvent || activator instanceof MouseEvent) {
        latestPointer.current = { x: activator.clientX, y: activator.clientY };
      }

      // Register a capture-phase pointermove listener as the sole source of
      // pointer coordinates. event.delta absorbs scroll compensation and drifts
      // from the true viewport position whenever a scrollable ancestor scrolls.
      const handlePointerMove = (e: PointerEvent) => {
        latestPointer.current = { x: e.clientX, y: e.clientY };
        if (rafScheduled.current) return;
        rafScheduled.current = true;
        requestAnimationFrame(() => {
          rafScheduled.current = false;
          const ptr = latestPointer.current;
          if (!ptr) return;
          if (latestOverId.current !== dropzoneId) {
            setDropCursor(null);
            return;
          }
          updateDropCursorAt(ptr.x, ptr.y, dragColor.current);
        });
      };
      pointerMoveListener.current = handlePointerMove;
      window.addEventListener('pointermove', handlePointerMove, { passive: true, capture: true });
    },

    onDragMove(event) {
      latestOverId.current = event.over?.id?.toString() ?? null;

      const data = event.active.data.current;
      if (isDragData(data)) {
        dragColor.current = colorForDragData(data);
      }
    },

    onDragEnd(event) {
      // Reuse the last caret range from the RAF — at that point the DragOverlay
      // hadn't yet moved to the final cursor position, so caretRangeFromPoint
      // hit editor text correctly. By drop time the overlay has settled at the
      // cursor and would intercept a fresh hit-test.
      const caretRange = lastValidCaretRange.current;

      if (pointerMoveListener.current) {
        window.removeEventListener('pointermove', pointerMoveListener.current, { capture: true });
        pointerMoveListener.current = null;
      }
      rafScheduled.current = false;
      latestPointer.current = null;
      lastValidCaretRange.current = null;
      setDropCursor(null);

      // Only act on drops over this editor's dropzone
      if (!event.over || event.over.id !== dropzoneId) return;
      if (!caretRange) return;

      const data = event.active.data.current;
      if (!isDragData(data)) return;

      if (data.type === 'sticky') {
        // --- Interaction 1: drop unattached sticky onto editor ---
        const { stickyId } = data;
        const newAnchorId = crypto.randomUUID();

        editor.update(() => {
          if (!$setSelectionFromRange(caretRange)) return;
          const sel = $getSelection();
          if (!sel || !('insertNodes' in sel)) return;
          (sel as { insertNodes: (nodes: LexicalNode[]) => void }).insertNodes([
            $createStickyAnchorNode(newAnchorId),
          ]);
        });

        // Update sticky state: assign the new anchorId
        const updated = stickies.map(s =>
          s.id === stickyId ? { ...s, anchorId: newAnchorId } : s,
        );
        setStickies(updated);
        if (project && activeChapter) {
          saveStickies(project.rootPath, activeChapter.filename, updated).catch(
            console.error,
          );
        }
      } else {
        // --- Interaction 2: drag existing badge to new position ---
        const { anchorId } = data;

        editor.update(() => {
          $findAndRemoveStickyAnchor(anchorId);
          if (!$setSelectionFromRange(caretRange)) return;
          const sel = $getSelection();
          if (!sel || !('insertNodes' in sel)) return;
          (sel as { insertNodes: (nodes: LexicalNode[]) => void }).insertNodes([
            $createStickyAnchorNode(anchorId),
          ]);
        });
        // anchorId is unchanged — no sticky state update needed
      }
    },

    onDragCancel() {
      if (pointerMoveListener.current) {
        window.removeEventListener('pointermove', pointerMoveListener.current, { capture: true });
        pointerMoveListener.current = null;
      }
      rafScheduled.current = false;
      latestPointer.current = null;
      lastValidCaretRange.current = null;
      setDropCursor(null);
    },
  });

  if (!dropCursor) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: dropCursor.x - 1,
        top: dropCursor.y,
        width: 2,
        height: dropCursor.height,
        backgroundColor: dropCursor.color,
        pointerEvents: 'none',
        zIndex: 9999,
        borderRadius: 1,
      }}
      className="animate-pulse"
    />,
    document.body,
  );
}
