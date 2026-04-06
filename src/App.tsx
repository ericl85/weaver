import { ProjectProvider, useProject } from './contexts/ProjectContext';
import Editor from './Editor';
import WelcomeScreen from './components/WelcomeScreen';

function AppShell() {
  const { project } = useProject();

  if (!project) {
    return <WelcomeScreen />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-zinc-900 text-zinc-100">
      {/* Editor Pane */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-y-auto flex justify-center">
          <div className="w-full flex flex-col min-h-full py-12 px-8 lg:px-16 xl:px-24">
            <Editor />
          </div>
        </div>
      </div>

      {/* Right Sidebar (placeholder) */}
      <div className="w-1/4 sm:w-80 lg:w-96 bg-zinc-800 border-l border-zinc-700 flex flex-col p-6">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Codex & Outline
        </h2>
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          Placeholder area for codex, notes, or outline.
        </div>
      </div>
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
