import { useState } from 'react';
import SidebarIcon from './SidebarIcon';
import OutlinePanel from './panels/OutlinePanel';

type PanelId = 'outline' | 'codex' | 'preview' | 'ai';

const PANEL_LABELS: Record<PanelId, string> = {
  outline: 'Outline',
  codex: 'Codex',
  preview: 'Preview',
  ai: 'AI Assistant',
};

// Minimal SVG icons (24×24 viewBox, stroke-based)
const OutlineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const CodexIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const PreviewIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const AIIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

const PANEL_ICONS: Record<PanelId, React.ReactNode> = {
  outline: <OutlineIcon />,
  codex: <CodexIcon />,
  preview: <PreviewIcon />,
  ai: <AIIcon />,
};

const PANELS: PanelId[] = ['outline', 'codex', 'preview', 'ai'];

export interface SidebarPanelProps {
  activePanel: PanelId | null;
}

// Panel slot — T-016, T-018, T-022 will fill in codex/preview/ai
function PanelContent({ panel }: { panel: PanelId }) {
  if (panel === 'outline') return <OutlinePanel />;
  return (
    <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
      {PANEL_LABELS[panel]} — coming soon
    </div>
  );
}

export default function Sidebar() {
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);

  function toggle(panel: PanelId) {
    setActivePanel(p => (p === panel ? null : panel));
  }

  return (
    <div className="flex shrink-0 border-l border-zinc-700">
      {/* Panel content area — shown when a panel is active */}
      {activePanel && (
        <div className="w-64 bg-zinc-800 border-r border-zinc-700 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {PANEL_LABELS[activePanel]}
            </h2>
            <button
              onClick={() => setActivePanel(null)}
              title="Close panel"
              className="text-zinc-500 hover:text-zinc-300 text-xs leading-none"
            >
              ✕
            </button>
          </div>
          <PanelContent panel={activePanel} />
        </div>
      )}

      {/* Icon strip — always visible */}
      <div className="w-10 bg-zinc-800 flex flex-col items-center py-2 gap-1">
        {PANELS.map(panel => (
          <SidebarIcon
            key={panel}
            icon={PANEL_ICONS[panel]}
            label={PANEL_LABELS[panel]}
            active={activePanel === panel}
            onClick={() => toggle(panel)}
          />
        ))}
      </div>
    </div>
  );
}
