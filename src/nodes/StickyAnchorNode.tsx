import React from 'react';
import type { EditorConfig, LexicalEditor, NodeKey, SerializedLexicalNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useStickyContext } from '../contexts/StickyContext';

export type SerializedStickyAnchorNode = Spread<
  { anchorId: string },
  SerializedLexicalNode
>;

// Explicit lookup table — Tailwind needs full class names to include them in the build
const COLOR_TO_BG: Record<string, string> = {
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

function colorToBg(color: string): string {
  return COLOR_TO_BG[color] ?? 'bg-zinc-400';
}

interface StickyBadgeProps {
  anchorId: string;
}

function StickyBadge({ anchorId }: StickyBadgeProps) {
  const { anchorMap, highlightSticky, badgesVisible } = useStickyContext();
  const entry = anchorMap.get(anchorId);

  if (!badgesVisible || !entry) {
    // Keep a zero-size element so the node has a mount point but takes no space
    return <span className="inline-block w-0 h-0 overflow-hidden" />;
  }

  const preview = entry.text.length > 40 ? entry.text.slice(0, 40) + '…' : entry.text;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${colorToBg(entry.categoryColor)} cursor-pointer hover:scale-125 transition-transform align-middle mx-0.5`}
            onClick={() => highlightSticky(entry.stickyId)}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          {preview || '(no text)'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline node that marks a sticky note anchor position in the document.
 * Stored in Markdown as <!-- weaver-sticky:UUID -->
 * Renders as a small colored dot badge in the editor; invisible when badges are hidden.
 */
export class StickyAnchorNode extends DecoratorNode<React.ReactElement> {
  __anchorId: string;

  static getType(): string {
    return 'sticky-anchor';
  }

  static clone(node: StickyAnchorNode): StickyAnchorNode {
    return new StickyAnchorNode(node.__anchorId, node.__key);
  }

  constructor(anchorId: string, key?: NodeKey) {
    super(key);
    this.__anchorId = anchorId;
  }

  isInline(): boolean {
    return true;
  }

  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    const el = document.createElement('span');
    el.dataset.anchorId = this.__anchorId;
    // No fixed size — the React component in decorate() controls dimensions
    el.style.cssText = 'display:inline;user-select:none;';
    return el;
  }

  updateDOM(prev: StickyAnchorNode, dom: HTMLElement): boolean {
    if (prev.__anchorId !== this.__anchorId) {
      dom.dataset.anchorId = this.__anchorId;
    }
    return false;
  }

  exportJSON(): SerializedStickyAnchorNode {
    return {
      ...super.exportJSON(),
      type: 'sticky-anchor',
      version: 1,
      anchorId: this.__anchorId,
    };
  }

  static importJSON(data: SerializedStickyAnchorNode): StickyAnchorNode {
    return $createStickyAnchorNode(data.anchorId);
  }

  decorate(): React.ReactElement {
    return <StickyBadge anchorId={this.__anchorId} />;
  }
}

export function $createStickyAnchorNode(anchorId: string): StickyAnchorNode {
  return new StickyAnchorNode(anchorId);
}

export function $isStickyAnchorNode(node: unknown): node is StickyAnchorNode {
  return node instanceof StickyAnchorNode;
}
