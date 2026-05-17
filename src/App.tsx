import { useEffect, useMemo, useRef, useState } from "react";
import {
  LEGACY_SAVE_KEY,
  MONSOON_RAIN_RANK_REQUIREMENT,
  SAVE_KEY,
  UPGRADE_GROUPS,
  applyCloudTouch,
  applyPermanentUpgradeEffects,
  canAwakenSkyHeart as canAwakenSkyHeartState,
  canBuySkyHeartPulse as canBuySkyHeartPulseState,
  canClaimRainRank as canClaimRainRankState,
  canPay,
  canRunClimateRewrite,
  canRunFrontEchoReset,
  canRunMonsoon as canRunMonsoonState,
  canRunStormFront,
  createInitialState,
  formatMissingCost,
  formatNumber,
  getClickCooldownSeconds,
  getClimateLaw,
  getClimateThreadGain,
  getCloudCoreGain,
  getCloudTouchAmount,
  getCurrentMainlineMilestone,
  getIslandMood,
  getLayerUpgradeCost,
  getMonsoonWeatherTarget,
  getPermanentUpgrade,
  getPressureUpgrade,
  getPrimaryAction,
  getPrimaryGoalViewModel,
  getRainRankRequirement,
  getRecommendedUpgradeGroupId,
  getStormCellGain,
  getStormUpgrade,
  getUnlockedMainTabs,
  getUpgrade,
  getUpgradeCost,
  getVisibleHudStats,
  isRunUpgradeMaxed,
  isUpgradeVisible,
  normalizeState,
  payCost,
  performClimateRewrite,
  performFrontEchoReset,
  performMonsoonReset,
  performRainRankReset,
  performSkyHeartPulse,
  performStormFrontReset,
  awakenSkyHeart as performSkyHeartAwakening,
  runTick,
  type ClimateLawId,
  type MainTabId,
  type PermanentUpgradeId,
  type PressureUpgradeId,
  type PrimaryActionId,
  type StormUpgradeId,
  type UpgradeGroupId,
  type UpgradeId,
  type WeatherReactorState,
} from "./game/economy";
import { MainTabs } from "./ui/MainTabs";
import { MilestoneFooter } from "./ui/MilestoneFooter";
import { ReactorStagePanel } from "./ui/ReactorStagePanel";
import { TopStatusBar } from "./ui/TopStatusBar";
import { WorkbenchPanel } from "./ui/WorkbenchPanel";

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
 * Runs the weather reactor incremental loop and delegates display to HUD components.
 */
