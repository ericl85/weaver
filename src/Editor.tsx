import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { EditorState } from "lexical";

const theme = {
  paragraph: "mb-4 text-lg leading-relaxed text-zinc-100",
};

function onError(error: Error) {
  console.error("Lexical Error:", error);
}

export default function Editor() {
  const initialConfig = {
    namespace: "WeaverEditor",
    theme,
    onError,
  };

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      // Just console logging the text state for now
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
      </div>
    </LexicalComposer>
  );
}
