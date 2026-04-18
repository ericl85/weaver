import { readStickies, saveStickies } from './tauri';

export function extractAnchorIdsFromMarkdown(markdown: string): Set<string> {
  const ids = new Set<string>();
  const re = /<!--\s*weaver-sticky:([0-9a-f-]{36})\s*-->/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

export async function reconcileOrphans(
  projectPath: string,
  filename: string,
  markdown: string,
): Promise<boolean> {
  try {
    const liveIds = extractAnchorIdsFromMarkdown(markdown);
    const stickies = await readStickies(projectPath, filename);

    let changed = false;
    const updated = stickies.map(sticky => {
      if (sticky.anchorId != null && !liveIds.has(sticky.anchorId)) {
        changed = true;
        return { ...sticky, anchorId: null };
      }
      return sticky;
    });

    if (!changed) return false;

    await saveStickies(projectPath, filename, updated);
    return true;
  } catch (err) {
    console.error(`reconcileOrphans failed for ${filename}:`, err);
    return false;
  }
}
