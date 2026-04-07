import { useEffect, useRef } from 'react';
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { EditorState } from "lexical";
import { AnchorNode } from "./nodes/AnchorNode";
import { useEditor } from "./contexts/EditorContext";
import { markdownToEditorState, editorStateToMarkdown } from "./lib/markdown";

const theme = {
  paragraph: "mb-4 text-lg leading-relaxed text-zinc-100",
};

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
}

export default function Editor({ initialContent, onContentChange }: EditorProps) {
  const initialConfig = {
    namespace: "WeaverEditor",
    theme,
    onError,
    nodes: [AnchorNode],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative w-full flex-1 flex flex-col">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="flex-1 w-full outline-none resize-none focus:outline-none focus:ring-0" />
          }
          placeholder={
            <div className="absolute top-0 left-0 text-zinc-600 pointer-events-none text-lg">
              Start writing...
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <InitialContentPlugin initialContent={initialContent} onContentChange={onContentChange} />
        <EditorRefPlugin />
      </div>
    </LexicalComposer>
  );
}
