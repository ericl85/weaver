import { useEffect, useRef } from 'react';
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
import type { EditorState } from "lexical";
import { AnchorNode } from "./nodes/AnchorNode";
import { useEditor } from "./contexts/EditorContext";
import { markdownToEditorState, editorStateToMarkdown, WEAVER_TRANSFORMERS } from "./lib/markdown";
import EditorToolbar from "./components/EditorToolbar";

const theme = {
  paragraph: "mb-4 text-lg leading-relaxed text-zinc-100",
  heading: {
    h1: "text-3xl font-bold mb-4 mt-6 text-zinc-100",
    h2: "text-2xl font-semibold mb-3 mt-5 text-zinc-100",
    h3: "text-xl font-semibold mb-2 mt-4 text-zinc-200",
  },
  quote: "border-l-4 border-zinc-600 pl-4 italic text-zinc-400 my-4",
  list: {
    ul: "list-disc pl-6 mb-4 text-zinc-100",
    ol: "list-decimal pl-6 mb-4 text-zinc-100",
    listitem: "mb-1",
    nested: {
      listitem: "list-none",
    },
  },
  code: "block font-mono bg-zinc-800 text-zinc-300 rounded p-4 my-4 text-sm overflow-x-auto",
  codeHighlight: {
    atrule: "text-blue-400",
    attr: "text-green-400",
    boolean: "text-orange-400",
    builtin: "text-yellow-400",
    cdata: "text-zinc-500",
    char: "text-green-400",
    class: "text-yellow-400",
    "class-name": "text-yellow-400",
    comment: "text-zinc-500 italic",
    constant: "text-orange-400",
    deleted: "text-red-400",
    doctype: "text-zinc-500",
    entity: "text-orange-400",
    function: "text-yellow-400",
    important: "text-orange-400",
    inserted: "text-green-400",
    keyword: "text-blue-400",
    namespace: "text-zinc-300",
    number: "text-orange-400",
    operator: "text-zinc-300",
    prolog: "text-zinc-500",
    property: "text-green-400",
    punctuation: "text-zinc-400",
    regex: "text-green-400",
    selector: "text-green-400",
    string: "text-green-400",
    symbol: "text-orange-400",
    tag: "text-red-400",
    url: "text-blue-400",
    variable: "text-orange-400",
  },
  link: "text-blue-400 underline cursor-pointer hover:text-blue-300",
  text: {
    bold: "font-bold",
    italic: "italic",
    strikethrough: "line-through",
    code: "font-mono bg-zinc-800 text-zinc-300 rounded px-1 py-0.5 text-sm",
    underline: "underline",
    underlineStrikethrough: "underline line-through",
  },
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
    nodes: [
      AnchorNode,
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
      AutoLinkNode,
    ],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {/* flex-1 + min-h-0 so this fills the parent flex column without overflowing */}
      <div className="flex-1 flex flex-col min-h-0">
        <EditorToolbar />
        <div className="flex-1 overflow-y-auto min-h-0 flex justify-center">
          <div className="relative w-full max-w-3xl px-8 py-12 lg:px-12">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="outline-none focus:outline-none focus:ring-0 min-h-[50vh]" />
              }
              placeholder={
                <div className="absolute top-12 left-8 lg:left-12 text-zinc-600 pointer-events-none text-lg">
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
        <MarkdownShortcutPlugin transformers={WEAVER_TRANSFORMERS} />
        <InitialContentPlugin initialContent={initialContent} onContentChange={onContentChange} />
        <EditorRefPlugin />
      </div>
    </LexicalComposer>
  );
}
