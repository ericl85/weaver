import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import { CodexProvider, useCodex } from './contexts/CodexContext';
import { EditorProvider } from './contexts/EditorContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { WordCountProvider } from './contexts/WordCountContext';
import { StickyProvider } from './contexts/StickyContext';
import { StatsProvider, useStats } from './contexts/StatsContext';
import DndProvider from './components/DndProvider';
import ChapterStackManager from './components/ChapterStackManager';
import WelcomeScreen from './components/WelcomeScreen';
import LeftPane from './components/LeftPane';
import FileEditor from './components/FileEditor';
import CodexProfile from './components/codex/CodexProfile';
import Sidebar from './components/Sidebar';
import TitleBar from './components/TitleBar';
import SettingsDialog from './components/SettingsDialog';
import DailyGoalCard from './components/DailyGoalCard';

function AppShell() {
  const { project, activeChapter, setProject } = useProject();
  const { activeCodexEntry, openCodexEntry } = useCodex();
  const { setProgressDismissed } = useStats();
  const [rawFile, setRawFile] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Selecting a chapter takes over the center pane — close any raw file / codex profile.
  useEffect(() => {
    if (activeChapter) {
      setRawFile(null);
      openCodexEntry(null);
    }
  }, [activeChapter, openCodexEntry]);

  // Opening a codex profile takes over the center pane — close any raw file.
  useEffect(() => {
    if (activeCodexEntry) setRawFile(null);
  }, [activeCodexEntry]);

  // Closing the project clears any open codex profile.
  useEffect(() => {
    if (!project) openCodexEntry(null);
  }, [project, openCodexEntry]);

  function handleNewProject() {
    // Close current project to return to WelcomeScreen new-project flow
    setProject(null);
  }

  function handleOpenProject() {
    // Close current project to return to WelcomeScreen open-project flow
    setProject(null);
  }

  // Forward native macOS menu events to the same action handlers used by the
  // custom dropdown menu on Windows/Linux.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>('weaver://menu', (e) => {
      switch (e.payload) {
        case 'new-project': handleNewProject(); break;
        case 'open-project': handleOpenProject(); break;
        case 'save':
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
          break;
        case 'close-project': setProject(null); break;
        case 'open-settings': if (project) setSettingsOpen(true); break;
        case 'show-progress': setProgressDismissed(false); break;
      }
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [project]);

  // Ctrl+, / Cmd+, opens settings
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === ',' && (e.ctrlKey || e.metaKey) && project) {
        e.preventDefault();
        setSettingsOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [project]);

  const titleBar = (
    <TitleBar
      leftCollapsed={leftCollapsed}
      onToggleLeft={() => setLeftCollapsed(c => !c)}
      rightCollapsed={rightCollapsed}
      onToggleRight={() => setRightCollapsed(c => !c)}
      onNewProject={handleNewProject}
      onOpenProject={handleOpenProject}
      onOpenSettings={() => setSettingsOpen(true)}
      onShowProgress={() => setProgressDismissed(false)}
    />
  );

  if (!project) {
    return (
      <div className="h-screen w-screen overflow-hidden flex flex-col bg-background text-foreground">
        {titleBar}
        <div className="flex-1 overflow-hidden">
          <WelcomeScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background text-foreground">
      {titleBar}
      <div className="flex-1 overflow-hidden flex">
        {/* Left pane */}
        {leftCollapsed ? (
          <div className="w-7 shrink-0 flex flex-col items-center pt-2 bg-sidebar border-r border-sidebar-border">
            <button
              onClick={() => setLeftCollapsed(false)}
              title="Expand panel"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ›
            </button>
          </div>
        ) : (
          <LeftPane
            onOpenRawFile={(rel) => { setRawFile(rel); openCodexEntry(null); }}
            onChapterClick={() => setRawFile(null)}
            onCollapse={() => setLeftCollapsed(true)}
          />
        )}

        {/* Center pane */}
        <div className="flex-1 relative overflow-hidden">
          {activeCodexEntry ? (
            <CodexProfile key={activeCodexEntry.id} entry={activeCodexEntry} />
          ) : rawFile ? (
            <FileEditor
              projectPath={project.rootPath}
              relativePath={rawFile}
              onClose={() => setRawFile(null)}
            />
          ) : (
            <ChapterStackManager />
          )}
          <DailyGoalCard />
        </div>

        {/* Right sidebar */}
        {!rightCollapsed && <Sidebar />}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <WordCountProvider>
        <ProjectProvider>
          <ThemeProvider>
            <StatsProvider>
              <EditorProvider>
                <StickyProvider>
                  <CodexProvider>
                    <DndProvider>
                      <AppShell />
                    </DndProvider>
                  </CodexProvider>
                </StickyProvider>
              </EditorProvider>
            </StatsProvider>
          </ThemeProvider>
        </ProjectProvider>
      </WordCountProvider>
    </SettingsProvider>
  );
}
