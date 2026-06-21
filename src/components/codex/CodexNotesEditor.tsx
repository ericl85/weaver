import { useEffect, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import type { EditorState } from 'lexical';
import { StickyAnchorNode } from '../../nodes/StickyAnchorNode';
import {
  markdownToEditorState,
  editorStateToMarkdown,
  WEAVER_TRANSFORMERS,
} from '../../lib/markdown';
import EditorToolbar from '../EditorToolbar';
import { lexicalTheme } from '../../lib/themes';

function onError(error: Error) {
  console.error('Lexical Error:', error);
}

interface InitialContentPluginProps {
  initialContent: string;
  onContentChange: (markdown: string) => void;
}

/**
 * Loads initialContent into the editor exactly once on mount, then wires up
 * onContentChange for all subsequent edits. The mountedRef skips the emission
 * caused by the initial load so it never triggers a dirty/save cycle.
 */
function InitialContentPlugin({ initialContent, onContentChange }: InitialContentPluginProps) {
  const [editor] = useLexicalComposerContext();
  const mountedRef = useRef(false);

  useEffect(() => {
    markdownToEditorState(initialContent, editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — fires exactly once at mount

  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState: EditorState) => {
        if (!mountedRef.current) {
          mountedRef.current = true;
          return;
        }
        onContentChange(editorStateToMarkdown(editorState));
      }}
    />
  );
}

export interface CodexNotesEditorProps {
  initialContent: string;
  onContentChange: (markdown: string) => void;
}

/**
 * A self-contained rich-text editor for a codex entry's notes body. Reuses the
 * chapter editor's Markdown serialization and token-based styling, but omits the
 * chapter-only plugins (sticky dnd, scroll-sync, jump, EditorRefPlugin) — the
 * notes surface must not hijack the global EditorContext editor ref.
 */
export default function CodexNotesEditor({ initialContent, onContentChange }: CodexNotesEditorProps) {
  const initialConfig = {
    namespace: 'WeaverCodexNotes',
    theme: lexicalTheme,
    onError,
    nodes: [
      StickyAnchorNode,
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
      AutoLinkNode,
      HorizontalRuleNode,
    ],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="flex-1 flex flex-col min-h-0">
        <EditorToolbar showStickyToggle={false} />
        <div className="editor-surface flex-1 overflow-y-auto min-h-0 flex justify-center">
          <div className="editor-measure relative w-full px-8 py-8 lg:px-12">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="editor-content outline-none focus:outline-none focus:ring-0 min-h-[40vh]" />
              }
              placeholder={
                <div className="absolute top-8 left-8 lg:left-12 text-muted-foreground pointer-events-none text-lg">
                  Notes…
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <HorizontalRulePlugin />
        <MarkdownShortcutPlugin transformers={WEAVER_TRANSFORMERS} />
        <InitialContentPlugin
          initialContent={initialContent}
          onContentChange={onContentChange}
        />
      </div>
    </LexicalComposer>
  );
}
