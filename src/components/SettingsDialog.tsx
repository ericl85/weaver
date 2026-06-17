import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from './ui/dialog';
import GeneralSettings from './settings/GeneralSettings';
import CategorySettings from './settings/CategorySettings';
import GoalsSettings from './settings/GoalsSettings';

type Section = 'general' | 'goals' | 'categories' | 'theme' | 'codex' | 'ai';

interface NavItemProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  hint?: string;
  onClick: () => void;
}

function NavItem({ label, active, disabled, hint, onClick }: NavItemProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={hint}
      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors focus:outline-none ${
        disabled
          ? 'text-muted-foreground/50 cursor-default'
          : active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-card'
      }`}
    >
      {label}
      {hint && <span className="ml-2 text-xs text-muted-foreground">({hint})</span>}
    </button>
  );
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [section, setSection] = useState<Section>('general');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[560px] flex flex-col p-0 overflow-hidden">
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">Project Settings</DialogTitle>

        <div className="flex flex-1 overflow-hidden">
          {/* Left nav */}
          <div className="w-44 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col p-3 gap-0.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 mb-1">
              Settings
            </p>
            <NavItem
              label="General"
              active={section === 'general'}
              onClick={() => setSection('general')}
            />
            <NavItem
              label="Goals"
              active={section === 'goals'}
              onClick={() => setSection('goals')}
            />
            <NavItem
              label="Categories"
              active={section === 'categories'}
              onClick={() => setSection('categories')}
            />
            <div className="my-2 border-t border-border" />
            <NavItem
              label="Theme"
              active={section === 'theme'}
              disabled
              hint="coming soon"
              onClick={() => {}}
            />
            <NavItem
              label="Codex"
              active={section === 'codex'}
              disabled
              hint="coming soon"
              onClick={() => {}}
            />
            <NavItem
              label="AI"
              active={section === 'ai'}
              disabled
              hint="coming soon"
              onClick={() => {}}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {section === 'general' && <GeneralSettings />}
            {section === 'goals' && <GoalsSettings />}
            {section === 'categories' && <CategorySettings />}
            {section === 'theme' && (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-foreground">Theme</h2>
                <p className="text-sm text-muted-foreground">
                  Theme customisation is coming soon. Use the Theme panel in the
                  right sidebar once it ships.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
