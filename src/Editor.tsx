import { useEffect } from 'react';
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { EditorState } from "lexical";
import { AnchorNode } from "./nodes/AnchorNode";
import { useEditor } from "./contexts/EditorContext";

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

export default function Editor() {
  const initialConfig = {
    namespace: "WeaverEditor",
    theme,
    onError,
    nodes: [AnchorNode],
  };

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      console.log("Editor state updated.", editorState.toJSON());
    });
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
        <OnChangePlugin onChange={onChange} />
        <EditorRefPlugin />
      </div>
    </LexicalComposer>
  );
}
