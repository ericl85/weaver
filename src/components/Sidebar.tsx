import { useState } from 'react';
import SidebarIcon from './SidebarIcon';
import StickyPanel from './panels/StickyPanel';
import ThemePanel from './panels/ThemePanel';

type PanelId = 'stickies' | 'codex' | 'ai' | 'theme';

const PANEL_LABELS: Record<PanelId, string> = {
  stickies: 'Sticky Notes',
  codex: 'Codex',
  ai: 'AI Assistant',
  theme: 'Themes',
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

const ThemeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996C18.984 15.668 22 12.652 22 9c0-3.877-4.5-7-10-7z" />
  </svg>
);

const PANEL_ICONS: Record<PanelId, React.ReactNode> = {
  stickies: <StickyNoteIcon />,
  codex: <CodexIcon />,
  ai: <AIIcon />,
  theme: <ThemeIcon />,
};

const PANELS: PanelId[] = ['stickies', 'codex', 'ai', 'theme'];

function PanelContent({ panel }: { panel: PanelId }) {
  if (panel === 'stickies') return <StickyPanel />;
  if (panel === 'theme') return <ThemePanel />;
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
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
