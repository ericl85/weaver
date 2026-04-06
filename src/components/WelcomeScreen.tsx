import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { createProject, openProject } from '../lib/tauri';
import { useProject } from '../contexts/ProjectContext';

type Mode = 'idle' | 'new';

export default function WelcomeScreen() {
  const { setProject } = useProject();
  const [mode, setMode] = useState<Mode>('idle');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickFolder() {
    const selected = await open({ directory: true, multiple: false, title: 'Choose project folder' });
    if (selected && typeof selected === 'string') {
      setFolderPath(selected);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !folderPath) return;
    setBusy(true);
    setError(null);
    try {
      const project = await createProject(title.trim(), author.trim(), folderPath);
      setProject(project);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  async function handleOpen() {
    const selected = await open({ directory: true, multiple: false, title: 'Open Weaver project' });
    if (!selected || typeof selected !== 'string') return;
    setBusy(true);
    setError(null);
    try {
      const project = await openProject(selected);
      setProject(project);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-zinc-900 text-zinc-100">
      <div className="w-full max-w-md px-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Weaver</h1>
        <p className="text-zinc-400 text-sm mb-10">A distraction-free novel writing environment.</p>

        {mode === 'idle' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setMode('new'); setError(null); }}
              className="w-full py-2.5 px-4 rounded bg-zinc-100 text-zinc-900 font-medium text-sm hover:bg-white transition-colors"
            >
              New Project
            </button>
            <button
              onClick={handleOpen}
              disabled={busy}
              className="w-full py-2.5 px-4 rounded bg-zinc-800 text-zinc-100 font-medium text-sm border border-zinc-700 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              Open Project
            </button>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>
        )}

        {mode === 'new' && (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="My Novel"
                autoFocus
                required
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Author</label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="Your name"
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Location</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderPath}
                  readOnly
                  placeholder="Choose a folder..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 cursor-default"
                />
                <button
                  type="button"
                  onClick={pickFolder}
                  className="px-3 py-2 rounded bg-zinc-700 text-zinc-100 text-sm hover:bg-zinc-600 transition-colors shrink-0"
                >
                  Browse
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={busy || !title.trim() || !folderPath}
                className="flex-1 py-2.5 px-4 rounded bg-zinc-100 text-zinc-900 font-medium text-sm hover:bg-white transition-colors disabled:opacity-40"
              >
                {busy ? 'Creating…' : 'Create Project'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('idle'); setError(null); setTitle(''); setAuthor(''); setFolderPath(''); }}
                className="px-4 py-2.5 rounded bg-zinc-800 text-zinc-400 text-sm border border-zinc-700 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
