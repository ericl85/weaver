import { useState } from 'react';
import SidebarIcon from './SidebarIcon';
import StickyPanel from './panels/StickyPanel';

type PanelId = 'stickies' | 'codex' | 'ai';

const PANEL_LABELS: Record<PanelId, string> = {
  stickies: 'Sticky Notes',
  codex: 'Codex',
  ai: 'AI Assistant',
};

// Minimal SVG icons (24×24 viewBox, stroke-based)
const StickyNoteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z" />
    <polyline points="15 3 15 9 21 9" />
  </svg>
);

const CodexIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const AIIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

const PANEL_ICONS: Record<PanelId, React.ReactNode> = {
  stickies: <StickyNoteIcon />,
  codex: <CodexIcon />,
  ai: <AIIcon />,
};

const PANELS: PanelId[] = ['stickies', 'codex', 'ai'];

// Panel slot — T-022 will fill in codex/ai
function PanelContent({ panel }: { panel: PanelId }) {
  if (panel === 'stickies') return <StickyPanel />;
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
