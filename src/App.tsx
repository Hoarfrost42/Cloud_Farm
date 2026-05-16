import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  ECONOMY_VERSION_LABEL,
  LEGACY_SAVE_KEY,
  CLIMATE_LAWS,
  MONSOON_RAIN_RANK_REQUIREMENT,
  PERMANENT_UPGRADES,
  PRESSURE_UPGRADES,
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  SAVE_KEY,
  STORM_UPGRADES,
  UPGRADE_GROUPS,
  applyCloudTouch,
  applyPermanentUpgradeEffects,
  calculateWeatherPerSecondLog,
  awakenSkyHeart as performSkyHeartAwakening,
  calculateRates,
  canAwakenSkyHeart as canAwakenSkyHeartState,
  canBuySkyHeartPulse as canBuySkyHeartPulseState,
  canClaimRainRank as canClaimRainRankState,
  canPay,
  canRunClimateRewrite,
  canRunMonsoon as canRunMonsoonState,
  canRunStormFront,
  createInitialState,
  formatCost,
  formatElapsedTime,
  formatMissingCost,
  formatNumber,
  formatRate,
  getClickCooldownSeconds,
  getClimateLaw,
  getClimateThreadGain,
  getCloudCoreGain,
  getCloudTouchAmount,
  getCurrentMainlineMilestone,
  getCurrentMilestoneTargetExp,
  getLayerBonusBreakdown,
  getLayerUpgradeCost,
  getMonsoonWeatherTarget,
  getNextCloudLevelRequirement,
  getPermanentUpgrade,
  getPressureUpgrade,
  getRainRankRequirement,
  getRecommendedUpgradeGroupId,
  getSkyHeartProgress,
  getStormCellGain,
  getStormUpgrade,
  getUpgrade,
  getUpgradeActionDescription,
  getUpgradeCost,
  isRunUpgradeMaxed,
  isUpgradeVisible,
  log10Safe,
  normalizeState,
  payCost,
  pow10Clamped,
  performClimateRewrite,
  performMonsoonReset,
  performRainRankReset,
  performSkyHeartPulse,
  performStormFrontReset,
  runTick,
  type ClimateLawId,
  type PermanentUpgradeId,
  type PressureUpgradeId,
  type ResourceKey,
  type StormUpgradeId,
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
  const currentMilestone = getCurrentMainlineMilestone(state);
  const currentMilestoneTargetExp = getCurrentMilestoneTargetExp(state);
  const monsoonWeatherTarget = getMonsoonWeatherTarget(state);
  const skyHeartProgress = getSkyHeartProgress(state);
  const layerBonuses = getLayerBonusBreakdown(state);
  const weatherRateLog = calculateWeatherPerSecondLog(state);
  const baseFormulaLog = Number.isFinite(weatherRateLog) ? weatherRateLog - layerBonuses.total : Number.NEGATIVE_INFINITY;
  const canClaimRainRank = canClaimRainRankState(state);
  const canRunMonsoon = canRunMonsoonState(state);
  const canRunCurrentStormFront = canRunStormFront(state);
  const canRunCurrentClimateRewrite = canRunClimateRewrite(state);
  const canBuySkyHeartPulse = canBuySkyHeartPulseState(state);
  const canAwakenSkyHeart = canAwakenSkyHeartState(state);
  const cloudCoreGain = getCloudCoreGain(state);
  const stormCellGain = getStormCellGain(state);
  const climateThreadGain = getClimateThreadGain(state);
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
    setMeasuredWeatherRate(rates.weather);
  }, [rates.weather]);

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
      if (!canClaimRainRankState(currentState)) {
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

      if (isRunUpgradeMaxed(currentState, upgrade)) {
        return {
          ...currentState,
          notice: createNotice("warning", `${upgrade.name} 已达到上限。`),
        };
      }

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

      if (upgrade.isUnlocked && !upgrade.isUnlocked(currentState)) {
        return {
          ...currentState,
          notice: createNotice("warning", "这个云核天赋还没有显露。"),
        };
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
      const currentMilestone = getCurrentMainlineMilestone(currentState);
      const requiredRainRanks = currentMilestone.requiredRainRanks ?? MONSOON_RAIN_RANK_REQUIREMENT;
      if (!canRunMonsoonState(currentState)) {
        return {
          ...currentState,
          notice: createNotice(
            "warning",
            `需要 ${requiredRainRanks} 雨阶、风眼牵引，并让天气活力达到 ${displayNumber(currentTarget)}。`,
          ),
        };
      }

      const gainedCloudCores = getCloudCoreGain(currentState);
      const nextState = performMonsoonReset(currentState);

      return {
        ...nextState,
        notice: createNotice("success", `季风循环完成，凝结 ${gainedCloudCores} 云核，获得 ${nextState.pressure - currentState.pressure} 气压。`),
      };
    });
  }

  function runStormFront() {
    setState((currentState) => {
      if (!canRunStormFront(currentState)) {
        return {
          ...currentState,
          notice: createNotice("warning", "还没有形成足够强的风暴前线。"),
        };
      }

      const gainedStormCells = getStormCellGain(currentState);
      const nextState = performStormFrontReset(currentState);
      return {
        ...nextState,
        notice: createNotice("success", `风暴前线完成，获得 ${gainedStormCells} 风暴胞。`),
      };
    });
  }

  function runClimateRewrite() {
    setState((currentState) => {
      if (!canRunClimateRewrite(currentState)) {
        return {
          ...currentState,
          notice: createNotice("warning", "还没有足够的风暴前线和天气活力。"),
        };
      }

      const gainedThreads = getClimateThreadGain(currentState);
      const nextState = performClimateRewrite(currentState);
      return {
        ...nextState,
        notice: createNotice("success", `气候改写完成，获得 ${gainedThreads} 气候织线。`),
      };
    });
  }

  function buySkyHeartPulse() {
    setState((currentState) => {
      if (!canBuySkyHeartPulseState(currentState)) {
        return {
          ...currentState,
          notice: createNotice("warning", "天空心脏脉冲还没有准备好。"),
        };
      }

      const nextState = performSkyHeartPulse(currentState);
      return {
        ...nextState,
        notice: createNotice("success", `天空心脏脉冲 ${nextState.skyHeartPulseLevel} 已点亮。`),
      };
    });
  }

  function awakenSkyHeart() {
    setState((currentState) => {
      if (!canAwakenSkyHeartState(currentState)) {
        return {
          ...currentState,
          notice: createNotice("warning", "天气活力还没有抵达 1e308。"),
        };
      }

      return {
        ...performSkyHeartAwakening(currentState),
        notice: createNotice("success", "天空心脏已点燃。"),
      };
    });
  }

  function buyPressureUpgrade(upgradeId: PressureUpgradeId) {
    setState((currentState) => {
      const definition = getPressureUpgrade(upgradeId);
      const level = currentState.pressureUpgrades[upgradeId];
      const cost = getLayerUpgradeCost(definition, level);
      if (cost <= 0 || currentState.pressure < cost) {
        return {
          ...currentState,
          notice: createNotice("warning", "气压不足。"),
        };
      }

      return {
        ...currentState,
        pressure: currentState.pressure - cost,
        totalPressureSpentThisFront: currentState.totalPressureSpentThisFront + cost,
        pressureUpgrades: {
          ...currentState.pressureUpgrades,
          [upgradeId]: level + 1,
        },
        notice: createNotice("success", `${definition.name} Lv.${level + 1}`),
      };
    });
  }

  function buyStormUpgrade(upgradeId: StormUpgradeId) {
    setState((currentState) => {
      const definition = getStormUpgrade(upgradeId);
      const level = currentState.stormUpgrades[upgradeId];
      const cost = getLayerUpgradeCost(definition, level);
      if (cost <= 0 || currentState.stormCells < cost) {
        return {
          ...currentState,
          notice: createNotice("warning", "风暴胞不足。"),
        };
      }

      return {
        ...currentState,
        stormCells: currentState.stormCells - cost,
        stormUpgrades: {
          ...currentState.stormUpgrades,
          [upgradeId]: level + 1,
        },
        notice: createNotice("success", `${definition.name} Lv.${level + 1}`),
      };
    });
  }

  function buyClimateLaw(lawId: ClimateLawId) {
    setState((currentState) => {
      const definition = getClimateLaw(lawId);
      const level = currentState.climateLaws[lawId];
      const cost = getLayerUpgradeCost(definition, level);
      if (cost <= 0 || currentState.climateThreads < cost) {
        return {
          ...currentState,
          notice: createNotice("warning", "气候织线不足。"),
        };
      }

      return {
        ...currentState,
        climateThreads: currentState.climateThreads - cost,
        climateLaws: {
          ...currentState.climateLaws,
          [lawId]: level + 1,
        },
        notice: createNotice("success", `${definition.name} Lv.${level + 1}`),
      };
    });
  }

  function resetAll() {
    window.localStorage.removeItem(SAVE_KEY);
    window.localStorage.removeItem(LEGACY_SAVE_KEY);
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
          <small>
            最高 {state.bestWeatherExp.toFixed(2)} orders · 层级 +{layerBonuses.total.toFixed(1)} orders
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
          <div>
            <span>季风</span>
            <strong>{displayNumber(state.totalMonsoonCycles)}</strong>
          </div>
          <div>
            <span>气压</span>
            <strong>{displayNumber(state.pressure)}</strong>
          </div>
          <div>
            <span>风暴胞</span>
            <strong>{displayNumber(state.stormCells)}/{displayNumber(state.totalStormCells)}</strong>
          </div>
          <div>
            <span>气候织线</span>
            <strong>{displayNumber(state.climateThreads)}/{displayNumber(state.totalClimateThreads)}</strong>
          </div>
        </section>

        <section className="goal-card">
          <span className="section-kicker">下一目标</span>
          <h2>{nextGoal.title}</h2>
          <p>{nextGoal.description}</p>
          <p>
            当前主线：{currentMilestone.title} · 目标 1e{currentMilestoneTargetExp.toFixed(1)}
          </p>
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

        <section className="formula-summary">
          <span className="section-kicker">公式摘要</span>
          <strong>
            天气活力/s = {formatLogRate(baseFormulaLog, showExactDecimals)} × 10^{layerBonuses.total.toFixed(showExactDecimals ? 2 : 1)}
          </strong>
          <div>
            <span>云核 +{layerBonuses.cloudCore.toFixed(1)}</span>
            <span>气压 +{layerBonuses.pressure.toFixed(1)}</span>
            <span>风暴 +{layerBonuses.storm.toFixed(1)}</span>
            <span>气候 +{layerBonuses.climate.toFixed(1)}</span>
            <span>心脏 +{layerBonuses.skyHeart.toFixed(1)}</span>
          </div>
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
              当前季风目标为 1e{currentMilestoneTargetExp.toFixed(1)} 天气活力。达到要求雨阶、形成风眼后，重置本轮天气，
              凝结云核并获得当前前线的气压。
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

        <section className={canRunCurrentStormFront ? "monsoon-card monsoon-card--ready" : "monsoon-card"}>
          <div>
            <span className="section-kicker">第二层 Reset</span>
            <h2>风暴前线</h2>
            <p>
              多次季风组成一个风暴前线。达到 1e{currentMilestoneTargetExp.toFixed(1)} 天气活力并满足本前线季风次数后，获得风暴胞。
            </p>
          </div>
          <div className="monsoon-reward">
            <span>本轮可得</span>
            <strong>{stormCellGain} 风暴胞</strong>
          </div>
          <button type="button" disabled={!canRunCurrentStormFront} onClick={runStormFront}>
            执行风暴前线
          </button>
        </section>

        <section className={canRunCurrentClimateRewrite ? "monsoon-card monsoon-card--ready" : "monsoon-card"}>
          <div>
            <span className="section-kicker">第三层 Reset</span>
            <h2>气候改写</h2>
            <p>
              气候改写会清空当前 run 和当前前线压力，但保留云核、风暴图谱与气候法则，获得气候织线。
            </p>
          </div>
          <div className="monsoon-reward">
            <span>本轮可得</span>
            <strong>{climateThreadGain} 织线</strong>
          </div>
          <button type="button" disabled={!canRunCurrentClimateRewrite} onClick={runClimateRewrite}>
            执行气候改写
          </button>
        </section>

        <section className={canBuySkyHeartPulse ? "monsoon-card monsoon-card--ready" : "monsoon-card"}>
          <div>
            <span className="section-kicker">终局脉冲</span>
            <h2>天空心脏脉冲</h2>
            <p>
              第二次气候改写后，天空心脏脉冲会把天气活力推入 1e308 终局轨道。
            </p>
          </div>
          <div className="monsoon-reward">
            <span>已点亮</span>
            <strong>{state.skyHeartPulseLevel}/3</strong>
          </div>
          <button type="button" disabled={!canBuySkyHeartPulse} onClick={buySkyHeartPulse}>
            点亮脉冲
          </button>
        </section>

        <section className={canAwakenSkyHeart ? "endgame-card endgame-card--ready" : "endgame-card"}>
          <div>
            <span className="section-kicker">终局目标</span>
            <h2>{state.skyHeartAwakened ? "天空心脏已苏醒" : "唤醒天空心脏"}</h2>
            <p>
              当最高天气活力达到 1e308，天空心脏点燃，天气反应堆完成主线闭环。
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
              const maxed = isRunUpgradeMaxed(state, upgrade);
              const affordable = !maxed && canPay(state.resources, cost);
              const upgradeAction = getUpgradeActionDescription(state, upgrade, showExactDecimals);
              const beforeRateLog = calculateWeatherPerSecondLog(state);
              const afterRateLog = previewRunUpgradeRateLog(state, upgrade.id);

              return (
                <button
                  key={upgrade.id}
                  type="button"
                  className={affordable ? "upgrade-card upgrade-card--ready" : "upgrade-card"}
                  onClick={() => buyUpgrade(upgrade.id)}
                  disabled={maxed}
                >
                  <span>
                    <strong>{upgrade.name} Lv.{state.upgrades[upgrade.id]}</strong>
                    <em className="upgrade-action">{upgradeAction}</em>
                    <em className="upgrade-preview">
                      速率 {formatLogRate(beforeRateLog, showExactDecimals)} → {formatLogRate(afterRateLog, showExactDecimals)}/秒
                    </em>
                  </span>
                  <small>{maxed ? "MAX" : displayCost(cost)}</small>
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
              const unlocked = upgrade.isUnlocked ? upgrade.isUnlocked(state) : true;
              const affordable = state.cloudCores >= upgrade.cost;
              const beforeRateLog = calculateWeatherPerSecondLog(state);
              const afterRateLog = previewPermanentUpgradeRateLog(state, upgrade.id);

              return (
                <button
                  key={upgrade.id}
                  type="button"
                  className={[
                    "upgrade-card",
                    owned ? "upgrade-card--owned" : "",
                    !owned && unlocked && affordable ? "upgrade-card--ready" : "",
                  ].filter(Boolean).join(" ")}
                  disabled={owned || !unlocked}
                  onClick={() => buyPermanentUpgrade(upgrade.id)}
                >
                  <span>
                    <strong>{upgrade.name}</strong>
                    <em>{upgrade.description}</em>
                    <em className="upgrade-preview">
                      速率 {formatLogRate(beforeRateLog, showExactDecimals)} → {formatLogRate(afterRateLog, showExactDecimals)}/秒
                    </em>
                  </span>
                  <small>{owned ? "已拥有" : unlocked ? `${upgrade.cost} 云核` : "未显露"}</small>
                </button>
              );
            })}
          </div>
        </section>

        {state.totalMonsoonCycles >= 2 || state.pressure > 0 ? (
          <section>
            <span className="section-kicker">气压升级</span>
            <div className="upgrade-list">
              {PRESSURE_UPGRADES.map((upgrade) => {
                const level = state.pressureUpgrades[upgrade.id];
                const cost = getLayerUpgradeCost(upgrade, level);
                const affordable = cost > 0 && state.pressure >= cost;
                const beforeRateLog = calculateWeatherPerSecondLog(state);
                const afterRateLog = previewPressureUpgradeRateLog(state, upgrade.id);

                return (
                  <button
                    key={upgrade.id}
                    type="button"
                    className={affordable ? "upgrade-card upgrade-card--ready" : "upgrade-card"}
                    disabled={cost <= 0}
                    onClick={() => buyPressureUpgrade(upgrade.id)}
                  >
                    <span>
                      <strong>{upgrade.name} Lv.{level}</strong>
                      <em>{upgrade.description}</em>
                      <em className="upgrade-preview">
                        速率 {formatLogRate(beforeRateLog, showExactDecimals)} → {formatLogRate(afterRateLog, showExactDecimals)}/秒
                      </em>
                    </span>
                    <small>{cost > 0 ? `${cost} 气压` : "已满级"}</small>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {state.totalStormFronts > 0 || state.stormCells > 0 ? (
          <section>
            <span className="section-kicker">风暴图谱</span>
            <div className="upgrade-list">
              {STORM_UPGRADES.map((upgrade) => {
                const level = state.stormUpgrades[upgrade.id];
                const cost = getLayerUpgradeCost(upgrade, level);
                const affordable = cost > 0 && state.stormCells >= cost;
                const beforeRateLog = calculateWeatherPerSecondLog(state);
                const afterRateLog = previewStormUpgradeRateLog(state, upgrade.id);

                return (
                  <button
                    key={upgrade.id}
                    type="button"
                    className={affordable ? "upgrade-card upgrade-card--ready" : "upgrade-card"}
                    disabled={cost <= 0}
                    onClick={() => buyStormUpgrade(upgrade.id)}
                  >
                    <span>
                      <strong>{upgrade.name} Lv.{level}</strong>
                      <em>{upgrade.description}</em>
                      <em className="upgrade-preview">
                        速率 {formatLogRate(beforeRateLog, showExactDecimals)} → {formatLogRate(afterRateLog, showExactDecimals)}/秒
                      </em>
                    </span>
                    <small>{cost > 0 ? `${cost} 风暴胞` : "已满级"}</small>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {state.totalClimateRewrites > 0 || state.climateThreads > 0 ? (
          <section>
            <span className="section-kicker">气候法则</span>
            <div className="upgrade-list">
              {CLIMATE_LAWS.map((law) => {
                const level = state.climateLaws[law.id];
                const cost = getLayerUpgradeCost(law, level);
                const affordable = cost > 0 && state.climateThreads >= cost;
                const beforeRateLog = calculateWeatherPerSecondLog(state);
                const afterRateLog = previewClimateLawRateLog(state, law.id);

                return (
                  <button
                    key={law.id}
                    type="button"
                    className={affordable ? "upgrade-card upgrade-card--ready" : "upgrade-card"}
                    disabled={cost <= 0}
                    onClick={() => buyClimateLaw(law.id)}
                  >
                    <span>
                      <strong>{law.name} Lv.{level}</strong>
                      <em>{law.description}</em>
                      <em className="upgrade-preview">
                        速率 {formatLogRate(beforeRateLog, showExactDecimals)} → {formatLogRate(afterRateLog, showExactDecimals)}/秒
                      </em>
                    </span>
                    <small>{cost > 0 ? `${cost} 织线` : "已满级"}</small>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
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

  const milestone = getCurrentMainlineMilestone(state);
  const milestoneTargetExp = getCurrentMilestoneTargetExp(state);
  const currentWeatherExp = log10Safe(state.resources.weather);
  const requiredRainRanks = milestone.requiredRainRanks ?? MONSOON_RAIN_RANK_REQUIREMENT;

  if (state.rainRanks < requiredRainRanks) {
    const requirement = getRainRankRequirement(state);
    return {
      title: `冲向 ${requiredRainRanks} 雨阶`,
      description: `${requiredRainRanks} 雨阶后可以推进 ${milestone.title}。`,
      progress: Math.min(1, state.rainRanks / requiredRainRanks, state.resources.weather / requirement),
    };
  }

  if (milestone.kind === "monsoon" && state.upgrades.monsoonPull < 3 && currentWeatherExp < milestoneTargetExp) {
    const cost = getUpgradeCost(state, getUpgrade("monsoonPull"));
    return {
      title: state.totalMonsoonCycles === 0 ? "牵引第一次季风" : `牵引${milestone.title}`,
      description: `推荐行动：购买季风牵引，把 ${requiredRainRanks} 雨阶后的等待变成爆发冲刺。`,
      progress: Math.min(1, state.resources.weather / (cost.weather ?? 1)),
    };
  }

  if (currentWeatherExp < milestoneTargetExp) {
    const requirementText = buildMilestoneRequirementText(state, milestone);
    return {
      title: `冲向${milestone.title}`,
      description: `当前天气活力达到 1e${milestoneTargetExp.toFixed(exact ? 2 : 0)} 后${requirementText}。`,
      progress: Math.min(1, Math.max(0, currentWeatherExp) / Math.max(1, milestoneTargetExp)),
    };
  }

  if (milestone.kind === "stormFront" && state.monsoonCyclesInFront < (milestone.requiredMonsoonsInFront ?? 0)) {
    return {
      title: "补足前线季风",
      description: `当前前线需要 ${milestone.requiredMonsoonsInFront ?? 0} 次季风，已完成 ${state.monsoonCyclesInFront} 次。`,
      progress: Math.min(1, state.monsoonCyclesInFront / Math.max(1, milestone.requiredMonsoonsInFront ?? 1)),
    };
  }

  if (milestone.kind === "climateRewrite" && state.totalStormFronts < (milestone.requiredStormFronts ?? 0)) {
    return {
      title: "补足风暴前线",
      description: `气候改写需要 ${milestone.requiredStormFronts ?? 0} 条风暴前线，已完成 ${state.totalStormFronts} 条。`,
      progress: Math.min(1, state.totalStormFronts / Math.max(1, milestone.requiredStormFronts ?? 1)),
    };
  }

  return {
    title: `执行${milestone.title}`,
    description: buildMilestoneActionText(milestone),
    progress: 1,
  };
}

function buildMilestoneRequirementText(state: ReactorState, milestone: ReturnType<typeof getCurrentMainlineMilestone>) {
  const requirements: string[] = [];
  if (milestone.requiredRainRanks !== undefined) {
    requirements.push(`${milestone.requiredRainRanks} 雨阶`);
  }
  if (milestone.requiredMonsoonsInFront !== undefined) {
    requirements.push(`本前线 ${state.monsoonCyclesInFront}/${milestone.requiredMonsoonsInFront} 次季风`);
  }
  if (milestone.requiredStormFronts !== undefined) {
    requirements.push(`${state.totalStormFronts}/${milestone.requiredStormFronts} 条风暴前线`);
  }

  return requirements.length > 0 ? `，并满足 ${requirements.join("、")}` : "";
}

function buildMilestoneActionText(milestone: ReturnType<typeof getCurrentMainlineMilestone>) {
  switch (milestone.kind) {
    case "monsoon":
      return "重置本轮天气，凝结云核，并把前线推进到下一段。";
    case "stormFront":
      return "收束当前前线，获得风暴胞，打开风暴图谱。";
    case "climateRewrite":
      return "重写当前气候层，获得气候织线，压缩旧循环。";
    case "skyPulse":
      return "点亮天空心脏脉冲，把终局天气指数继续抬高。";
    case "ending":
      return "终局条件已经达成，点燃天空心脏。";
    default:
      return "推进当前主线里程碑。";
  }
}

function previewRunUpgradeRateLog(state: ReactorState, upgradeId: UpgradeId) {
  const upgrade = getUpgrade(upgradeId);
  if (isRunUpgradeMaxed(state, upgrade)) {
    return calculateWeatherPerSecondLog(state);
  }

  const cost = getUpgradeCost(state, upgrade);
  const nextState = {
    ...state,
    resources: canPay(state.resources, cost) ? payCost(state.resources, cost) : state.resources,
    upgrades: {
      ...state.upgrades,
      [upgradeId]: state.upgrades[upgradeId] + 1,
    },
  };

  return calculateWeatherPerSecondLog(nextState);
}

function previewPermanentUpgradeRateLog(state: ReactorState, upgradeId: PermanentUpgradeId) {
  if (state.permanentUpgrades.includes(upgradeId)) {
    return calculateWeatherPerSecondLog(state);
  }

  const upgrade = getPermanentUpgrade(upgradeId);
  const nextState = applyPermanentUpgradeEffects({
    ...state,
    cloudCores: Math.max(0, state.cloudCores - upgrade.cost),
    permanentUpgrades: [...state.permanentUpgrades, upgradeId],
  }, upgradeId);

  return calculateWeatherPerSecondLog(nextState);
}

function previewPressureUpgradeRateLog(state: ReactorState, upgradeId: PressureUpgradeId) {
  const upgrade = getPressureUpgrade(upgradeId);
  const level = state.pressureUpgrades[upgradeId];
  const cost = getLayerUpgradeCost(upgrade, level);
  if (cost <= 0) {
    return calculateWeatherPerSecondLog(state);
  }

  return calculateWeatherPerSecondLog({
    ...state,
    pressure: Math.max(0, state.pressure - cost),
    totalPressureSpentThisFront: state.totalPressureSpentThisFront + cost,
    pressureUpgrades: {
      ...state.pressureUpgrades,
      [upgradeId]: level + 1,
    },
  });
}

function previewStormUpgradeRateLog(state: ReactorState, upgradeId: StormUpgradeId) {
  const upgrade = getStormUpgrade(upgradeId);
  const level = state.stormUpgrades[upgradeId];
  const cost = getLayerUpgradeCost(upgrade, level);
  if (cost <= 0) {
    return calculateWeatherPerSecondLog(state);
  }

  return calculateWeatherPerSecondLog({
    ...state,
    stormCells: Math.max(0, state.stormCells - cost),
    stormUpgrades: {
      ...state.stormUpgrades,
      [upgradeId]: level + 1,
    },
  });
}

function previewClimateLawRateLog(state: ReactorState, lawId: ClimateLawId) {
  const law = getClimateLaw(lawId);
  const level = state.climateLaws[lawId];
  const cost = getLayerUpgradeCost(law, level);
  if (cost <= 0) {
    return calculateWeatherPerSecondLog(state);
  }

  return calculateWeatherPerSecondLog({
    ...state,
    climateThreads: Math.max(0, state.climateThreads - cost),
    climateLaws: {
      ...state.climateLaws,
      [lawId]: level + 1,
    },
  });
}

function formatLogRate(logValue: number, exact = false) {
  if (!Number.isFinite(logValue)) {
    return "0";
  }

  return formatRate(pow10Clamped(logValue), exact);
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
