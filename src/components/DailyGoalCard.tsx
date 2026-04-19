import { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useWordCount } from '../contexts/WordCountContext';
import { useStats } from '../contexts/StatsContext';
import { Progress } from './ui/progress';

export default function DailyGoalCard() {
  const { project, activeChapter } = useProject();
  const { projectTotal } = useWordCount();
  const { stats, celebrationTick, progressDismissed, setProgressDismissed } = useStats();
  const [pulsing, setPulsing] = useState(false);

  const dailyGoal = project?.goals?.dailyWordCount;
  const projectGoal = project?.goals?.projectWordCount;

  // Trigger celebration animation when celebrationTick increments
  useEffect(() => {
    if (celebrationTick === 0) return;
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 800);
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 80, spread: 60, origin: { x: 0.85, y: 0.7 } });
    });
    return () => clearTimeout(timer);
  }, [celebrationTick]);

  if (!project || !activeChapter || !dailyGoal || progressDismissed) return null;

  const startingWords = stats?.currentDay?.startingWordCount ?? projectTotal ?? 0;
  const dailyProgress = projectTotal !== null ? projectTotal - startingWords : 0;
  const dailyPct = Math.min(100, Math.max(0, (dailyProgress / dailyGoal) * 100));
  const dailyOver = dailyProgress >= dailyGoal;
  const dailyNegative = dailyProgress < 0;

  const projectPct = projectGoal && projectTotal !== null
    ? Math.min(100, Math.max(0, (projectTotal / projectGoal) * 100))
    : null;

  function formatNum(n: number) {
    return Math.abs(n).toLocaleString();
  }

  return (
    <div className="absolute bottom-8 right-4 z-10 w-52 rounded-lg bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 p-3 flex flex-col gap-2.5 shadow-lg">
      <button
        onClick={() => setProgressDismissed(true)}
        className="absolute top-1.5 right-2 text-zinc-500 hover:text-zinc-300 text-xs leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>

      {/* Daily goal row */}
      <div className="flex flex-col gap-1">
        <span className={`text-xs font-medium ${dailyNegative ? 'text-red-400' : dailyOver ? 'text-emerald-400' : 'text-zinc-300'}`}>
          {dailyNegative ? `−${formatNum(dailyProgress)}` : formatNum(dailyProgress)} / {formatNum(dailyGoal)} today
          {dailyOver && ' ✓'}
        </span>
        <Progress
          value={dailyPct}
          className={`h-1.5 bg-zinc-700 ${pulsing ? 'animate-pulse' : ''}`}
          indicatorClassName={dailyOver ? 'bg-emerald-400' : 'bg-amber-400'}
        />
      </div>

      {/* Project goal row */}
      {projectGoal != null && projectPct !== null && projectTotal !== null && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">
            {formatNum(projectTotal)} / {formatNum(projectGoal)} project
          </span>
          <Progress value={projectPct} className="h-1.5 bg-zinc-700" indicatorClassName="bg-blue-400" />
        </div>
      )}
    </div>
  );
}
