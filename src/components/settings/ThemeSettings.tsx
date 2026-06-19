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

export default function ThemeSettings() {
  const { project } = useProject();
  const { activeTheme, themes, error, setActiveTheme, refreshThemes } = useTheme();
  const [busy, setBusy] = useState(false);

  if (!project) return null;

  async function apply(name: string | null) {
    setBusy(true);
    try {
      await setActiveTheme(name);
    } finally {
      setBusy(false);
    }
  }

  async function openThemesFolder() {
    try {
      await revealItemInDir(`${project!.rootPath}/.weaver/themes`);
    } catch (e) {
      console.error('Failed to open themes folder:', e);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">Theme</h2>

        {error && (
          <p className="mb-3 px-3 py-2 rounded text-xs bg-destructive/15 text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-0.5">
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
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => refreshThemes()}
          className="h-8 text-xs"
        >
          Reload themes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={openThemesFolder}
          className="h-8 text-xs"
        >
          Open themes folder
        </Button>
      </div>
    </div>
  );
}
