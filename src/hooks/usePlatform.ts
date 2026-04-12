export type Platform = 'macos' | 'windows' | 'linux';

export function usePlatform(): Platform {
  const ua = navigator.userAgent;
  if (ua.includes('Mac')) return 'macos';
  if (ua.includes('Win')) return 'windows';
  return 'linux';
}
