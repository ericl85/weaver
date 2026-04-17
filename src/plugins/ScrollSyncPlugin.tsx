/**
 * ScrollSyncPlugin.tsx
 *
 * Lexical plugin that tracks anchor element positions as the editor scrolls and
 * updates StickyContext.anchorOpacities so the panel fades stickies in/out
 * based on proximity to the current viewport.
 *
 * Must be rendered inside <LexicalComposer>.  Only the visible editor layer
 * writes to anchorOpacities — hidden layers detach their listener and skip
 * all work so they can't overwrite the active layer's values.
 */

import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useStickyContext } from '../contexts/StickyContext';

// ---------------------------------------------------------------------------
// Zone thresholds — distance in px from the nearest viewport edge
// ---------------------------------------------------------------------------
const NEAR_THRESHOLD = 200;
const FAR_THRESHOLD = 600;

// Opacity assigned per zone
const OPACITY_VISIBLE = 1.0;
const OPACITY_NEAR = 0.7;
const OPACITY_FAR = 0.4;
const OPACITY_DISTANT = 0.2;

// Scroll delta (px) in a single RAF frame that counts as a "jump"
const LARGE_SCROLL_THRESHOLD = 1000;

// ---------------------------------------------------------------------------
// Opacity computation
// ---------------------------------------------------------------------------

function computeOpacities(container: HTMLElement): Map<string, number> {
  const map = new Map<string, number>();
  const containerRect = container.getBoundingClientRect();
  const scrollTop = container.scrollTop;
  const viewportTop = scrollTop;
  const viewportBottom = scrollTop + container.clientHeight;

  container.querySelectorAll<HTMLElement>('[data-anchor-id]').forEach(el => {
    const anchorId = el.dataset.anchorId;
    if (!anchorId) return;

    // Convert screen-space rect to scroll-relative coordinates
    const elRect = el.getBoundingClientRect();
    const elTop = elRect.top - containerRect.top + scrollTop;
    const elBottom = elRect.bottom - containerRect.top + scrollTop;

    if (elBottom >= viewportTop && elTop <= viewportBottom) {
      map.set(anchorId, OPACITY_VISIBLE);
      return;
    }

    // Distance from the nearest viewport edge
    const distance =
      elBottom < viewportTop
        ? viewportTop - elBottom   // anchor is above the viewport
        : elTop - viewportBottom;  // anchor is below the viewport

    let opacity: number;
    if (distance <= NEAR_THRESHOLD) {
      opacity = OPACITY_NEAR;
    } else if (distance <= FAR_THRESHOLD) {
      opacity = OPACITY_FAR;
    } else {
      opacity = OPACITY_DISTANT;
    }
    map.set(anchorId, opacity);
  });

  return map;
}

// ---------------------------------------------------------------------------
// Plugin component
// ---------------------------------------------------------------------------

interface ScrollSyncPluginProps {
  /** Whether this editor layer is the currently visible one. */
  visible: boolean;
  /** The data-weaver-dropzone value on the scroll container. */
  dropzoneId: string;
}

export default function ScrollSyncPlugin({ visible, dropzoneId }: ScrollSyncPluginProps) {
  useLexicalComposerContext(); // assert we're inside a LexicalComposer
  const { setAnchorOpacities } = useStickyContext();

  const rafRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) {
      // Detach any pending animation frame — this layer must not write to context
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const container = document.querySelector<HTMLElement>(
      `[data-weaver-dropzone="${dropzoneId}"]`,
    );
    if (!container) return;

    // Recompute immediately on the visible → true transition so the panel
    // shows correct opacities the moment the chapter becomes active.
    setAnchorOpacities(computeOpacities(container));
    lastScrollTopRef.current = container.scrollTop;

    let rafPending = false;

    function handleScroll() {
      if (rafPending) return;
      rafPending = true;
      rafRef.current = requestAnimationFrame(() => {
        rafPending = false;

        const newScrollTop = container!.scrollTop;
        const delta = Math.abs(newScrollTop - lastScrollTopRef.current);
        lastScrollTopRef.current = newScrollTop;

        if (delta > LARGE_SCROLL_THRESHOLD) {
          // For jumps (Ctrl+Home, chapter click, etc.) apply a brief CSS
          // transition so the opacity change animates smoothly rather than
          // flickering to the new values instantly.
          document.querySelectorAll<HTMLElement>('[data-sticky-id]').forEach(el => {
            el.style.transition = 'opacity 300ms ease';
          });
          setTimeout(() => {
            document.querySelectorAll<HTMLElement>('[data-sticky-id]').forEach(el => {
              el.style.transition = '';
            });
          }, 300);
        }

        setAnchorOpacities(computeOpacities(container!));
      });
    }

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [visible, dropzoneId, setAnchorOpacities]);

  return null;
}
