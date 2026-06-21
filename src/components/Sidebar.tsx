import { useState, useEffect } from 'react';
import SidebarIcon from './SidebarIcon';
import StickyPanel from './panels/StickyPanel';
import CodexPanel from './panels/CodexPanel';
import { useCodex } from '../contexts/CodexContext';

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

function PanelContent({ panel }: { panel: PanelId }) {
  if (panel === 'stickies') return <StickyPanel />;
  if (panel === 'codex') return <CodexPanel />;
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
      {PANEL_LABELS[panel]} — coming soon
    </div>
  );
}

export default function Sidebar() {
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const { activeCodexEntry } = useCodex();

  // When a codex profile owns the center pane, the right tool-sidebar is
  // chapter-context and irrelevant — yield to the icon strip.
  useEffect(() => {
    if (activeCodexEntry) setActivePanel(null);
  }, [activeCodexEntry]);

  function toggle(panel: PanelId) {
    setActivePanel(p => (p === panel ? null : panel));
  }

  return (
    <div className="flex shrink-0 border-l border-sidebar-border">
      {/* Panel content area — shown when a panel is active */}
      {activePanel && (
        <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-sidebar-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {PANEL_LABELS[activePanel]}
            </h2>
            <button
              onClick={() => setActivePanel(null)}
              title="Close panel"
              className="text-muted-foreground hover:text-foreground text-xs leading-none"
            >
              ✕
            </button>
          </div>
          <PanelContent panel={activePanel} />
        </div>
      )}

      {/* Icon strip — always visible */}
      <div className="w-10 bg-sidebar flex flex-col items-center py-2 gap-1">
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
