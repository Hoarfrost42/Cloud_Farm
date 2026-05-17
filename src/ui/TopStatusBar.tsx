import type { GoalViewModel, HudResourceViewModel, IslandMood } from "../game/economy";
import { formatElapsedTime } from "../game/economy";
import { getUiRegionProps } from "./uiRegions";

interface TopStatusBarProps {
  mood: IslandMood;
  stats: HudResourceViewModel[];
  goal: GoalViewModel;
  elapsedSeconds: number;
  isPaused: boolean;
  onTogglePause: () => void;
}

/**
 * Renders the compact island recovery pulse bar.
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
    <header {...getUiRegionProps("pulseBar", "top-status-bar")}>
      <div className="top-status-brand">
        <span className="brand-mark" aria-hidden="true">晴</span>
        <div>
          <strong>云屿回晴</strong>
          <small>{mood.title} · 空岛复苏手账</small>
        </div>
      </div>

      <div className="top-status-stats" aria-label="晴雨脉象">
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
        <span>回晴目标</span>
        <strong>{goal.title}</strong>
      </div>

      <div className="top-status-actions">
        <time>{formatElapsedTime(elapsedSeconds)}</time>
        <button type="button" onClick={onTogglePause}>{isPaused ? "继续" : "暂停"}</button>
      </div>
    </header>
  );
}
