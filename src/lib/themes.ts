import type { Theme } from '../types';

export const DEFAULT_THEME: Theme = {
  name: 'Default',
  fontFamily: 'Georgia, serif',
  fontSize: 18,
  lineHeight: 1.75,
  backgroundColor: '#18181b', // zinc-900
  textColor: '#f4f4f5',       // zinc-100
  accentColor: '#a1a1aa',     // zinc-400
  textAlign: 'justify'
};

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty('--theme-font-family', theme.fontFamily);
  root.style.setProperty('--theme-font-size', `${theme.fontSize}px`);
  root.style.setProperty('--theme-line-height', String(theme.lineHeight));
  root.style.setProperty('--theme-bg', theme.backgroundColor);
  root.style.setProperty('--theme-text', theme.textColor);
  root.style.setProperty('--theme-accent', theme.accentColor);
}
