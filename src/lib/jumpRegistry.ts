/**
 * Module-level registry for pending jump-to-occurrence requests.
 *
 * JumpPlugin (one per ChapterEditorLayer) registers a listener for its
 * filename. jumpToOccurrence() calls requestJump() to store the request and
 * deliver it to the already-registered listener (if any). If no listener is
 * registered yet the request sits in `pending` until the chapter's JumpPlugin
 * mounts, or until the chapter becomes visible.
 */

export interface JumpRequest {
  needle: string;
  ordinal: number;
  matchCase: boolean;
}

const pending = new Map<string, JumpRequest>();
const listeners = new Map<string, (req: JumpRequest) => void>();

export function requestJump(filename: string, req: JumpRequest): void {
  pending.set(filename, req);
  listeners.get(filename)?.(req);
}

/** Consume and return the pending jump for a filename, if any. */
export function takePendingJump(filename: string): JumpRequest | undefined {
  const req = pending.get(filename);
  if (req !== undefined) pending.delete(filename);
  return req;
}

/**
 * Register a listener for jumps targeting `filename`.
 * If a jump is already pending, it is delivered synchronously.
 */
export function registerJumpListener(
  filename: string,
  onJump: (req: JumpRequest) => void,
): void {
  listeners.set(filename, onJump);
  const req = takePendingJump(filename);
  if (req !== undefined) onJump(req);
}

export function unregisterJumpListener(filename: string): void {
  listeners.delete(filename);
}
