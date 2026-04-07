import React from 'react';

interface SidebarIconProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function SidebarIcon({ icon, label, active, onClick }: SidebarIconProps) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
        active
          ? 'text-zinc-100 bg-zinc-700'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50'
      }`}
    >
      {icon}
    </button>
  );
}
