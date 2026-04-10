import { useState, useRef, useEffect, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useProject } from '../contexts/ProjectContext';

const appWindow = getCurrentWindow();

interface TitleBarProps {
  leftCollapsed: boolean;
  onToggleLeft: () => void;
  rightCollapsed: boolean;
  onToggleRight: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
}

type MenuId = 'file' | 'edit' | 'view' | 'help';

interface MenuItem {
  label: string;
  shortcut?: string;
  separator?: false;
  action: () => void;
  disabled?: boolean;
}

interface SeparatorItem {
  separator: true;
}

type MenuEntry = MenuItem | SeparatorItem;

export default function TitleBar({
  leftCollapsed,
  onToggleLeft,
  rightCollapsed,
  onToggleRight,
  onNewProject,
  onOpenProject,
}: TitleBarProps) {
  const { project, setProject } = useProject();
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    function handleMouseDown(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [openMenu]);

  function toggleMenu(id: MenuId) {
    setOpenMenu(prev => (prev === id ? null : id));
  }

  function hoverMenu(id: MenuId) {
    if (openMenu && openMenu !== id) setOpenMenu(id);
  }

  function runItem(action: () => void) {
    setOpenMenu(null);
    action();
  }

  const triggerSave = useCallback(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
  }, []);

  const menus: Record<MenuId, MenuEntry[]> = {
    file: [
      { label: 'New Project', action: onNewProject },
      { label: 'Open Project', action: onOpenProject },
      { label: 'Save', shortcut: 'Ctrl+S', action: triggerSave, disabled: !project },
      { label: 'Close Project', action: () => setProject(null), disabled: !project },
      { separator: true },
      { label: 'Exit', action: () => appWindow.close() },
    ],
    edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
      { separator: true },
      { label: 'Cut', action: () => document.execCommand('cut') },
      { label: 'Copy', action: () => document.execCommand('copy') },
      { label: 'Paste', action: () => document.execCommand('paste') },
      { label: 'Select All', action: () => document.execCommand('selectAll') },
    ],
    view: [
      { label: leftCollapsed ? 'Show Left Pane' : 'Hide Left Pane', action: onToggleLeft },
      { label: rightCollapsed ? 'Show Right Sidebar' : 'Hide Right Sidebar', action: onToggleRight },
      { separator: true },
      { label: 'Fullscreen', shortcut: 'F11', action: () => appWindow.setFullscreen(true) },
    ],
    help: [
      { label: 'About Weaver', action: () => {} },
    ],
  };

  const menuLabels: Record<MenuId, string> = {
    file: 'File',
    edit: 'Edit',
    view: 'View',
    help: 'Help',
  };

  const menuOrder: MenuId[] = ['file', 'edit', 'view', 'help'];

  return (
    <div
      ref={barRef}
      className="h-8 shrink-0 flex items-stretch bg-zinc-800 border-b border-zinc-700 select-none"
      data-tauri-drag-region
    >
      {/* Branding */}
      <div
        className="px-3 flex items-center text-zinc-100 text-sm font-semibold tracking-wide pointer-events-none"
        data-tauri-drag-region
      >
        Weaver
      </div>

      {/* Menu bar */}
      <div className="flex items-stretch" data-tauri-drag-region="false">
        {menuOrder.map(id => (
          <div key={id} className="relative">
            <button
              className={`h-full px-3 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 focus:outline-none ${
                openMenu === id ? 'bg-zinc-700 text-zinc-100' : ''
              }`}
              onMouseDown={(e) => { e.stopPropagation(); toggleMenu(id); }}
              onMouseEnter={() => hoverMenu(id)}
            >
              {menuLabels[id]}
            </button>

            {openMenu === id && (
              <div className="absolute top-full left-0 z-50 min-w-48 bg-zinc-800 border border-zinc-700 shadow-lg py-1">
                {menus[id].map((entry, i) => {
                  if ('separator' in entry && entry.separator) {
                    return <div key={i} className="my-1 border-t border-zinc-700" />;
                  }
                  const item = entry as MenuItem;
                  return (
                    <button
                      key={i}
                      disabled={item.disabled}
                      className={`w-full flex items-center justify-between px-4 py-1 text-xs text-left whitespace-nowrap ${
                        item.disabled
                          ? 'text-zinc-600 cursor-default'
                          : 'text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100'
                      }`}
                      onMouseDown={(e) => { e.stopPropagation(); if (!item.disabled) runItem(item.action); }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="ml-8 text-zinc-500">{item.shortcut}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Drag region spacer */}
      <div className="flex-1" data-tauri-drag-region />

      {/* Window controls */}
      <div className="flex items-stretch">
        <button
          title="Minimize"
          className="w-10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
          onMouseDown={(e) => { e.stopPropagation(); appWindow.minimize(); }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          title="Maximize / Restore"
          className="w-10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
          onMouseDown={(e) => { e.stopPropagation(); appWindow.toggleMaximize(); }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        <button
          title="Close"
          className="w-10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-red-600"
          onMouseDown={(e) => { e.stopPropagation(); appWindow.close(); }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
