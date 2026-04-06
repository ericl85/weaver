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
    <div className="w-56 shrink-0 flex flex-col bg-zinc-800 border-r border-zinc-700 overflow-hidden">
      {/* Header: mode tabs + collapse */}
      <div className="flex items-center border-b border-zinc-700 shrink-0">
        <button
          onClick={() => setMode('content')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mode === 'content'
              ? 'text-zinc-100 border-b-2 border-zinc-400 -mb-px'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Content
        </button>
        <button
          onClick={() => setMode('files')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mode === 'files'
              ? 'text-zinc-100 border-b-2 border-zinc-400 -mb-px'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Files
        </button>
        <button
          onClick={onCollapse}
          title="Collapse panel"
          className="px-2 py-2 text-zinc-500 hover:text-zinc-300 text-xs"
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
