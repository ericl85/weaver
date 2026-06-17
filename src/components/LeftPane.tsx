import { useState } from 'react';
import ChapterList from './ChapterList';
import FileExplorer from './FileExplorer';

type Mode = 'content' | 'files';

interface Props {
  onOpenRawFile: (relativePath: string) => void;
  onChapterClick: () => void;
  onCollapse: () => void;
}

export default function LeftPane({ onOpenRawFile, onChapterClick, onCollapse }: Props) {
  const [mode, setMode] = useState<Mode>('content');

  return (
    <div className="w-56 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden">
      {/* Header: mode tabs + collapse */}
      <div className="flex items-center border-b border-sidebar-border shrink-0">
        <button
          onClick={() => setMode('content')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mode === 'content'
              ? 'text-foreground border-b-2 border-foreground -mb-px'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Content
        </button>
        <button
          onClick={() => setMode('files')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mode === 'files'
              ? 'text-foreground border-b-2 border-foreground -mb-px'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Files
        </button>
        <button
          onClick={onCollapse}
          title="Collapse panel"
          className="px-2 py-2 text-muted-foreground hover:text-foreground text-xs"
        >
          ‹
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {mode === 'content' ? (
          <ChapterList onChapterClick={onChapterClick} />
        ) : (
          <FileExplorer onOpenFile={onOpenRawFile} />
        )}
      </div>
    </div>
  );
}
