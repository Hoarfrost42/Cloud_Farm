import type { GoalViewModel, HudResourceViewModel, IslandMood } from "../game/economy";
import { ECONOMY_VERSION_LABEL, formatElapsedTime } from "../game/economy";

interface TopStatusBarProps {
  mood: IslandMood;
  stats: HudResourceViewModel[];
  goal: GoalViewModel;
  elapsedSeconds: number;
  isPaused: boolean;
  onTogglePause: () => void;
}

/**
 * Renders the thin classic incremental status bar.
 */
export function TopStatusBar({
  mood,
  stats,
  goal,
  elapsedSeconds,
  isPaused,
  onTogglePause,
}: TopStatusBarProps) {
  return (
    <header className="top-status-bar">
      <div className="top-status-brand">
        <span className="brand-mark" aria-hidden="true">CI</span>
        <div>
          <strong>云上小岛</strong>
          <small>{mood.title} · {ECONOMY_VERSION_LABEL}</small>
        </div>
      </div>

      <div className="top-status-stats" aria-label="当前关键资源">
        {stats.map((stat) => (
          <div key={stat.id} className={`top-stat top-stat--${stat.id}`}>
            <i className="top-stat__icon" aria-hidden="true" />
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            {stat.detail ? <small>{stat.detail}</small> : null}
          </div>
        ))}
      </div>

      <div className="top-status-goal">
        <span>目标</span>
        <strong>{goal.title}</strong>
      </div>

      <div className="top-status-actions">
        <time>{formatElapsedTime(elapsedSeconds)}</time>
        <button type="button" onClick={onTogglePause}>{isPaused ? "继续" : "暂停"}</button>
      </div>
    </header>
  );
}
