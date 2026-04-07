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
 * When visible, provides the scrollable writing surface (overflow-y-auto +
 * centered padding). `chapter.filename` is used as the React key by
 * ChapterStackManager — this instance is permanently bound to that filename.
 */
export default function ChapterEditorLayer({
  chapter: _chapter,
  initialContent,
  visible,
  onContentChange,
}: ChapterEditorLayerProps) {
  return (
    <div className={visible
      ? 'absolute inset-0 overflow-y-auto flex justify-center'
      : 'hidden'
    }>
      <div className="w-full flex flex-col min-h-full py-12 px-8 lg:px-16 xl:px-24">
        <Editor initialContent={initialContent} onContentChange={onContentChange} />
      </div>
    </div>
  );
}
