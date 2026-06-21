import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $createRangeSelection,
  $setSelection,
  $isTextNode,
  $isElementNode,
  type TextNode,
  type LexicalNode,
} from 'lexical';
import {
  registerJumpListener,
  unregisterJumpListener,
  takePendingJump,
  type JumpRequest,
} from '../lib/jumpRegistry';

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

interface TextSpan {
  node: TextNode;
  start: number; // inclusive char index in fullText
  end: number;   // exclusive char index
}

/**
 * Walk all text nodes in DFS order and build:
 * - `spans`: each text node with its char range in the concatenated string
 * - the concatenated `fullText` (block elements separated by '\n')
 */
function collectTextSpans(): [TextSpan[], string] {
  const root = $getRoot();
  const spans: TextSpan[] = [];
  let fullText = '';

  function visit(node: LexicalNode): void {
    if ($isTextNode(node)) {
      const t = node.getTextContent();
      spans.push({ node, start: fullText.length, end: fullText.length + t.length });
      fullText += t;
    } else if ($isElementNode(node)) {
      for (const child of node.getChildren()) visit(child);
      // Paragraph separator (non-word char, so word-boundary logic still works)
      if (fullText.length > 0 && !fullText.endsWith('\n')) {
        fullText += '\n';
      }
    }
  }

  for (const child of root.getChildren()) visit(child);
  return [spans, fullText];
}

// ---------------------------------------------------------------------------
// Whole-word matching (mirrors Rust is_word_char)
// ---------------------------------------------------------------------------

function isWordChar(ch: string): boolean {
  // Alphanumeric (Unicode) or apostrophe; hyphens intentionally excluded.
  return /[\p{L}\p{N}']/u.test(ch);
}

/**
 * Find the [start, end) char range of the `ordinal`-th whole-word occurrence
 * of `needle` in `text`. Returns null if needle is empty or absent.
 *
 * If `ordinal` is stale (exceeds the number of matches), falls back to the
 * first match so the caller never gets a no-op for a valid needle.
 */
function findNthMatch(
  text: string,
  needle: string,
  ordinal: number,
  matchCase: boolean,
): [number, number] | null {
  const textCmp = matchCase ? text : text.toLowerCase();
  const needleCmp = matchCase ? needle : needle.toLowerCase();
  if (needleCmp.length === 0) return null;

  let count = 0;
  let pos = 0;
  let firstMatch: [number, number] | null = null;

  while (pos + needleCmp.length <= textCmp.length) {
    const idx = textCmp.indexOf(needleCmp, pos);
    if (idx === -1) break;
    const end = idx + needleCmp.length;

    const beforeOk = idx === 0 || !isWordChar(text[idx - 1]);
    const afterOk = end === text.length || !isWordChar(text[end]);

    if (beforeOk && afterOk) {
      if (firstMatch === null) firstMatch = [idx, end];
      if (count === ordinal) return [idx, end];
      count++;
      pos = end;
    } else {
      pos = idx + 1;
    }
  }

  return firstMatch; // stale-ordinal fallback
}

/** Map a char position in fullText to the TextNode that contains it. */
function resolvePos(
  spans: TextSpan[],
  pos: number,
  inclusive: boolean,
): [TextNode, number] | null {
  for (const s of spans) {
    const match = inclusive
      ? pos > s.start && pos <= s.end
      : pos >= s.start && pos < s.end;
    if (match) return [s.node, pos - s.start];
  }
  // Fallback for pos === 0 (inclusive check misses it)
  if (pos === 0 && spans.length > 0) return [spans[0].node, 0];
  return null;
}

// ---------------------------------------------------------------------------
// DOM helpers for scroll + flash
// ---------------------------------------------------------------------------

const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI', 'PRE']);

function closestBlock(el: Element): Element {
  let cur: Element | null = el;
  while (cur) {
    if (BLOCK_TAGS.has(cur.tagName)) return cur;
    cur = cur.parentElement;
  }
  return el;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

interface JumpPluginProps {
  filename: string;
  visible: boolean;
}

/**
 * Lexical plugin — one per ChapterEditorLayer. Registers with jumpRegistry so
 * jumpToOccurrence() can reach this specific editor.
 *
 * Ordering note: Editor.tsx renders this AFTER InitialContentPlugin, so
 * when the registry delivers a pending jump at mount time, the
 * $convertFromMarkdownString update is already queued ahead of the jump
 * update in Lexical's serialised update queue. Content is always loaded
 * before the selection is applied.
 */
export default function JumpPlugin({ filename, visible }: JumpPluginProps) {
  const [editor] = useLexicalComposerContext();
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  function executeJump(req: JumpRequest): void {
    editor.update(
      () => {
        const [spans, fullText] = collectTextSpans();
        const match = findNthMatch(fullText, req.needle, req.ordinal, req.matchCase);
        if (!match) return;

        const [matchStart, matchEnd] = match;
        const anchorResult = resolvePos(spans, matchStart, false);
        const focusResult = resolvePos(spans, matchEnd, true);
        if (!anchorResult || !focusResult) return;

        const sel = $createRangeSelection();
        sel.anchor.set(anchorResult[0].getKey(), anchorResult[1], 'text');
        sel.focus.set(focusResult[0].getKey(), focusResult[1], 'text');
        $setSelection(sel);
      },
      {
        onUpdate: () => {
          const root = editor.getRootElement();
          if (!root) return;
          root.focus({ preventScroll: true });

          const domSel = window.getSelection();
          if (!domSel || !domSel.rangeCount) return;
          const range = domSel.getRangeAt(0);
          const startNode = range.startContainer;
          const startEl =
            startNode instanceof Element ? startNode : startNode.parentElement;
          if (!startEl) return;

          startEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

          const block = closestBlock(startEl);
          block.classList.add('weaver-jump-flash');
          setTimeout(() => block.classList.remove('weaver-jump-flash'), 1200);
        },
      },
    );
  }

  // Register jump listener for this filename (re-registers only if editor
  // instance changes, which never happens in practice).
  useEffect(() => {
    registerJumpListener(filename, (req) => {
      if (visibleRef.current) {
        takePendingJump(filename); // clear pending since we're handling it now
        executeJump(req);
      }
      // else: leave pending; visibility effect below picks it up
    });
    return () => unregisterJumpListener(filename);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, editor]);

  // When this layer becomes visible, execute any pending jump.
  useEffect(() => {
    if (!visible) return;
    const req = takePendingJump(filename);
    if (req) executeJump(req);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return null;
}
