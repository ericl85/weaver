import React from 'react';
import type { EditorConfig, LexicalEditor, NodeKey, SerializedLexicalNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';

export type SerializedStickyAnchorNode = Spread<
  { anchorId: string },
  SerializedLexicalNode
>;

/**
 * Invisible inline node that marks a sticky note anchor position in the document.
 * Stored in Markdown as <!-- weaver-sticky:UUID -->
 * Rendered in the editor as a zero-size span with data-anchor-id and data-category-color attributes.
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
    el.dataset.categoryColor = 'zinc';
    el.style.cssText = 'display:inline;width:0;overflow:hidden;font-size:0;line-height:0;pointer-events:none;user-select:none;';
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
    return <></>;
  }
}

export function $createStickyAnchorNode(anchorId: string): StickyAnchorNode {
  return new StickyAnchorNode(anchorId);
}

export function $isStickyAnchorNode(node: unknown): node is StickyAnchorNode {
  return node instanceof StickyAnchorNode;
}
