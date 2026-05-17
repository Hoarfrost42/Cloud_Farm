import type { CSSProperties } from "react";
import type { GoalViewModel, IslandMood, PrimaryActionId, PrimaryActionViewModel, WeatherReactorState } from "../game/economy";
import { getCloudTouchAmount } from "../game/economy";

interface ReactorStagePanelProps {
  state: WeatherReactorState;
  mood: IslandMood;
  goal: GoalViewModel;
  primaryAction: PrimaryActionViewModel;
  notice: { text: string; kind: "info" | "success" | "warning" } | null;
  isPaused: boolean;
  canTouchCloud: boolean;
  cloudCooldownProgress: number;
  displayNumber: (value: number) => string;
  onTouchCloud: () => void;
  onRunPrimaryAction: (actionId: PrimaryActionId) => void;
}

/**
 * Renders the compact living island stage and the current major action.
 */
export function ReactorStagePanel({
  state,
  mood,
  goal,
  primaryAction,
  notice,
  isPaused,
  canTouchCloud,
  cloudCooldownProgress,
  displayNumber,
  onTouchCloud,
  onRunPrimaryAction,
}: ReactorStagePanelProps) {
  const shouldShowMajorAction = primaryAction.id !== "touchCloud";

  return (
    <aside className={`reactor-stage-panel ${mood.stageClassName}`} aria-label="空岛反应堆">
      <div className={`reactor-weather-effect reactor-weather-effect--${mood.weatherEffect}`} aria-hidden="true" />

      <header className="reactor-stage-panel__header">
        <span>{mood.title}</span>
        <strong>{mood.subtitle}</strong>
      </header>

      {notice ? (
        <div className={`reactor-notice reactor-notice--${notice.kind}`} role="status">
          {notice.text}
        </div>
      ) : null}

      <button
        type="button"
        className={canTouchCloud ? "compact-cloud-button" : "compact-cloud-button compact-cloud-button--cooling"}
        disabled={!canTouchCloud}
        onClick={onTouchCloud}
      >
        <span className="cloud-visual cloud-visual--compact" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="compact-cloud-button__copy">
          <strong>{isPaused ? "天气已暂停" : canTouchCloud ? "点击云层" : "云层回拢中"}</strong>
          <small>{canTouchCloud ? `+${displayNumber(getCloudTouchAmount(state))} 天气活力` : "准备下一次注入"}</small>
        </span>
        <span className="cloud-cooldown-meter" aria-hidden="true">
          <i style={{ "--progress": cloudCooldownProgress } as CSSProperties} />
        </span>
      </button>

      <section className="stage-goal-card">
        <span>当前目标</span>
        <strong>{goal.title}</strong>
        <p>{goal.description}</p>
        <div className="stage-goal-card__meter" aria-hidden="true">
          <i style={{ "--progress": goal.progress } as CSSProperties} />
        </div>
      </section>

      {shouldShowMajorAction ? (
        <button
          type="button"
          className={primaryAction.enabled ? "stage-primary-action stage-primary-action--ready" : "stage-primary-action"}
          disabled={!primaryAction.enabled}
          onClick={() => onRunPrimaryAction(primaryAction.id)}
        >
          <span>
            <small>主动作</small>
            <strong>{primaryAction.title}</strong>
            <em>{primaryAction.description}</em>
          </span>
          <b>{primaryAction.rewardText ?? primaryAction.label}</b>
        </button>
      ) : null}
    </aside>
  );
}

