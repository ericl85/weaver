import { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { Button } from '../ui/button';

function parseGoalInput(val: string): number | undefined {
  const n = parseInt(val, 10);
  return val.trim() === '' || n <= 0 || isNaN(n) ? undefined : n;
}

export default function GoalsSettings() {
  const { project, updateGoals } = useProject();
  const [projectWordCount, setProjectWordCount] = useState(
    project?.goals?.projectWordCount?.toString() ?? '',
  );
  const [dailyWordCount, setDailyWordCount] = useState(
    project?.goals?.dailyWordCount?.toString() ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  if (!project) return null;

  const currentProjectGoal = project.goals?.projectWordCount?.toString() ?? '';
  const currentDailyGoal = project.goals?.dailyWordCount?.toString() ?? '';
  const isDirty = projectWordCount !== currentProjectGoal || dailyWordCount !== currentDailyGoal;

  async function handleSave() {
    if (!isDirty) return;
    setSaving(true);
    try {
      await updateGoals({
        projectWordCount: parseGoalInput(projectWordCount),
        dailyWordCount: parseGoalInput(dailyWordCount),
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 1500);
    } catch (e) {
      console.error('Failed to save goals:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">Goals</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-300" htmlFor="project-word-count">
              Project Word Count
            </label>
            <input
              id="project-word-count"
              type="number"
              min="1"
              max="10000000"
              step="1"
              value={projectWordCount}
              onChange={e => setProjectWordCount(e.target.value)}
              className="h-8 rounded-md bg-zinc-800 border border-zinc-600 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              placeholder="e.g. 90,000"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-300" htmlFor="daily-word-count">
              Daily Word Count
            </label>
            <input
              id="daily-word-count"
              type="number"
              min="1"
              max="10000000"
              step="1"
              value={dailyWordCount}
              onChange={e => setDailyWordCount(e.target.value)}
              className="h-8 rounded-md bg-zinc-800 border border-zinc-600 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              placeholder="e.g. 1,000"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between h-8 px-3 rounded-md border border-zinc-700 bg-zinc-800/50">
              <span className="text-sm text-zinc-600">Deadline</span>
              <span className="text-xs text-zinc-600">(coming soon)</span>
            </div>
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
