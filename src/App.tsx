import { useState, useEffect } from 'react';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import { EditorProvider } from './contexts/EditorContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { WordCountProvider } from './contexts/WordCountContext';
import { StickyProvider } from './contexts/StickyContext';
import DndProvider from './components/DndProvider';
import ChapterStackManager from './components/ChapterStackManager';
import WelcomeScreen from './components/WelcomeScreen';
import LeftPane from './components/LeftPane';
import FileEditor from './components/FileEditor';
import Sidebar from './components/Sidebar';
import TitleBar from './components/TitleBar';

function AppShell() {
  const { project, activeChapter, setProject } = useProject();
  const [rawFile, setRawFile] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // When an active chapter is selected, close any open raw file
  useEffect(() => {
    if (activeChapter) setRawFile(null);
  }, [activeChapter]);

  function handleNewProject() {
    // Close current project to return to WelcomeScreen new-project flow
    setProject(null);
  }

  function handleOpenProject() {
    // Close current project to return to WelcomeScreen open-project flow
    setProject(null);
  }

  const titleBar = (
    <TitleBar
      leftCollapsed={leftCollapsed}
      onToggleLeft={() => setLeftCollapsed(c => !c)}
      rightCollapsed={rightCollapsed}
      onToggleRight={() => setRightCollapsed(c => !c)}
      onNewProject={handleNewProject}
      onOpenProject={handleOpenProject}
    />
  );

  if (!project) {
    return (
      <div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-900 text-zinc-100">
        {titleBar}
        <div className="flex-1 overflow-hidden">
          <WelcomeScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-900 text-zinc-100">
      {titleBar}
      <div className="flex-1 overflow-hidden flex">
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
        {!rightCollapsed && <Sidebar />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <ProjectProvider>
          <EditorProvider>
            <StickyProvider>
              <DndProvider>
                <WordCountProvider>
                  <AppShell />
                </WordCountProvider>
              </DndProvider>
            </StickyProvider>
          </EditorProvider>
        </ProjectProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
