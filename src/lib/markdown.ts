import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
  type TextMatchTransformer,
} from '@lexical/markdown';
import type { EditorState, LexicalEditor } from 'lexical';
import { AnchorNode, $createAnchorNode, $isAnchorNode } from '../nodes/AnchorNode';

/**
 * Handles <!-- weaver-anchor:UUID --> comment markers.
 *
 * Import: when a `<!-- weaver-anchor:UUID -->` text sequence is encountered in
 * the Markdown source, it is replaced with an invisible AnchorNode.
 *
 * Export: when an AnchorNode is encountered during serialization, it is
 * written back as `<!-- weaver-anchor:UUID -->`.
 */
const AnchorTransformer: TextMatchTransformer = {
  type: 'text-match',
  dependencies: [AnchorNode],

  // Used when importing Markdown from disk
  importRegExp: /<!--\s*weaver-anchor:([0-9a-f-]{36})\s*-->/,

  // Used by the MarkdownShortcuts plugin when typing in the editor (trigger = last char)
  regExp: /<!--\s*weaver-anchor:([0-9a-f-]{36})\s*-->$/,
  trigger: '>',

  replace(textNode, match) {
    const anchorId = match[1];
    textNode.replace($createAnchorNode(anchorId));
  },

  export(node) {
    if ($isAnchorNode(node)) {
      return `<!-- weaver-anchor:${node.__anchorId} -->`;
    }
    return null;
  },
};

/**
 * The full set of Markdown transformers used by Weaver.
 *
 * This is the extension point for future Pandoc-specific transformers
 * (footnotes, citations, etc.) — add them here, nowhere else.
 */
export const WEAVER_TRANSFORMERS = [...TRANSFORMERS, AnchorTransformer];

/**
 * Load a Markdown string into the given editor, replacing its current content.
 * Must be called while the editor is registered (i.e., inside a component that
 * is mounted inside the LexicalComposer tree, or via editor.update()).
 */
export function markdownToEditorState(markdown: string, editor: LexicalEditor): void {
  editor.update(() => {
    $convertFromMarkdownString(markdown, WEAVER_TRANSFORMERS);
  });
}

/**
 * Serialize the given EditorState to a Markdown string.
 * Safe to call outside of an editor update — uses state.read().
 */
export function editorStateToMarkdown(state: EditorState): string {
  let markdown = '';
  state.read(() => {
    markdown = $convertToMarkdownString(WEAVER_TRANSFORMERS);
  });
  return markdown;
}
