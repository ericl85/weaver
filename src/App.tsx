import { useState, useEffect } from 'react';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import { EditorProvider } from './contexts/EditorContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { WordCountProvider } from './contexts/WordCountContext';
import ChapterStackManager from './components/ChapterStackManager';
import WelcomeScreen from './components/WelcomeScreen';
import LeftPane from './components/LeftPane';
import FileEditor from './components/FileEditor';
import Sidebar from './components/Sidebar';

function AppShell() {
  const { project, activeChapter } = useProject();
  const [rawFile, setRawFile] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);

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
          <ChapterStackManager />
        )}
      </div>

      {/* Right sidebar */}
      <Sidebar />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <ProjectProvider>
          <EditorProvider>
            <WordCountProvider>
              <AppShell />
            </WordCountProvider>
          </EditorProvider>
        </ProjectProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
