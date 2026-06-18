import { useState } from 'react';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { useTheme } from '../../contexts/ThemeContext';
import { useProject } from '../../contexts/ProjectContext';
import type { ThemeManifest } from '../../types';
import { Button } from '../ui/button';

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface ThemeRowProps {
  name: string;
  meta?: string;
  active: boolean;
  onClick: () => void;
}

function ThemeRow({ name, meta, active, onClick }: ThemeRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors focus:outline-none ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-foreground hover:bg-card'
      }`}
    >
      <span className="w-3.5 shrink-0 text-primary">{active && <CheckIcon />}</span>
      <span className="flex flex-col min-w-0">
        <span className="text-sm truncate">{name}</span>
        {meta && <span className="text-xs text-muted-foreground truncate">{meta}</span>}
      </span>
    </button>
  );
}

function manifestMeta(m: ThemeManifest): string | undefined {
  const parts: string[] = [];
  if (m.author) parts.push(m.author);
  if (m.version) parts.push(`v${m.version}`);
  return parts.length ? parts.join(' · ') : undefined;
}

export default function ThemePanel() {
  const { project } = useProject();
  const { activeTheme, themes, error, setActiveTheme, refreshThemes } = useTheme();
  const [busy, setBusy] = useState(false);

  async function apply(name: string | null) {
    setBusy(true);
    try {
      await setActiveTheme(name);
    } finally {
      setBusy(false);
    }
  }

  async function openThemesFolder() {
    if (!project) return;
    try {
      await revealItemInDir(`${project.rootPath}/.weaver/themes`);
    } catch (e) {
      console.error('Failed to open themes folder:', e);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {error && (
          <p className="mx-1 mb-1 px-2 py-1.5 rounded text-xs bg-destructive/15 text-destructive">
            {error}
          </p>
        )}

        {/* Built-in Default — always available, selecting it clears the override */}
        <ThemeRow
          name="Default"
          meta="Built-in"
          active={activeTheme === null}
          onClick={() => apply(null)}
        />

        {themes.map((t) => (
          <ThemeRow
            key={t.name}
            name={t.name}
            meta={manifestMeta(t)}
            active={activeTheme === t.name}
            onClick={() => apply(t.name)}
          />
        ))}

        {themes.length === 0 && (
          <p className="mt-3 px-3 text-xs text-muted-foreground leading-relaxed">
            No themes installed. Themes are CSS files at{' '}
            <code className="text-foreground">.weaver/themes/&lt;Name&gt;/theme.css</code>.
            Add one, then reload.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-sidebar-border p-2 flex flex-col gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => refreshThemes()}
        >
          Reload themes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={openThemesFolder}
        >
          Open themes folder
        </Button>
      </div>
    </div>
  );
}
