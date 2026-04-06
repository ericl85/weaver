import { useState, useEffect, useCallback } from 'react';
import { readRawFile, saveRawFile } from '../lib/tauri';

interface Props {
  projectPath: string;
  relativePath: string;
  onClose: () => void;
}

export default function FileEditor({ projectPath, relativePath, onClose }: Props) {
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContent('');
    setDirty(false);
    setError(null);
    readRawFile(projectPath, relativePath)
      .then((text) => setContent(text))
      .catch((err) => setError(String(err)));
  }, [projectPath, relativePath]);

  const save = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await saveRawFile(projectPath, relativePath, content);
      setDirty(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }, [projectPath, relativePath, content, dirty]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-700 bg-zinc-800 shrink-0">
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-100 text-sm"
          title="Close"
        >
          ← Back
        </button>
        <span className="text-xs text-zinc-400 font-mono truncate flex-1">{relativePath}</span>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="text-xs text-zinc-300 hover:text-zinc-100 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {!dirty && !saving && <span className="text-xs text-zinc-600">Saved</span>}
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-red-400 bg-zinc-800 border-b border-zinc-700 shrink-0">
          {error}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setDirty(true); }}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="flex-1 resize-none bg-zinc-900 text-zinc-100 font-mono text-sm px-6 py-4 focus:outline-none"
      />
    </div>
  );
}
