import { createContext, useContext, useState, ReactNode } from 'react';
import type { LexicalEditor } from 'lexical';

interface EditorContextValue {
  editor: LexicalEditor | null;
  setEditor: (editor: LexicalEditor | null) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState<LexicalEditor | null>(null);
  return (
    <EditorContext.Provider value={{ editor, setEditor }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}
