import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  ECONOMY_VERSION_LABEL,
  MONSOON_RAIN_RANK_REQUIREMENT,
  PERMANENT_UPGRADES,
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  SAVE_KEY,
  SKY_HEART_CORE_TARGET,
  SKY_HEART_CYCLE_TARGET,
  UPGRADE_GROUPS,
  applyCloudTouch,
  applyPermanentUpgradeEffects,
  calculateRates,
  canPay,
  createInitialState,
  formatCost,
  formatElapsedTime,
  formatMissingCost,
  formatNumber,
  formatRate,
  getClickCooldownSeconds,
  getCloudCoreGain,
  getCloudTouchAmount,
  getMonsoonWeatherTarget,
  getNextCloudLevelRequirement,
  getPermanentUpgrade,
  getRainRankRequirement,
  getRecommendedUpgradeGroupId,
  getSkyHeartProgress,
  getUpgrade,
  getUpgradeActionDescription,
  getUpgradeCost,
  isUpgradeVisible,
  normalizeState,
  payCost,
  performRainRankReset,
  runTick,
  syncCloudUnlocks,
  type PermanentUpgradeId,
  type ResourceKey,
  type UpgradeGroupId,
  type UpgradeId,
  type WeatherReactorState,
} from "./game/economy";

type ReactorState = WeatherReactorState & {
  notice: NoticeState | null;
};

type WeatherWindow = Window & {
  __cloudIslandWeatherTickIntervalId?: number;
};

interface NoticeState {
  id: string;
  text: string;
  kind: "info" | "success" | "warning";
}

/**
 * Runs the IMR-style weather incremental route for Cloud Island.
 */
