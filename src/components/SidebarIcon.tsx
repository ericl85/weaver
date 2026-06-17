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
          ? 'text-sidebar-accent-foreground bg-sidebar-accent'
          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
      }`}
    >
      {icon}
    </button>
  );
}
