import { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { updateProjectMetadata } from '../../lib/tauri';
import { Button } from '../ui/button';

export default function GeneralSettings() {
  const { project, updateProjectState } = useProject();
  const [title, setTitle] = useState(project?.title ?? '');
  const [author, setAuthor] = useState(project?.author ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  if (!project) return null;

  const isDirty = title !== project.title || author !== project.author;

  async function handleSave() {
    if (!project || !isDirty) return;
    setSaving(true);
    try {
      const updated = await updateProjectMetadata(project.rootPath, title, author);
      updateProjectState({ title: updated.title, author: updated.author });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 1500);
    } catch (e) {
      console.error('Failed to save project metadata:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">General</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-300" htmlFor="project-title">
              Project Title
            </label>
            <input
              id="project-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-8 rounded-md bg-zinc-800 border border-zinc-600 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              placeholder="Untitled Project"
            />
            <p className="text-xs text-zinc-500">
              Changing the title does not rename the project folder on disk.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-300" htmlFor="project-author">
              Author
            </label>
            <input
              id="project-author"
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              className="h-8 rounded-md bg-zinc-800 border border-zinc-600 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              placeholder="Author name"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          disabled={!isDirty || saving}
          onClick={handleSave}
          className="h-8 text-xs"
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {savedAt && (
          <span className="text-xs text-emerald-400">Saved</span>
        )}
      </div>
    </div>
  );
}