export default function App() {
  const [state, setState] = useState<ReactorState>(() => loadState());
  const [selectedUpgradeGroupId, setSelectedUpgradeGroupId] = useState<UpgradeGroupId>("rainRank");
  const [isPaused, setIsPaused] = useState(false);
  const [showExactDecimals, setShowExactDecimals] = useState(false);
  const [measuredWeatherRate, setMeasuredWeatherRate] = useState(0);
  const lastTickAtMs = useRef<number | null>(null);
  const previousWeatherSample = useRef<{ weather: number; elapsedSeconds: number } | null>(null);
  const displayNumber = (value: number) => formatNumber(value, showExactDecimals);
  const displayRate = (value: number) => formatRate(value, showExactDecimals);
  const displayCost = (cost: Partial<Record<ResourceKey, number>>) => formatCost(cost, showExactDecimals);
  const rates = useMemo(() => calculateRates(state), [state]);
  const unlockedUpgradeGroups = useMemo(() => UPGRADE_GROUPS.filter((group) => group.isUnlocked(state)), [state]);
  const recommendedUpgradeGroupId = useMemo(
    () => getRecommendedUpgradeGroupId(state, unlockedUpgradeGroups),
    [state, unlockedUpgradeGroups],
  );
  const activeUpgradeGroup = unlockedUpgradeGroups.find((group) => group.id === selectedUpgradeGroupId)
    ?? unlockedUpgradeGroups[0]
    ?? UPGRADE_GROUPS[0];
  const visibleRunUpgrades = activeUpgradeGroup.upgradeIds
    .filter((upgradeId) => isUpgradeVisible(state, upgradeId))
    .map((upgradeId) => getUpgrade(upgradeId));
  const nextLockedUpgradeGroup = UPGRADE_GROUPS.find((group) => !group.isUnlocked(state));
  const nextGoal = getNextGoal(state, showExactDecimals);
  const nextRainRankRequirement = getRainRankRequirement(state);
  const monsoonWeatherTarget = getMonsoonWeatherTarget(state);
  const skyHeartProgress = getSkyHeartProgress(state);
  const canClaimRainRank = state.resources.weather >= nextRainRankRequirement;
  const canRunMonsoon = state.resources.weather >= monsoonWeatherTarget
    && state.rainRanks >= MONSOON_RAIN_RANK_REQUIREMENT
    && state.upgrades.windEye > 0;
  const canAwakenSkyHeart = !state.skyHeartAwakened
    && state.monsoonCycles >= SKY_HEART_CYCLE_TARGET
    && state.totalCloudCores >= SKY_HEART_CORE_TARGET;
  const cloudCoreGain = getCloudCoreGain(state);
  const clickCooldownSeconds = getClickCooldownSeconds(state);
  const canTouchCloud = !isPaused && state.clickCooldownRemaining <= 0;
  const cloudCooldownProgress = canTouchCloud
    ? 1
    : 1 - Math.min(1, state.clickCooldownRemaining / clickCooldownSeconds);

  useEffect(() => {
    const weatherWindow = window as WeatherWindow;
    if (weatherWindow.__cloudIslandWeatherTickIntervalId !== undefined) {
      window.clearInterval(weatherWindow.__cloudIslandWeatherTickIntervalId);
      weatherWindow.__cloudIslandWeatherTickIntervalId = undefined;
    }

    if (isPaused) {
      lastTickAtMs.current = null;
      return;
    }

    lastTickAtMs.current = window.performance.now();
    const intervalId = window.setInterval(() => {
      const now = window.performance.now();
      const previous = lastTickAtMs.current ?? now;
      const elapsedSeconds = Math.min(1, Math.max(0, (now - previous) / 1000));
      lastTickAtMs.current = now;

      if (elapsedSeconds <= 0) {
        return;
      }

      setState((currentState) => runTick(currentState, elapsedSeconds));
    }, 250);
    weatherWindow.__cloudIslandWeatherTickIntervalId = intervalId;

    return () => {
      if (weatherWindow.__cloudIslandWeatherTickIntervalId === intervalId) {
        weatherWindow.__cloudIslandWeatherTickIntervalId = undefined;
      }
      window.clearInterval(intervalId);
    };
  }, [isPaused]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const previousSample = previousWeatherSample.current;
    previousWeatherSample.current = {
      weather: state.resources.weather,
      elapsedSeconds: state.elapsedSeconds,
    };

    if (!previousSample) {
      return;
    }

    const elapsedDelta = state.elapsedSeconds - previousSample.elapsedSeconds;
    if (elapsedDelta <= 0) {
      return;
    }

    const weatherDelta = state.resources.weather - previousSample.weather;
    setMeasuredWeatherRate(Math.max(0, weatherDelta / elapsedDelta));
  }, [state.elapsedSeconds, state.resources.weather]);

  useEffect(() => {
    const selectedGroupIsUnlocked = unlockedUpgradeGroups.some((group) => group.id === selectedUpgradeGroupId);
    if (!selectedGroupIsUnlocked) {
      setSelectedUpgradeGroupId(recommendedUpgradeGroupId);
    }
  }, [recommendedUpgradeGroupId, selectedUpgradeGroupId, unlockedUpgradeGroups]);

  useEffect(() => {
    if (!state.notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setState((currentState) => ({ ...currentState, notice: null }));
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [state.notice?.id]);

  function touchCloudLayer() {
    setState((currentState) => {
      if (isPaused || currentState.clickCooldownRemaining > 0) {
        return currentState;
      }

      const amount = getCloudTouchAmount(currentState);
      const nextState = applyCloudTouch(currentState);

      return {
        ...nextState,
        notice: createNotice("success", `第一层云注入 ${displayNumber(amount)} 天气活力。`),
      };
    });
  }

  function claimRainRank() {
    setState((currentState) => {
      if (currentState.resources.weather < getRainRankRequirement(currentState)) {
        return {
          ...currentState,
          notice: createNotice("warning", `还需要 ${displayNumber(getRainRankRequirement(currentState))} 天气活力。`),
        };
      }

      const nextState = performRainRankReset(currentState);
      return {
        ...nextState,
        notice: createNotice("success", `雨阶凝结到 ${nextState.rainRanks}。`),
      };
    });
  }

  function buyUpgrade(upgradeId: UpgradeId) {
    setState((currentState) => {
      const upgrade = getUpgrade(upgradeId);
      const cost = getUpgradeCost(currentState, upgrade);

      if (!canPay(currentState.resources, cost)) {
        return {
          ...currentState,
          notice: createNotice("warning", `还需要 ${formatMissingCost(currentState.resources, cost, showExactDecimals)}。`),
        };
      }

      return {
        ...currentState,
        resources: payCost(currentState.resources, cost),
        upgrades: {
          ...currentState.upgrades,
          [upgradeId]: currentState.upgrades[upgradeId] + 1,
        },
        notice: createNotice("success", `${upgrade.name} Lv.${currentState.upgrades[upgradeId] + 1}`),
      };
    });
  }

  function buyPermanentUpgrade(upgradeId: PermanentUpgradeId) {
    setState((currentState) => {
      const upgrade = getPermanentUpgrade(upgradeId);
      if (currentState.permanentUpgrades.includes(upgradeId)) {
        return currentState;
      }

      if (currentState.cloudCores < upgrade.cost) {
        return {
          ...currentState,
          notice: createNotice("warning", `云核不足，还需要 ${upgrade.cost - currentState.cloudCores}。`),
        };
      }

      const nextPermanentUpgrades = [...currentState.permanentUpgrades, upgradeId];
      return applyPermanentUpgradeEffects({
        ...currentState,
        cloudCores: currentState.cloudCores - upgrade.cost,
        permanentUpgrades: nextPermanentUpgrades,
        notice: createNotice("success", `${upgrade.name} 已写入天空。`),
      }, upgradeId);
    });
  }

  function runMonsoonCycle() {
    setState((currentState) => {
      const currentTarget = getMonsoonWeatherTarget(currentState);
      if (
        currentState.resources.weather < currentTarget
        || currentState.rainRanks < MONSOON_RAIN_RANK_REQUIREMENT
        || currentState.upgrades.windEye <= 0
      ) {
        return {
          ...currentState,
          notice: createNotice(
            "warning",
            `需要 ${MONSOON_RAIN_RANK_REQUIREMENT} 雨阶、风眼牵引，并让天气活力达到 ${displayNumber(currentTarget)}。`,
          ),
        };
      }

      const gainedCloudCores = getCloudCoreGain(currentState);
      const nextState = createAppState({
        cloudCores: currentState.cloudCores + gainedCloudCores,
        totalCloudCores: currentState.totalCloudCores + gainedCloudCores,
        monsoonCycles: currentState.monsoonCycles + 1,
        permanentUpgrades: currentState.permanentUpgrades,
        skyHeartAwakened: currentState.skyHeartAwakened,
        elapsedSeconds: currentState.elapsedSeconds,
      });

      return {
        ...nextState,
        notice: createNotice("success", `季风循环完成，凝结 ${gainedCloudCores} 云核。`),
      };
    });
  }

  function awakenSkyHeart() {
    setState((currentState) => {
      if (currentState.skyHeartAwakened) {
        return currentState;
      }

      if (currentState.monsoonCycles < SKY_HEART_CYCLE_TARGET || currentState.totalCloudCores < SKY_HEART_CORE_TARGET) {
        return {
          ...currentState,
          notice: createNotice("warning", "还没有足够的季风循环和云核记忆。"),
        };
      }

      return {
        ...currentState,
        skyHeartAwakened: true,
        notice: createNotice("success", "天空心脏醒来，空岛天气进入稳定自循环。"),
      };
    });
  }

  function resetAll() {
    window.localStorage.removeItem(SAVE_KEY);
    setIsPaused(false);
    setState(createAppState());
  }

  return (
    <main className="weather-shell">
      <aside className="weather-panel weather-panel--left" aria-label="天气资源">
        <header className="weather-brand">
          <span>☁️</span>
          <div>
            <p>Cloud Island</p>
            <h1>天气反应堆</h1>
            <small>{ECONOMY_VERSION_LABEL}</small>
          </div>
        </header>

        <section className="run-timer" aria-label="本轮计时">
          <span>本轮计时</span>
          <strong>{formatElapsedTime(state.elapsedSeconds)}</strong>
          <em>{isPaused ? "已暂停" : "运行中"}</em>
          <small>
            被动 {displayRate(rates.weather)}/秒 · 实测 {displayRate(measuredWeatherRate)}/秒
          </small>
        </section>

        <section className="weather-summary">
          <div>
            <span>天气活力</span>
            <strong>{displayNumber(state.resources.weather)}</strong>
          </div>
          <div>
            <span>雨阶</span>
            <strong>{displayNumber(state.rainRanks)}</strong>
          </div>
          <div>
            <span>云核/记忆</span>
            <strong>{displayNumber(state.cloudCores)}/{displayNumber(state.totalCloudCores)}</strong>
          </div>
        </section>

        <section className="goal-card">
          <span className="section-kicker">下一目标</span>
          <h2>{nextGoal.title}</h2>
          <p>{nextGoal.description}</p>
          <div className="goal-meter" aria-hidden="true">
            <i style={{ "--progress": nextGoal.progress } as CSSProperties} />
          </div>
        </section>

        <section className="resource-stack">
          {RESOURCE_KEYS.map((resourceKey) => (
            <div key={resourceKey} className="reactor-resource">
              <span className="resource-icon">{RESOURCE_LABELS[resourceKey].icon}</span>
              <div>
                <strong>{RESOURCE_LABELS[resourceKey].name}</strong>
                <small>{RESOURCE_LABELS[resourceKey].description}</small>
              </div>
              <div>
                <strong>{displayNumber(state.resources[resourceKey])}</strong>
                <em>+{displayRate(rates[resourceKey])}/秒</em>
              </div>
            </div>
          ))}
        </section>

        <div className="panel-controls">
          <button type="button" className="ghost-button" onClick={() => setIsPaused((paused) => !paused)}>
            {isPaused ? "继续运行" : "暂停"}
          </button>
          <button type="button" className="ghost-button" onClick={() => setShowExactDecimals((enabled) => !enabled)}>
            {showExactDecimals ? "简洁显示" : "小数显示"}
          </button>
          <button type="button" className="ghost-button" onClick={resetAll}>
            重置存档
          </button>
        </div>
      </aside>

      <section className="island-reactor" aria-label="空岛天气反应堆">
        <div className="sky-status">
          <span>从点击第一次云层降下雨水开始</span>
          <strong>重塑这个空岛的天气活力</strong>
        </div>

        {state.notice ? (
          <div className={`reactor-notice reactor-notice--${state.notice.kind}`} role="status">
            {state.notice.text}
          </div>
        ) : null}

        <button
          type="button"
          className={canTouchCloud ? "cloud-core-button" : "cloud-core-button cloud-core-button--cooling"}
          disabled={!canTouchCloud}
          onClick={touchCloudLayer}
        >
          <span className="cloud-visual">
            <i />
            <i />
            <i />
          </span>
          <span className="cloud-action-status">
            <strong>{isPaused ? "天气已暂停" : canTouchCloud ? "点击云层注入天气活力" : "云层正在回拢"}</strong>
            <small>{canTouchCloud ? `+${displayNumber(getCloudTouchAmount(state))} 天气活力` : "准备下一次注入"}</small>
            <span
              className={canTouchCloud ? "cloud-cooldown-meter cloud-cooldown-meter--ready" : "cloud-cooldown-meter"}
              aria-hidden="true"
            >
              <i style={{ "--progress": cloudCooldownProgress } as CSSProperties} />
            </span>
          </span>
        </button>

        <div className="reactor-column" aria-label="天气生产者链">
          <ReactorNode
            icon="💧"
            title="雨滴推动活力"
            description="雨滴越多，天气活力增长越快。"
            active={state.upgrades.dropletSeed > 0}
          />
          <ReactorNode
            icon="🌱"
            title="根系生成雨滴"
            description="根系开始把空岛复苏转成雨滴。"
            active={state.upgrades.rootWake > 0}
          />
          <ReactorNode
            icon="☁️"
            title="云团滋养根系"
            description="云团把根系生产推上下一层。"
            active={state.upgrades.cloudBloom > 0}
          />
          <ReactorNode
            icon="〰️"
            title="风眼牵引云团"
            description="风眼形成后，云团开始自动增长。"
            active={state.upgrades.windEye > 0}
          />
        </div>

        <section className={canClaimRainRank ? "monsoon-card monsoon-card--ready" : "monsoon-card"}>
          <div>
            <span className="section-kicker">小 Reset</span>
            <h2>凝结雨阶</h2>
            <p>
              达到 {displayNumber(nextRainRankRequirement)} 天气活力后，重置当前天气活力，
              获得 1 次雨阶；天气活力收入变为 1 + 雨阶 倍。
            </p>
          </div>
          <div className="monsoon-reward">
            <span>当前雨阶</span>
            <strong>{displayNumber(state.rainRanks)}</strong>
          </div>
          <button type="button" disabled={!canClaimRainRank} onClick={claimRainRank}>
            凝结雨阶
          </button>
        </section>

        <section className={canRunMonsoon ? "monsoon-card monsoon-card--ready" : "monsoon-card"}>
          <div>
            <span className="section-kicker">第一层 Reset</span>
            <h2>季风循环</h2>
            <p>
              达到 {MONSOON_RAIN_RANK_REQUIREMENT} 雨阶、形成风眼，并积累 {displayNumber(monsoonWeatherTarget)} 天气活力后，重置本轮天气，
              凝结永久云核。
            </p>
          </div>
          <div className="monsoon-reward">
            <span>本轮可得</span>
            <strong>{cloudCoreGain} 云核</strong>
          </div>
          <button type="button" disabled={!canRunMonsoon} onClick={runMonsoonCycle}>
            执行季风循环
          </button>
        </section>

        <section className={canAwakenSkyHeart ? "endgame-card endgame-card--ready" : "endgame-card"}>
          <div>
            <span className="section-kicker">终局目标</span>
            <h2>{state.skyHeartAwakened ? "天空心脏已苏醒" : "唤醒天空心脏"}</h2>
            <p>
              完成 {SKY_HEART_CYCLE_TARGET} 次季风循环，并累计凝结 {SKY_HEART_CORE_TARGET} 云核，
              让空岛天气获得完整自循环。
            </p>
            <div className="goal-meter" aria-hidden="true">
              <i style={{ "--progress": skyHeartProgress } as CSSProperties} />
            </div>
          </div>
          <button type="button" disabled={!canAwakenSkyHeart || state.skyHeartAwakened} onClick={awakenSkyHeart}>
            {state.skyHeartAwakened ? "已完成" : "唤醒"}
          </button>
        </section>
      </section>

      <aside className="weather-panel weather-panel--right" aria-label="升级与云核天赋">
        <section>
          <span className="section-kicker">本轮升级</span>
          <div className="upgrade-group-tabs" role="tablist" aria-label="升级阶段">
            {unlockedUpgradeGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={group.id === activeUpgradeGroup.id}
                className={[
                  "upgrade-group-tab",
                  group.id === activeUpgradeGroup.id ? "upgrade-group-tab--active" : "",
                  group.id === recommendedUpgradeGroupId ? "upgrade-group-tab--recommended" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setSelectedUpgradeGroupId(group.id)}
              >
                <span>{group.badge}</span>
                <strong>{group.title}</strong>
              </button>
            ))}
          </div>

          <div className="upgrade-list">
            {visibleRunUpgrades.map((upgrade) => {
              const cost = getUpgradeCost(state, upgrade);
              const affordable = canPay(state.resources, cost);
              const upgradeAction = getUpgradeActionDescription(state, upgrade, showExactDecimals);

              return (
                <button
                  key={upgrade.id}
                  type="button"
                  className={affordable ? "upgrade-card upgrade-card--ready" : "upgrade-card"}
                  onClick={() => buyUpgrade(upgrade.id)}
                >
                  <span>
                    <strong>{upgrade.name} Lv.{state.upgrades[upgrade.id]}</strong>
                    <em className="upgrade-action">{upgradeAction}</em>
                  </span>
                  <small>{displayCost(cost)}</small>
                </button>
              );
            })}
          </div>

          {nextLockedUpgradeGroup ? (
            <div className="upgrade-locked-preview">
              <span>下一组</span>
              <strong>
                {nextLockedUpgradeGroup.badge} {nextLockedUpgradeGroup.title}
              </strong>
              <small>{nextLockedUpgradeGroup.lockedHint}</small>
            </div>
          ) : null}
        </section>

        <section>
          <span className="section-kicker">云核天赋</span>
          <div className="upgrade-list">
            {PERMANENT_UPGRADES.map((upgrade) => {
              const owned = state.permanentUpgrades.includes(upgrade.id);
              const affordable = state.cloudCores >= upgrade.cost;

              return (
                <button
                  key={upgrade.id}
                  type="button"
                  className={[
                    "upgrade-card",
                    owned ? "upgrade-card--owned" : "",
                    !owned && affordable ? "upgrade-card--ready" : "",
                  ].filter(Boolean).join(" ")}
                  disabled={owned}
                  onClick={() => buyPermanentUpgrade(upgrade.id)}
                >
                  <span>
                    <strong>{upgrade.name}</strong>
                    <em>{upgrade.description}</em>
                  </span>
                  <small>{owned ? "已拥有" : `${upgrade.cost} 云核`}</small>
                </button>
              );
            })}
          </div>
        </section>
      </aside>
    </main>
  );
}

