import Editor from '../Editor';
import type { Chapter } from '../types';

export interface ChapterEditorLayerProps {
  chapter: Chapter;
  initialContent: string;
  visible: boolean;
  onContentChange: (markdown: string) => void;
}

/**
 * One-to-one wrapper per open chapter. Stays mounted for the lifetime of the
 * session so Lexical's undo history is never lost. Hidden chapters are kept
 * alive with display:none so they don't repaint.
 *
 * `chapter.filename` is used as the React key by
 * ChapterStackManager — this instance is permanently bound to that filename.
 */
export default function ChapterEditorLayer({
  chapter: _chapter,
  initialContent,
  visible,
  onContentChange,
}: ChapterEditorLayerProps) {
  return (
    <div className={visible ? 'absolute inset-0 flex flex-col' : 'hidden'}>
      <Editor initialContent={initialContent} onContentChange={onContentChange} />
    </div>
  );
}
