import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import type { EditorState } from "lexical";
import { StickyAnchorNode } from "./nodes/StickyAnchorNode";
import { useEditor } from "./contexts/EditorContext";
import StickyDndBridgePlugin from "./plugins/StickyDndBridgePlugin";
import ScrollSyncPlugin from "./plugins/ScrollSyncPlugin";
import JumpPlugin from "./plugins/JumpPlugin";
import {
  markdownToEditorState,
  editorStateToMarkdown,
  WEAVER_TRANSFORMERS,
} from "./lib/markdown";
import EditorToolbar from "./components/EditorToolbar";
import { lexicalTheme } from "./lib/themes";

function onError(error: Error) {
  console.error("Lexical Error:", error);
}

/** Registers the LexicalEditor instance in EditorContext so other components can access it. */
function EditorRefPlugin() {
  const [editor] = useLexicalComposerContext();
  const { setEditor } = useEditor();
  useEffect(() => {
    setEditor(editor);
    return () => setEditor(null);
  }, [editor, setEditor]);
  return null;
}

interface InitialContentPluginProps {
  initialContent: string;
  onContentChange: (markdown: string) => void;
}

/**
 * Loads initialContent into the editor exactly once on mount, then wires up
 * onContentChange for all subsequent edits. Uses a mountedRef so the initial
 * load does not trigger a dirty/save cycle.
 */
function InitialContentPlugin({
  initialContent,
  onContentChange,
}: InitialContentPluginProps) {
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
          return; // skip the emission caused by the initial load
        }
        onContentChange(editorStateToMarkdown(editorState));
      }}
    />
  );
}

export interface EditorProps {
  initialContent: string;
  onContentChange: (markdown: string) => void;
  /** Filename of the chapter this instance is bound to; used for the dnd-kit droppable ID. */
  filename?: string;
  /** Whether this editor layer is currently visible. Passed to ScrollSyncPlugin to prevent hidden layers from writing to anchorOpacities. */
  visible?: boolean;
}

export default function Editor({
  initialContent,
  onContentChange,
  filename,
  visible = true,
}: EditorProps) {
  const initialConfig = {
    namespace: "WeaverEditor",
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

  const dropzoneId = filename ? `editor-dropzone-${filename}` : 'editor-dropzone';
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dropzoneId });

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {/* flex-1 + min-h-0 so this fills the parent flex column without overflowing */}
      <div className="flex-1 flex flex-col min-h-0">
        <EditorToolbar />
        <div
          ref={setDropRef}
          data-weaver-dropzone={dropzoneId}
          className={`editor-surface flex-1 overflow-y-auto min-h-0 flex justify-center${isOver ? ' ring-1 ring-inset ring-blue-400/20' : ''}`}
        >
          <div className="editor-measure relative w-full px-8 py-12 lg:px-12 text-justify">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="editor-content outline-none focus:outline-none focus:ring-0 min-h-[50vh]" />
              }
              placeholder={
                <div className="absolute top-12 left-8 lg:left-12 text-muted-foreground pointer-events-none text-lg">
                  Start writing...
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
        </div>
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ListPlugin />
        <LinkPlugin />
        <HorizontalRulePlugin />
        <MarkdownShortcutPlugin transformers={WEAVER_TRANSFORMERS} />
        <InitialContentPlugin
          initialContent={initialContent}
          onContentChange={onContentChange}
        />
        <EditorRefPlugin />
        <StickyDndBridgePlugin dropzoneId={dropzoneId} />
        <ScrollSyncPlugin visible={visible} dropzoneId={dropzoneId} />
        {filename && <JumpPlugin filename={filename} visible={visible} />}
      </div>
    </LexicalComposer>
  );
}