export default function App() {
  const [state, setState] = useState<ReactorState>(() => loadState());
  const [selectedUpgradeGroupId, setSelectedUpgradeGroupId] = useState<UpgradeGroupId>("rainRank");
  const [activeTab, setActiveTab] = useState<MainTabId>("runUpgrades");
  const [isPaused, setIsPaused] = useState(false);
  const [showExactDecimals, setShowExactDecimals] = useState(false);
  const lastTickAtMs = useRef<number | null>(null);

  const displayNumber = (value: number) => formatNumber(value, showExactDecimals);
  const mood = useMemo(() => getIslandMood(state), [state]);
  const hudStats = useMemo(() => getVisibleHudStats(state, showExactDecimals), [state, showExactDecimals]);
  const primaryGoal = useMemo(() => getPrimaryGoalViewModel(state, showExactDecimals), [state, showExactDecimals]);
  const primaryAction = useMemo(() => getPrimaryAction(state), [state]);
  const unlockedMainTabs = useMemo(() => getUnlockedMainTabs(state), [state]);
  const unlockedUpgradeGroups = useMemo(() => UPGRADE_GROUPS.filter((group) => group.isUnlocked(state)), [state]);
  const recommendedUpgradeGroupId = useMemo(
    () => getRecommendedUpgradeGroupId(state, unlockedUpgradeGroups),
    [state, unlockedUpgradeGroups],
  );
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

      if (elapsedSeconds > 0) {
        setState((currentState) => runTick(currentState, elapsedSeconds));
      }
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
    const selectedGroupIsUnlocked = unlockedUpgradeGroups.some((group) => group.id === selectedUpgradeGroupId);
    if (!selectedGroupIsUnlocked) {
      setSelectedUpgradeGroupId(recommendedUpgradeGroupId);
    }
  }, [recommendedUpgradeGroupId, selectedUpgradeGroupId, unlockedUpgradeGroups]);

  useEffect(() => {
    const activeTabIsUnlocked = unlockedMainTabs.some((tab) => tab.id === activeTab);
    if (!activeTabIsUnlocked) {
      setActiveTab("runUpgrades");
    }
  }, [activeTab, unlockedMainTabs]);

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

      if (!isUpgradeVisible(currentState, upgradeId)) {
        return {
          ...currentState,
          notice: createNotice("warning", "这个本轮升级还没有显露。"),
        };
      }

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
      const spentOnTrunk = gainedStormCells - (nextState.stormCells - currentState.stormCells);
      const firstStormText = currentState.totalStormFronts === 0 && spentOnTrunk > 0
        ? `其中 ${spentOnTrunk} 点点亮风暴主干。`
        : "";
      return {
        ...nextState,
        notice: createNotice("success", `风暴前线完成，获得 ${gainedStormCells} 风暴胞。${firstStormText}`),
      };
    });
  }

  function runFrontEchoReset() {
    setState((currentState) => {
      if (!canRunFrontEchoReset(currentState)) {
        return {
          ...currentState,
          notice: createNotice("warning", "还没有形成可回响的前线压力。"),
        };
      }

      const nextState = performFrontEchoReset(currentState);
      const gainedEchoes = nextState.frontEchoesThisFront - currentState.frontEchoesThisFront;
      return {
        ...nextState,
        notice: createNotice("success", `前线回响完成，增加 ${gainedEchoes} 层，当前达到 ${nextState.frontEchoesThisFront} 层。`),
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
    setActiveTab("runUpgrades");
    setState(createAppState());
  }

  function runPrimaryAction(actionId: PrimaryActionId) {
    switch (actionId) {
      case "touchCloud":
        touchCloudLayer();
        return;
      case "claimRainRank":
        claimRainRank();
        return;
      case "runMonsoon":
        runMonsoonCycle();
        return;
      case "runStormFront":
        runStormFront();
        return;
      case "runFrontEcho":
        runFrontEchoReset();
        return;
      case "runClimateRewrite":
        runClimateRewrite();
        return;
      case "buySkyHeartPulse":
        buySkyHeartPulse();
        return;
      case "awakenSkyHeart":
        awakenSkyHeart();
        return;
    }
  }

  return (
    <main className={`incremental-shell incremental-shell--${mood.id} ${mood.shellClassName}`}>
      <TopStatusBar
        mood={mood}
        stats={hudStats}
        goal={primaryGoal}
        elapsedSeconds={state.elapsedSeconds}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((paused) => !paused)}
      />

      <MainTabs tabs={unlockedMainTabs} activeTab={activeTab} onChangeTab={setActiveTab} />

      <section className="incremental-main">
        <ReactorStagePanel
          state={state}
          mood={mood}
          goal={primaryGoal}
          primaryAction={primaryAction}
          notice={state.notice}
          isPaused={isPaused}
          canTouchCloud={canTouchCloud}
          cloudCooldownProgress={cloudCooldownProgress}
          displayNumber={displayNumber}
          onTouchCloud={touchCloudLayer}
          onRunPrimaryAction={runPrimaryAction}
        />

        <WorkbenchPanel
          state={state}
          activeTab={activeTab}
          selectedUpgradeGroupId={selectedUpgradeGroupId}
          exact={showExactDecimals}
          onSelectUpgradeGroup={setSelectedUpgradeGroupId}
          onBuyRunUpgrade={buyUpgrade}
          onBuyPermanentUpgrade={buyPermanentUpgrade}
          onBuyPressureUpgrade={buyPressureUpgrade}
          onBuyStormUpgrade={buyStormUpgrade}
          onBuyClimateLaw={buyClimateLaw}
          onRunPrimaryAction={runPrimaryAction}
          onChangeTab={setActiveTab}
          onToggleExact={() => setShowExactDecimals((enabled) => !enabled)}
          onResetAll={resetAll}
        />
      </section>

      <MilestoneFooter goal={primaryGoal} />
    </main>
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
 * Creates a short lived UI notice.
 */
function createNotice(kind: NoticeState["kind"], text: string): NoticeState {
  return {
    id: `${Date.now()}-${Math.random()}`,
    text,
    kind,
  };
}
