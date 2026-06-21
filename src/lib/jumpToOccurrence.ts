import { useCallback } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { requestJump } from './jumpRegistry';

/**
 * Returns a stable callback that opens the target chapter (if not already
 * active) and signals the chapter's JumpPlugin to scroll to + highlight the
 * Nth whole-word occurrence of `needle`.
 *
 * Call shape matches the scan results returned by find_references /
 * search_text: (chapter filename, matched alias / query, ordinal, matchCase).
 */
export function useJumpToOccurrence(): (
  filename: string,
  needle: string,
  ordinal: number,
  matchCase: boolean,
) => void {
  const { chapters, activeChapter, setActiveChapter } = useProject();

  return useCallback(
    (filename, needle, ordinal, matchCase) => {
      requestJump(filename, { needle, ordinal, matchCase });
      if (activeChapter?.filename !== filename) {
        const chapter = chapters.find(c => c.filename === filename);
        if (chapter) setActiveChapter(chapter);
      }
    },
    [chapters, activeChapter, setActiveChapter],
  );
}