interface ReactorNodeProps {
  icon: string;
  title: string;
  description: string;
  active: boolean;
}

/**
 * Renders one step in the straight weather production pillar.
 */
function ReactorNode({ icon, title, description, active }: ReactorNodeProps) {
  return (
    <div className={active ? "reactor-node reactor-node--active" : "reactor-node"}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{active ? description : "待点亮"}</small>
      </div>
    </div>
  );
}

function createAppState(meta?: Parameters<typeof createInitialState>[0]): ReactorState {
  return {
    ...createInitialState(meta),
    notice: null,
  };
}

/**
 * Loads a saved weather reactor state.
 */
function loadState(): ReactorState {
  if (typeof window === "undefined") {
    return createAppState();
  }

  const rawSave = window.localStorage.getItem(SAVE_KEY);
  if (!rawSave) {
    return createAppState();
  }

  try {
    return {
      ...normalizeState(JSON.parse(rawSave) as Partial<WeatherReactorState>),
      notice: null,
    };
  } catch {
    window.localStorage.removeItem(SAVE_KEY);
    return createAppState();
  }
}

/**
 * Saves serializable reactor progress.
 */
function saveState(state: ReactorState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, notice: null }));
}

/**
 * Builds the next visible goal for the player.
 */
function getNextGoal(state: ReactorState, exact = false) {
  if (state.skyHeartAwakened) {
    return {
      title: "天空心脏已苏醒",
      description: "空岛天气已经完成第一版终局。可以继续刷更高天气活力，或重置存档再试一条路线。",
      progress: 1,
    };
  }

  if (state.cloudLevel === 0) {
    const nextRequirement = getNextCloudLevelRequirement(state);
    return {
      title: "显露第一次本轮升级",
      description: `本轮最高天气活力达到 ${formatNumber(nextRequirement, exact)} 后，第一批升级会自动显露。`,
      progress: Math.min(1, state.bestWeather / nextRequirement),
    };
  }

  if (state.upgrades.cloudTouch === 0) {
    const cost = getUpgradeCost(state, getUpgrade("cloudTouch"));
    return {
      title: "强化第一次点击",
      description: "购买云层注入，让点击注入的天气活力立刻变强。",
      progress: Math.min(1, state.resources.weather / (cost.weather ?? 1)),
    };
  }

  if (state.upgrades.dropletSeed === 0) {
    const cost = getUpgradeCost(state, getUpgrade("dropletSeed"));
    return {
      title: "解放第一次等待",
      description: "购买活力基流，让天气活力开始自动增长。",
      progress: Math.min(1, state.resources.weather / (cost.weather ?? 1)),
    };
  }

  if (state.rainRanks === 0) {
    const requirement = getRainRankRequirement(state);
    return {
      title: "凝结第一次雨阶",
      description: `天气活力达到 ${formatNumber(requirement, exact)} 后，进行第一次小 reset。`,
      progress: Math.min(1, state.resources.weather / requirement),
    };
  }

  if (state.upgrades.rootWake === 0) {
    return {
      title: "唤醒根系生产雨滴",
      description: "购买根系苏醒，让天气活力开始进入自动增长链。",
      progress: Math.min(1, state.resources.weather / (getUpgrade("rootWake").baseCost.weather ?? 1)),
    };
  }

  if (state.rainRanks < 3) {
    const requirement = getRainRankRequirement(state);
    return {
      title: "继续凝结雨阶",
      description: "雨阶越高，天气活力增长越快，后续生产者也会显露。",
      progress: Math.min(1, state.resources.weather / requirement),
    };
  }

  if (state.upgrades.cloudBloom === 0) {
    const cost = getUpgradeCost(state, getUpgrade("cloudBloom"));
    return {
      title: "孕育第一团云",
      description: "云团会生成根系，把生产链推到第三层。",
      progress: Math.min(1, state.resources.weather / (cost.weather ?? 1)),
    };
  }

  if (state.upgrades.windEye === 0) {
    const cost = getUpgradeCost(state, getUpgrade("windEye"));
    return {
      title: "形成风眼",
      description: "风眼会生成云团，让生产者链完整闭合。",
      progress: Math.min(1, state.resources.weather / (cost.weather ?? 1)),
    };
  }

  if (state.rainRanks < MONSOON_RAIN_RANK_REQUIREMENT) {
    const requirement = getRainRankRequirement(state);
    return {
      title: `冲向 ${MONSOON_RAIN_RANK_REQUIREMENT} 雨阶`,
      description: `${MONSOON_RAIN_RANK_REQUIREMENT} 雨阶后可以准备第一次季风循环。`,
      progress: Math.min(1, state.rainRanks / MONSOON_RAIN_RANK_REQUIREMENT, state.resources.weather / requirement),
    };
  }

  const monsoonTarget = getMonsoonWeatherTarget(state);
  if (state.upgrades.monsoonPull < 3 && state.resources.weather < monsoonTarget) {
    const cost = getUpgradeCost(state, getUpgrade("monsoonPull"));
    return {
      title: "牵引第一次季风",
      description: `推荐行动：购买季风牵引，把第 ${MONSOON_RAIN_RANK_REQUIREMENT} 雨阶后的等待变成爆发冲刺。`,
      progress: Math.min(1, state.resources.weather / (cost.weather ?? monsoonTarget)),
    };
  }

  if (state.resources.weather < monsoonTarget) {
    return {
      title: state.monsoonCycles === 0 ? "冲向第一次季风循环" : `冲向第 ${state.monsoonCycles + 1} 次季风循环`,
      description: `天气活力达到 ${formatNumber(monsoonTarget, exact)} 后凝结云核。`,
      progress: Math.min(1, state.resources.weather / monsoonTarget),
    };
  }

  if (state.monsoonCycles >= SKY_HEART_CYCLE_TARGET && state.totalCloudCores >= SKY_HEART_CORE_TARGET) {
    return {
      title: "唤醒天空心脏",
      description: "终局条件已经达成，执行最后一步让天气系统完整自循环。",
      progress: 1,
    };
  }

  return {
    title: "执行季风循环",
    description: "重置本轮天气，获得云核，让下一轮更快活过来。",
    progress: 1,
  };
}

/**
 * Creates a short lived UI notice.
 */
function createNotice(kind: NoticeState["kind"], text: string): NoticeState {
  return {
    id: `${Date.now()}-${Math.random()}`,
    text,
    kind,
  };
}
