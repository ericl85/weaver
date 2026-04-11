import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
  type TextMatchTransformer,
} from '@lexical/markdown';
import type { EditorState, LexicalEditor } from 'lexical';
import {
  StickyAnchorNode,
  $createStickyAnchorNode,
  $isStickyAnchorNode,
} from '../nodes/StickyAnchorNode';

/**
 * Handles <!-- weaver-sticky:UUID --> comment markers.
 *
 * Import: when a `<!-- weaver-sticky:UUID -->` text sequence is encountered in
 * the Markdown source, it is replaced with an invisible StickyAnchorNode.
 *
 * Export: when a StickyAnchorNode is encountered during serialization, it is
 * written back as `<!-- weaver-sticky:UUID -->`.
 */
const StickyAnchorTransformer: TextMatchTransformer = {
  type: 'text-match',
  dependencies: [StickyAnchorNode],

  // Used when importing Markdown from disk
  importRegExp: /<!--\s*weaver-sticky:([0-9a-f-]{36})\s*-->/,

  // Used by the MarkdownShortcuts plugin when typing in the editor (trigger = last char)
  regExp: /<!--\s*weaver-sticky:([0-9a-f-]{36})\s*-->$/,
  trigger: '>',

  replace(textNode, match) {
    const anchorId = match[1];
    textNode.replace($createStickyAnchorNode(anchorId));
  },

  export(node) {
    if ($isStickyAnchorNode(node)) {
      return `<!-- weaver-sticky:${node.__anchorId} -->`;
    }
    return null;
  },
};

/**
 * Backwards-compatibility transformer for the old <!-- weaver-anchor:UUID --> format.
 * On import, converts old markers to StickyAnchorNodes so existing projects open
 * without data loss. On next save the new format is written. No export rule needed.
 */
const LegacyAnchorTransformer: TextMatchTransformer = {
  type: 'text-match',
  dependencies: [StickyAnchorNode],

  importRegExp: /<!--\s*weaver-anchor:([0-9a-f-]{36})\s*-->/,
  regExp: /<!--\s*weaver-anchor:([0-9a-f-]{36})\s*-->$/,
  trigger: '>',

  replace(textNode, match) {
    const anchorId = match[1];
    textNode.replace($createStickyAnchorNode(anchorId));
  },

  export() {
    return null;
  },
};

/**
 * The full set of Markdown transformers used by Weaver.
 *
 * This is the extension point for future Pandoc-specific transformers
 * (footnotes, citations, etc.) — add them here, nowhere else.
 */
export const WEAVER_TRANSFORMERS = [
  ...TRANSFORMERS,
  StickyAnchorTransformer,
  LegacyAnchorTransformer,
];

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
