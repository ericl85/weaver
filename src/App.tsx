import { useState, useEffect } from 'react';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import Editor from './Editor';
import WelcomeScreen from './components/WelcomeScreen';
import LeftPane from './components/LeftPane';
import FileEditor from './components/FileEditor';

function AppShell() {
  const { project, activeChapter } = useProject();
  const [rawFile, setRawFile] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // When an active chapter is selected, close any open raw file
  useEffect(() => {
    if (activeChapter) setRawFile(null);
  }, [activeChapter]);

  if (!project) {
    return <WelcomeScreen />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-zinc-900 text-zinc-100">
      {/* Left pane */}
      {leftCollapsed ? (
        <div className="w-7 shrink-0 flex flex-col items-center pt-2 bg-zinc-800 border-r border-zinc-700">
          <button
            onClick={() => setLeftCollapsed(false)}
            title="Expand panel"
            className="text-zinc-500 hover:text-zinc-300 text-xs"
          >
            ›
          </button>
        </div>
      ) : (
        <LeftPane
          onOpenRawFile={(rel) => setRawFile(rel)}
          onChapterClick={() => setRawFile(null)}
          onCollapse={() => setLeftCollapsed(true)}
        />
      )}

      {/* Center pane */}
      <div className="flex-1 relative overflow-hidden">
        {rawFile ? (
          <FileEditor
            projectPath={project.rootPath}
            relativePath={rawFile}
            onClose={() => setRawFile(null)}
          />
        ) : (
          <div className="absolute inset-0 overflow-y-auto flex justify-center">
            <div className="w-full flex flex-col min-h-full py-12 px-8 lg:px-16 xl:px-24">
              <Editor />
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      {rightCollapsed ? (
        <div className="w-7 shrink-0 flex flex-col items-center pt-2 bg-zinc-800 border-l border-zinc-700">
          <button
            onClick={() => setRightCollapsed(false)}
            title="Expand panel"
            className="text-zinc-500 hover:text-zinc-300 text-xs"
          >
            ‹
          </button>
        </div>
      ) : (
        <div className="w-72 shrink-0 bg-zinc-800 border-l border-zinc-700 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Tools
            </h2>
            <button
              onClick={() => setRightCollapsed(true)}
              title="Collapse panel"
              className="text-zinc-500 hover:text-zinc-300 text-xs"
            >
              ›
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
            Panels coming soon
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <AppShell />
    </ProjectProvider>
  );
}
