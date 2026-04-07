import React from 'react';
import type { EditorConfig, LexicalEditor, NodeKey, SerializedLexicalNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';

export type SerializedAnchorNode = Spread<
  { anchorId: string },
  SerializedLexicalNode
>;

/**
 * Invisible inline node that marks an outline anchor position in the document.
 * Stored in Markdown as <!-- weaver-anchor:UUID -->
 * Rendered in the editor as a zero-size span with data-anchor-id attribute.
 */
export class AnchorNode extends DecoratorNode<React.ReactElement> {
  __anchorId: string;

  static getType(): string {
    return 'anchor';
  }

  static clone(node: AnchorNode): AnchorNode {
    return new AnchorNode(node.__anchorId, node.__key);
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
    el.style.cssText = 'display:inline;width:0;overflow:hidden;font-size:0;line-height:0;pointer-events:none;user-select:none;';
    return el;
  }

  updateDOM(prev: AnchorNode, dom: HTMLElement): boolean {
    if (prev.__anchorId !== this.__anchorId) {
      dom.dataset.anchorId = this.__anchorId;
    }
    return false;
  }

  exportJSON(): SerializedAnchorNode {
    return {
      ...super.exportJSON(),
      type: 'anchor',
      version: 1,
      anchorId: this.__anchorId,
    };
  }

  static importJSON(data: SerializedAnchorNode): AnchorNode {
    return $createAnchorNode(data.anchorId);
  }

  decorate(): React.ReactElement {
    return <></>;
  }
}

export function $createAnchorNode(anchorId: string): AnchorNode {
  return new AnchorNode(anchorId);
}

export function $isAnchorNode(node: unknown): node is AnchorNode {
  return node instanceof AnchorNode;
}
