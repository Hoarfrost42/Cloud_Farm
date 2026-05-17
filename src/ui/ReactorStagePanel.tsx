import { useEffect, useState, type CSSProperties } from "react";
import type { GoalViewModel, IslandMood, PrimaryActionId, PrimaryActionViewModel, WeatherReactorState } from "../game/economy";
import { getCloudTouchAmount } from "../game/economy";
import { getUiRegionProps } from "./uiRegions";

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

interface CloudMistBubble {
  id: number;
  text: string;
  x: number;
  drift: number;
  delay: number;
}

/**
 * Renders the living island recovery stage and the current major action.
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
  const [cloudBurstId, setCloudBurstId] = useState(0);
  const [mistBubbles, setMistBubbles] = useState<CloudMistBubble[]>([]);
  const shouldShowPanelNotice = notice && !notice.text.includes("云注入");

  useEffect(() => {
    if (cloudBurstId === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCloudBurstId(0), 260);
    return () => window.clearTimeout(timeoutId);
  }, [cloudBurstId]);

  useEffect(() => {
    if (mistBubbles.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMistBubbles((currentBubbles) => currentBubbles.slice(1));
    }, 1250);
    return () => window.clearTimeout(timeoutId);
  }, [mistBubbles]);

  function touchCloudWithFeedback() {
    const id = Date.now();
    setCloudBurstId(id);
    setMistBubbles((currentBubbles) => [
      ...currentBubbles.slice(-3),
      {
        id,
        text: `+${displayNumber(getCloudTouchAmount(state))} 天气活力`,
        x: 42 + Math.random() * 18,
        drift: -18 + Math.random() * 36,
        delay: Math.random() * 80,
      },
    ]);
    onTouchCloud();
  }

  return (
    <aside {...getUiRegionProps("revivalStage", `reactor-stage-panel ${mood.stageClassName}`)}>
      <div className={`reactor-weather-effect reactor-weather-effect--${mood.weatherEffect}`} aria-hidden="true" />

      <header className="reactor-stage-panel__header">
        <span>{mood.title}</span>
        <strong>{mood.subtitle}</strong>
      </header>

      {shouldShowPanelNotice ? (
        <div className={`reactor-notice reactor-notice--${notice.kind}`} role="status">
          {notice.text}
        </div>
      ) : null}

      <section className="stage-cloud-field" aria-label="云层触点">
        <img
          className="stage-island-art"
          src="/assets/art/ui/revival_island_stage.png"
          alt=""
          aria-hidden="true"
        />
        <button
          type="button"
          className={[
            "compact-cloud-button",
            canTouchCloud ? "" : "compact-cloud-button--cooling",
            cloudBurstId > 0 ? "compact-cloud-button--burst" : "",
          ].filter(Boolean).join(" ")}
          disabled={!canTouchCloud}
          onClick={touchCloudWithFeedback}
        >
          <span className="cloud-mist-bubbles" aria-hidden="true">
            {mistBubbles.map((bubble) => (
              <i
                key={bubble.id}
                style={{
                  "--bubble-x": `${bubble.x}%`,
                  "--bubble-drift": `${bubble.drift}px`,
                  "--bubble-delay": `${bubble.delay}ms`,
                } as CSSProperties}
              >
                {bubble.text}
              </i>
            ))}
          </span>
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
      </section>

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
            <small>回晴动作</small>
            <strong>{primaryAction.title}</strong>
            <em>{primaryAction.description}</em>
          </span>
          <b>{primaryAction.rewardText ?? primaryAction.label}</b>
        </button>
      ) : null}
    </aside>
  );
}
