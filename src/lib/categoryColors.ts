export const COLOR_MAP = {
  zinc:    { border: 'border-l-zinc-400',    dot: 'bg-zinc-400',    text: 'text-zinc-400' },
  blue:    { border: 'border-l-blue-400',    dot: 'bg-blue-400',    text: 'text-blue-400' },
  amber:   { border: 'border-l-amber-400',   dot: 'bg-amber-400',   text: 'text-amber-400' },
  emerald: { border: 'border-l-emerald-400', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  rose:    { border: 'border-l-rose-400',    dot: 'bg-rose-400',    text: 'text-rose-400' },
  purple:  { border: 'border-l-purple-400',  dot: 'bg-purple-400',  text: 'text-purple-400' },
  cyan:    { border: 'border-l-cyan-400',    dot: 'bg-cyan-400',    text: 'text-cyan-400' },
} as const;

export const CATEGORY_COLOR_NAMES = [
  'zinc', 'blue', 'amber', 'emerald', 'rose', 'purple', 'cyan',
] as const satisfies readonly (keyof typeof COLOR_MAP)[];

export function categoryColorClasses(color: string) {
  return COLOR_MAP[color as keyof typeof COLOR_MAP] ?? COLOR_MAP.zinc;
}
