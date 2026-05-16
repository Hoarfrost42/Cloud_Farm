import {
  CLIMATE_LAWS,
  PERMANENT_UPGRADES,
  PRESSURE_UPGRADES,
  STORM_UPGRADES,
  STORM_TRUNK_UPGRADES,
  UPGRADE_DEFINITIONS,
  applyCloudTouch,
  applyPermanentUpgradeEffects,
  awakenSkyHeart,
  calculateWeatherPerSecondLog,
  canAwakenSkyHeart,
  canBuySkyHeartPulse,
  canClaimRainRank,
  canPay,
  canRunClimateRewrite,
  canRunMonsoon,
  canRunStormFront,
  createInitialState,
  getClimateThreadGain,
  getClickCooldownSeconds,
  getCloudCoreGain,
  getCloudTouchAmount,
  getCurrentMainlineMilestone,
  getCurrentMilestoneTargetExp,
  getAutoDrizzleGain,
  getLayerBonusBreakdown,
  getLayerUpgradeCost,
  getPassiveWeatherGain,
  getPressureGainOnMonsoon,
  getProducerMultiplier,
  getRainRankRequirementExp,
  getStormCellGain,
  getUpgrade,
  getUpgradeCost,
  hasStormTrunk,
  isRunUpgradeMaxed,
  isUpgradeVisible,
  log10Safe,
  logSumExp10,
  payCost,
  performClimateRewrite,
  performMonsoonReset,
  performRainRankReset,
  performSkyHeartPulse,
  performStormFrontReset,
  runTick,
} from "../src/game/economy/index.ts";

const STEP_SECONDS = 1;
const MAX_SECONDS = 12 * 60 * 60;
const QUIET_WARNING_SECONDS = 10 * 60;
const MAX_ACTIONS_PER_SECOND = 12;
const RANK_MILESTONES = [1, 3, 6, 8, 10, 14, 16, 20, 25];
const RUN_UPGRADE_IDS = UPGRADE_DEFINITIONS.map((upgrade) => upgrade.id);
const PRIMARY_BALANCE_STRATEGIES = ["patient-multiplier-human"];
const STORM_WINDOW_RUN_UPGRADES = [
  "cloudTouch",
  "dropletSeed",
  "weatherAmplifier",
  "rootWake",
  "cloudBloom",
  "windEye",
  "heavyRain",
  "monsoonPull",
  "autoDrizzle",
  "autoRank",
  "rankCompression",
  "monsoonFocus",
  "stormMemory",
  "pressureGaugeRun",
  "frontRain",
  "thunderReturn",
  "overloadedRain",
];
const STORM_WINDOW_PRESSURE_UPGRADES = ["lowPressure", "updraft", "pressureGauge", "eyeWall", "frontCompression"];
const STORM_WINDOW_STORM_UPGRADES = ["frontMemory", "thunderUpdraft", "rainOverload", "stormBatch", "windEyeRelic", "frontScar", "stormPrism"];

const STAGE_WINDOWS = [
  { id: "rank1", label: "第 1 雨阶", min: 6 * 60, max: 10 * 60 },
  { id: "rank3", label: "第 3 雨阶", min: 12 * 60, max: 20 * 60 },
  { id: "rank6", label: "第 6 雨阶", min: 20 * 60, max: 30 * 60 },
  { id: "rank8", label: "第 8 雨阶", min: 26 * 60, max: 38 * 60 },
  { id: "rank10", label: "第 10 雨阶", min: 32 * 60, max: 45 * 60 },
  { id: "firstMonsoon", label: "第一次季风", min: 38 * 60, max: 60 * 60 },
  { id: "firstStormFront", label: "第一风暴前线", min: 65 * 60, max: 105 * 60 },
  { id: "firstClimateRewrite", label: "第一次气候改写", min: 95 * 60, max: 155 * 60 },
  { id: "skyHeart", label: "1e308 终局", min: 120 * 60, max: 210 * 60 },
];

const PROGRESS_MILESTONES = [
  { id: "firstMonsoon", label: "第一次季风", isReached: (state) => state.totalMonsoonCycles >= 1 },
  { id: "secondMonsoon", label: "第二次季风", isReached: (state) => state.totalMonsoonCycles >= 2 },
  { id: "firstStormFront", label: "第一风暴前线", isReached: (state) => state.totalStormFronts >= 1 },
  { id: "secondStormFront", label: "第二风暴前线", isReached: (state) => state.totalStormFronts >= 2 },
  { id: "thirdStormFront", label: "第三风暴前线", isReached: (state) => state.totalStormFronts >= 3 },
  { id: "firstClimateRewrite", label: "第一次气候改写", isReached: (state) => state.totalClimateRewrites >= 1 },
  { id: "skyPulse1", label: "天空心脏脉冲 1", isReached: (state) => state.skyHeartPulseLevel >= 1 },
  { id: "skyPulse2", label: "天空心脏脉冲 2", isReached: (state) => state.skyHeartPulseLevel >= 2 },
  { id: "skyPulse3", label: "天空心脏脉冲 3", isReached: (state) => state.skyHeartPulseLevel >= 3 },
  { id: "skyHeart", label: "天空心脏点燃", isReached: (state) => state.skyHeartAwakened },
];

const CANONICAL_STORM_ORDER = ["frontMemory", "thunderUpdraft", "rainOverload", "stormBatch", "windEyeRelic", "frontScar", "stormPrism"];
const MISLED_STORM_ORDER = ["frontMemory", "rainOverload", "stormBatch", "windEyeRelic", "thunderUpdraft", "frontScar", "stormPrism"];

const strategies = [
  {
    name: "guided-human",
    description: "按 UI 主线推进：先建旧流程，再买保留、气压、风暴图谱与气候法则。",
    runOrder: getGuidedRunOrder,
    permanentOrder: [
      "drizzleMemory",
      "rainRankMastery",
      "dropletEcho",
      "cloudAutoTouch",
      "autoRainRank",
      "bulkRainRank",
      "rankCompressionCore",
      "windEyeMemory",
      "monsoonLens",
      "livingSoil",
      "cloudCorePrism",
      "returningMonsoonCore",
    ],
    pressureOrder: ["pressureGauge", "lowPressure", "updraft", "eyeWall", "frontCompression"],
    stormOrder: CANONICAL_STORM_ORDER,
    climateOrder: ["condensationLaw", "deepRootLaw", "returningMonsoon", "stormWeaving", "cloudCoreRefraction", "skyHeartOmen", "climateCodex"],
    resetFirst: true,
    resetRainRankBeforeRunUpgrades: true,
  },
  {
    name: "patient-multiplier-human",
    description: "按人工试玩习惯短等关键倍率：早期点击只过渡，优先等天气增幅、风眼与季风牵引。",
    runOrder: getPatientRunOrder,
    shouldWaitForRunUpgrade: shouldPatientWaitForRunUpgrade,
    permanentOrder: [
      "drizzleMemory",
      "dropletEcho",
      "rainRankMastery",
      "cloudAutoTouch",
      "autoRainRank",
      "bulkRainRank",
      "rankCompressionCore",
      "windEyeMemory",
      "monsoonLens",
      "livingSoil",
      "cloudCorePrism",
      "returningMonsoonCore",
    ],
    pressureOrder: ["lowPressure", "updraft", "pressureGauge", "eyeWall", "frontCompression"],
    stormOrder: CANONICAL_STORM_ORDER,
    climateOrder: ["condensationLaw", "deepRootLaw", "returningMonsoon", "stormWeaving", "cloudCoreRefraction", "skyHeartOmen", "climateCodex"],
    resetFirst: true,
    resetRainRankBeforeRunUpgrades: true,
  },
  {
    name: "roi-greedy",
    description: "本轮升级按立即收益/成本挑选，永久层仍按解锁后最短路线购买。",
    runOrder: (state) => [chooseBestRunUpgradeByRate(state), ...getGuidedRunOrder(state)].filter(Boolean),
    permanentOrder: [
      "drizzleMemory",
      "rainRankMastery",
      "autoRainRank",
      "bulkRainRank",
      "rankCompressionCore",
      "windEyeMemory",
      "monsoonLens",
      "cloudCorePrism",
      "returningMonsoonCore",
      "dropletEcho",
      "cloudAutoTouch",
      "livingSoil",
    ],
    pressureOrder: ["updraft", "eyeWall", "frontCompression", "pressureGauge", "lowPressure"],
    stormOrder: CANONICAL_STORM_ORDER,
    climateOrder: ["deepRootLaw", "condensationLaw", "stormWeaving", "cloudCoreRefraction", "skyHeartOmen", "returningMonsoon", "climateCodex"],
    resetFirst: true,
    resetRainRankBeforeRunUpgrades: true,
  },
  {
    name: "comfort-first",
    description: "优先自动化和保留升级，牺牲一点速度换更少重复操作。",
    runOrder: getComfortRunOrder,
    permanentOrder: [
      "drizzleMemory",
      "dropletEcho",
      "cloudAutoTouch",
      "autoRainRank",
      "bulkRainRank",
      "rainRankMastery",
      "windEyeMemory",
      "rankCompressionCore",
      "monsoonLens",
      "livingSoil",
      "cloudCorePrism",
      "returningMonsoonCore",
    ],
    pressureOrder: ["lowPressure", "pressureGauge", "eyeWall", "updraft", "frontCompression"],
    stormOrder: CANONICAL_STORM_ORDER,
    climateOrder: ["returningMonsoon", "condensationLaw", "deepRootLaw", "cloudCoreRefraction", "stormWeaving", "skyHeartOmen", "climateCodex"],
    resetFirst: true,
    resetRainRankBeforeRunUpgrades: true,
  },
  {
    name: "bad-but-plausible",
    description: "偏爱显眼的天气按钮，较晚补生产者和中层图谱，用来检查是否会卡死。",
    runOrder: getBadButPlausibleRunOrder,
    permanentOrder: [
      "cloudAutoTouch",
      "dropletEcho",
      "drizzleMemory",
      "livingSoil",
      "rainRankMastery",
      "autoRainRank",
      "rankCompressionCore",
      "bulkRainRank",
      "monsoonLens",
      "windEyeMemory",
      "cloudCorePrism",
      "returningMonsoonCore",
    ],
    pressureOrder: ["pressureGauge", "eyeWall", "updraft", "lowPressure", "frontCompression"],
    stormOrder: CANONICAL_STORM_ORDER,
    climateOrder: ["condensationLaw", "returningMonsoon", "deepRootLaw", "stormWeaving", "skyHeartOmen", "cloudCoreRefraction", "climateCodex"],
    resetFirst: true,
    resetRainRankBeforeRunUpgrades: true,
  },
  {
    name: "new-player-visible",
    description: "按界面可见组从上到下购买，较少等待，用来模拟没做复杂 ROI 的新玩家。",
    runOrder: getNewPlayerVisibleRunOrder,
    permanentOrder: [
      "drizzleMemory",
      "dropletEcho",
      "cloudAutoTouch",
      "rainRankMastery",
      "windEyeMemory",
      "livingSoil",
      "autoRainRank",
      "bulkRainRank",
      "rankCompressionCore",
      "monsoonLens",
      "cloudCorePrism",
      "returningMonsoonCore",
    ],
    pressureOrder: ["lowPressure", "updraft", "eyeWall", "frontCompression", "pressureGauge"],
    stormOrder: CANONICAL_STORM_ORDER,
    climateOrder: ["condensationLaw", "deepRootLaw", "returningMonsoon", "stormWeaving", "cloudCoreRefraction", "skyHeartOmen", "climateCodex"],
    resetFirst: true,
    resetRainRankBeforeRunUpgrades: true,
  },
  {
    name: "misled-storm-player",
    description: "第一风暴后按旧误导顺序买风暴图谱，用来验证主干自动点亮后不再被顺序坑住。",
    runOrder: getNewPlayerVisibleRunOrder,
    permanentOrder: [
      "drizzleMemory",
      "dropletEcho",
      "cloudAutoTouch",
      "rainRankMastery",
      "windEyeMemory",
      "livingSoil",
      "autoRainRank",
      "bulkRainRank",
      "rankCompressionCore",
      "monsoonLens",
      "cloudCorePrism",
      "returningMonsoonCore",
    ],
    pressureOrder: ["lowPressure", "updraft", "eyeWall", "frontCompression", "pressureGauge"],
    stormOrder: MISLED_STORM_ORDER,
    climateOrder: ["condensationLaw", "deepRootLaw", "returningMonsoon", "stormWeaving", "cloudCoreRefraction", "skyHeartOmen", "climateCodex"],
    resetFirst: true,
    resetRainRankBeforeRunUpgrades: true,
  },
];

const results = strategies.map((strategy) => simulateStrategy(strategy));
const gateResults = results.map((result) => ({
  name: result.name,
  gates: evaluateBalanceGates(result),
}));
const hasHardGateFailure = gateResults.some((result) => result.gates.some((gate) => gate.status === "fail"));

console.log("Weather Reactor v13 strategy simulation");
console.log("Formula source: src/game/economy/*");
console.log(`Quiet warning threshold: ${formatTime(QUIET_WARNING_SECONDS)}`);
console.log("");

for (const result of results) {
  printResult(result, gateResults.find((gateResult) => gateResult.name === result.name)?.gates ?? []);
}

printGateSummary(gateResults);

if (hasHardGateFailure) {
  process.exitCode = 1;
}

function simulateStrategy(strategy) {
  const state = createInitialState();
  const rankAt = Object.fromEntries(RANK_MILESTONES.map((rank) => [rank, null]));
  const purchases = [];
  const events = [];
  const quietWarnings = [];
  const milestoneAt = {};
  const snapshots = [];
  let lastActionSecond = 0;
  let maxQuietSeconds = 0;
  let skyHeartAt = null;

  for (let second = STEP_SECONDS; second <= MAX_SECONDS; second += STEP_SECONDS) {
    tickState(state, STEP_SECONDS);
    markRainRanks(state, rankAt, snapshots, second);
    markProgressMilestones(state, milestoneAt, snapshots, second);

    let actionTakenThisSecond = false;
    for (let actionIndex = 0; actionIndex < MAX_ACTIONS_PER_SECOND; actionIndex += 1) {
      const action = runStrategyAction(state, strategy, second, purchases, events, snapshots);
      if (!action) {
        break;
      }

      actionTakenThisSecond = true;
      markRainRanks(state, rankAt, snapshots, second);
      markProgressMilestones(state, milestoneAt, snapshots, second);
      if (state.skyHeartAwakened) {
        skyHeartAt = second;
        break;
      }
    }

    if (state.skyHeartAwakened) {
      skyHeartAt = second;
      break;
    }

    if (actionTakenThisSecond) {
      lastActionSecond = second;
    } else {
      const quietSeconds = second - lastActionSecond;
      maxQuietSeconds = Math.max(maxQuietSeconds, quietSeconds);
      if (quietSeconds > 0 && quietSeconds % QUIET_WARNING_SECONDS === 0) {
        quietWarnings.push({
          start: second - quietSeconds,
          end: second,
          bottleneck: getBottleneck(state),
        });
      }
    }
  }

  return {
    name: strategy.name,
    description: strategy.description,
    rankAt,
    milestoneAt,
    skyHeartAt,
    maxQuietSeconds,
    quietWarnings,
    purchases,
    maxLevels: getMaxLevels(purchases),
    events,
    snapshots,
    state,
    bottleneck: getBottleneck(state),
  };
}

function runStrategyAction(state, strategy, second, purchases, events, snapshots) {
  if (canAwakenSkyHeart(state)) {
    Object.assign(state, awakenSkyHeart(state));
    events.push({ second, type: "ending", text: "天空心脏点燃" });
    return true;
  }

  if (canBuySkyHeartPulse(state)) {
    const beforeLevel = state.skyHeartPulseLevel;
    Object.assign(state, performSkyHeartPulse(state));
    events.push({ second, type: "skyPulse", text: `天空心脏脉冲 ${beforeLevel + 1}` });
    return true;
  }

  if (canRunClimateRewrite(state)) {
    const gainedThreads = getClimateThreadGain(state);
    const milestone = getCurrentMainlineMilestone(state);
    Object.assign(state, performClimateRewrite(state));
    events.push({ second, type: "climate", text: `${milestone.title}，+${gainedThreads} 气候织线` });
    return true;
  }

  if (canRunStormFront(state)) {
    const gainedStormCells = getStormCellGain(state);
    const milestone = getCurrentMainlineMilestone(state);
    const beforeStormCells = state.stormCells;
    const beforeStormFronts = state.totalStormFronts;
    snapshots.push(createSnapshot(second, `${milestone.title}前`, state));
    Object.assign(state, performStormFrontReset(state));
    const spentOnTrunk = gainedStormCells - (state.stormCells - beforeStormCells);
    const trunkText = beforeStormFronts === 0 && spentOnTrunk > 0
      ? `，${spentOnTrunk} 点转入风暴主干`
      : "";
    events.push({ second, type: "storm", text: `${milestone.title}，+${gainedStormCells} 风暴胞${trunkText}` });
    return true;
  }

  if (canRunMonsoon(state)) {
    const gainedCloudCores = getCloudCoreGain(state);
    const gainedPressure = getPressureGainOnMonsoon(state);
    const milestone = getCurrentMainlineMilestone(state);
    Object.assign(state, performMonsoonReset(state));
    events.push({ second, type: "monsoon", text: `${milestone.title}，+${gainedCloudCores} 云核，+${gainedPressure} 气压` });
    return true;
  }

  if (buyPermanentUpgrade(state, strategy, second, purchases)) {
    return true;
  }

  if (buyLayerUpgrade(state, "climate", strategy.climateOrder, second, purchases)) {
    return true;
  }

  if (buyLayerUpgrade(state, "storm", strategy.stormOrder, second, purchases)) {
    return true;
  }

  if (buyLayerUpgrade(state, "pressure", strategy.pressureOrder, second, purchases)) {
    return true;
  }

  if (strategy.resetRainRankBeforeRunUpgrades && canClaimRainRank(state)) {
    const beforeRank = state.rainRanks;
    Object.assign(state, performRainRankReset(state));
    pushRainRankEvent(events, second, beforeRank, state.rainRanks);
    return true;
  }

  const shouldProtectFirstLevels = ["rootWake", "cloudBloom", "windEye", "heavyRain", "monsoonPull"];
  if (!strategy.resetRainRankBeforeRunUpgrades && canClaimRainRank(state) && buyFirstMissingRunUpgrade(state, shouldProtectFirstLevels, second, purchases)) {
    return true;
  }

  if (strategy.resetFirst && canClaimRainRank(state)) {
    const beforeRank = state.rainRanks;
    Object.assign(state, performRainRankReset(state));
    pushRainRankEvent(events, second, beforeRank, state.rainRanks);
    return true;
  }

  if (strategy.shouldWaitForRunUpgrade?.(state)) {
    return false;
  }

  const runOrder = strategy.runOrder(state);
  if (buyRunUpgrade(state, runOrder, second, purchases)) {
    return true;
  }

  if (canClaimRainRank(state)) {
    const beforeRank = state.rainRanks;
    Object.assign(state, performRainRankReset(state));
    pushRainRankEvent(events, second, beforeRank, state.rainRanks);
    return true;
  }

  return false;
}

function pushRainRankEvent(events, second, beforeRank, afterRank) {
  if (RANK_MILESTONES.includes(afterRank) || afterRank <= 3) {
    events.push({ second, type: "rank", text: `雨阶 ${beforeRank} -> ${afterRank}` });
  }
}

function tickState(state, seconds) {
  if (state.clickCooldownRemaining <= 0) {
    Object.assign(state, applyCloudTouch(state));
  }

  Object.assign(state, runTick(state, seconds));
}

function buyPermanentUpgrade(state, strategy, second, purchases) {
  for (const upgradeId of strategy.permanentOrder) {
    const upgrade = PERMANENT_UPGRADES.find((candidate) => candidate.id === upgradeId);
    if (!upgrade) {
      continue;
    }

    if (state.permanentUpgrades.includes(upgrade.id)) {
      continue;
    }

    if (upgrade.isUnlocked && !upgrade.isUnlocked(state)) {
      continue;
    }

    if (state.cloudCores < upgrade.cost) {
      continue;
    }

    const beforeLog = calculateWeatherPerSecondLog(state);
    state.cloudCores -= upgrade.cost;
    state.permanentUpgrades.push(upgrade.id);
    Object.assign(state, applyPermanentUpgradeEffects(state, upgrade.id));
    const afterLog = calculateWeatherPerSecondLog(state);
    purchases.push(createPurchaseLog(second, "cloudCore", upgrade.id, 1, beforeLog, afterLog, { cloudCores: upgrade.cost }));
    return true;
  }

  return false;
}

function buyLayerUpgrade(state, layer, order, second, purchases) {
  const definitions = getLayerDefinitions(layer);
  const resourceKey = getLayerResourceKey(layer);

  for (const upgradeId of order) {
    const definition = definitions.find((candidate) => candidate.id === upgradeId);
    if (!definition) {
      continue;
    }

    if (definition.isUnlocked && !definition.isUnlocked(state)) {
      continue;
    }

    const level = getLayerLevel(state, layer, definition.id);
    const cost = getLayerUpgradeCost(definition, level);
    if (cost <= 0 || state[resourceKey] < cost) {
      continue;
    }

    const beforeLog = calculateWeatherPerSecondLog(state);
    state[resourceKey] -= cost;
    if (layer === "pressure") {
      state.totalPressureSpentThisFront += cost;
      state.pressureUpgrades[definition.id] += 1;
    } else if (layer === "storm") {
      state.stormUpgrades[definition.id] += 1;
    } else {
      state.climateLaws[definition.id] += 1;
    }
    const afterLog = calculateWeatherPerSecondLog(state);
    purchases.push(createPurchaseLog(second, layer, definition.id, level + 1, beforeLog, afterLog, { [resourceKey]: cost }));
    return true;
  }

  return false;
}

function getLayerLevel(state, layer, upgradeId) {
  if (layer === "pressure") {
    return state.pressureUpgrades[upgradeId] ?? 0;
  }

  if (layer === "storm") {
    return state.stormUpgrades[upgradeId] ?? 0;
  }

  return state.climateLaws[upgradeId] ?? 0;
}

function buyFirstMissingRunUpgrade(state, order, second, purchases) {
  return buyRunUpgrade(
    state,
    order.filter((upgradeId) => state.upgrades[upgradeId] <= 0),
    second,
    purchases,
  );
}

function buyRunUpgrade(state, order, second, purchases) {
  for (const upgradeId of order) {
    if (!upgradeId || !canBuyRunUpgrade(state, upgradeId)) {
      continue;
    }

    const upgrade = getUpgrade(upgradeId);
    const cost = getUpgradeCost(state, upgrade);
    const beforeLog = calculateWeatherPerSecondLog(state);
    state.resources = payCost(state.resources, cost);
    state.upgrades[upgradeId] += 1;
    const afterLog = calculateWeatherPerSecondLog(state);
    purchases.push(createPurchaseLog(second, "run", upgradeId, state.upgrades[upgradeId], beforeLog, afterLog, cost));
    return true;
  }

  return false;
}

function canBuyRunUpgrade(state, upgradeId) {
  if (!RUN_UPGRADE_IDS.includes(upgradeId)) {
    return false;
  }

  if (!isUpgradeVisible(state, upgradeId)) {
    return false;
  }

  if (isRunUpgradeMaxed(state, upgradeId)) {
    return false;
  }

  return canPay(state.resources, getUpgradeCost(state, getUpgrade(upgradeId)));
}

function getLayerDefinitions(layer) {
  if (layer === "pressure") {
    return PRESSURE_UPGRADES;
  }

  if (layer === "storm") {
    return STORM_UPGRADES;
  }

  return CLIMATE_LAWS;
}

function getLayerResourceKey(layer) {
  if (layer === "pressure") {
    return "pressure";
  }

  if (layer === "storm") {
    return "stormCells";
  }

  return "climateThreads";
}

function getGuidedRunOrder(state) {
  const milestone = getCurrentMainlineMilestone(state);
  const requiredRanks = milestone.requiredRainRanks ?? 10;

  if (state.rainRanks < 1) {
    return ["cloudTouch", "dropletSeed", "weatherAmplifier"];
  }

  if (state.rainRanks < 3) {
    return ["rootWake", "weatherAmplifier", "dropletSeed", "cloudTouch"];
  }

  if (state.rainRanks < 6) {
    return ["cloudBloom", "rootWake", "weatherAmplifier", "dropletSeed", "windEye", "cloudTouch"];
  }

  if (state.rainRanks < requiredRanks) {
    return ["windEye", "cloudBloom", "rootWake", "heavyRain", "weatherAmplifier", "dropletSeed", "cloudTouch", "rankCompression"];
  }

  if (state.totalClimateRewrites > 0) {
    return [
      "climateEcho",
      "deepVapor",
      "highCirculation",
      "skyWarmup",
      "monsoonPull",
      "overloadedRain",
      "thunderReturn",
      "frontRain",
      "pressureGaugeRun",
      "heavyRain",
      "windEye",
      "cloudBloom",
      "rootWake",
      "weatherAmplifier",
      "dropletSeed",
      "autoRank",
      "rankCompression",
    ];
  }

  if (state.totalMonsoonCycles >= 2 || state.totalStormFronts > 0) {
    return [
      "monsoonPull",
      "pressureGaugeRun",
      "frontRain",
      "thunderReturn",
      "overloadedRain",
      "heavyRain",
      "windEye",
      "cloudBloom",
      "rootWake",
      "weatherAmplifier",
      "dropletSeed",
      "autoRank",
      "rankCompression",
      "stormMemory",
      "monsoonFocus",
      "autoDrizzle",
    ];
  }

  return [
    "monsoonPull",
    "heavyRain",
    "windEye",
    "cloudBloom",
    "rootWake",
    "weatherAmplifier",
    "dropletSeed",
    "autoRank",
    "rankCompression",
    "stormMemory",
    "monsoonFocus",
    "autoDrizzle",
    "cloudTouch",
  ];
}

function getPatientRunOrder(state) {
  const clickBridge = shouldInvestInCloudTouch(state) ? ["cloudTouch"] : [];
  const milestone = getCurrentMainlineMilestone(state);
  const requiredRanks = milestone.requiredRainRanks ?? 10;
  const firstInfrastructure = getPatientFirstInfrastructureOrder(state);
  const producerBatch = getPatientProducerBatchOrder(state);
  const bestValueUpgrade = choosePatientRunUpgradeByValue(state);

  if (state.rainRanks < 1) {
    return uniqueUpgradeOrder(["weatherAmplifier", "dropletSeed", ...clickBridge]);
  }

  if (state.rainRanks < 3) {
    return uniqueUpgradeOrder([bestValueUpgrade, ...firstInfrastructure, "weatherAmplifier", "dropletSeed", ...producerBatch, ...clickBridge]);
  }

  if (state.rainRanks < 6) {
    return uniqueUpgradeOrder([bestValueUpgrade, ...firstInfrastructure, "weatherAmplifier", "dropletSeed", ...producerBatch, ...clickBridge]);
  }

  if (state.rainRanks < requiredRanks) {
    return uniqueUpgradeOrder([bestValueUpgrade, "weatherAmplifier", "heavyRain", ...firstInfrastructure, ...producerBatch, "dropletSeed", ...clickBridge, "rankCompression"]);
  }

  return uniqueUpgradeOrder([
    bestValueUpgrade,
    "monsoonPull",
    "weatherAmplifier",
    "heavyRain",
    ...firstInfrastructure,
    ...producerBatch,
    "dropletSeed",
    "monsoonFocus",
    "stormMemory",
    "pressureGaugeRun",
    "frontRain",
    "thunderReturn",
    "overloadedRain",
    "climateEcho",
    "deepVapor",
    "highCirculation",
    "skyWarmup",
    "autoRank",
    "rankCompression",
    "autoDrizzle",
    ...getGuidedRunOrder(state),
  ]);
}

function getPatientFirstInfrastructureOrder(state) {
  return ["rootWake", "cloudBloom", "windEye"].filter((upgradeId) => state.upgrades[upgradeId] <= 0);
}

function getPatientProducerBatchOrder(state) {
  return ["windEye", "cloudBloom", "rootWake"].filter((upgradeId) => (
    state.upgrades[upgradeId] > 0 && shouldBatchBuyProducerUpgrade(state, upgradeId)
  ));
}

function shouldBatchBuyProducerUpgrade(state, upgradeId) {
  const cost = getUpgradeCost(state, getUpgrade(upgradeId));
  const weatherCost = cost.weather ?? 0;
  if (weatherCost <= 0) {
    return false;
  }

  if (state.totalStormFronts > 0) {
    return getPatientRunUpgradeValue(state, upgradeId).score >= getPatientBuyNowThreshold(state) + 0.4;
  }

  return log10Safe(state.resources.weather) >= log10Safe(weatherCost) + 2;
}

function choosePatientRunUpgradeByValue(state) {
  const best = getPatientAffordableRunUpgradeValues(state)[0];
  if (!best || best.score < getPatientBuyNowThreshold(state)) {
    return null;
  }

  return best.upgradeId;
}

function hasStrongPatientAffordableUpgrade(state) {
  const best = getPatientAffordableRunUpgradeValues(state)[0];
  return Boolean(best && best.score >= getPatientBuyNowThreshold(state));
}

function getPatientAffordableRunUpgradeValues(state) {
  return getPatientRunUpgradeCandidates(state)
    .filter((upgradeId) => canBuyRunUpgrade(state, upgradeId))
    .map((upgradeId) => getPatientRunUpgradeValue(state, upgradeId))
    .filter((value) => Number.isFinite(value.score))
    .sort((left, right) => right.score - left.score);
}

function getPatientRunUpgradeCandidates(state) {
  const candidates = [
    "weatherAmplifier",
    "heavyRain",
    "monsoonPull",
    "windEye",
    "cloudBloom",
    "rootWake",
    "dropletSeed",
    "monsoonFocus",
    "stormMemory",
    "pressureGaugeRun",
    "frontRain",
    "thunderReturn",
    "overloadedRain",
    "autoRank",
    "rankCompression",
    "autoDrizzle",
  ];

  if (shouldInvestInCloudTouch(state)) {
    candidates.push("cloudTouch");
  }

  return uniqueUpgradeOrder(candidates);
}

function getPatientRunUpgradeValue(state, upgradeId) {
  if (!RUN_UPGRADE_IDS.includes(upgradeId) || !isUpgradeVisible(state, upgradeId)) {
    return { upgradeId, score: Number.NEGATIVE_INFINITY };
  }

  const upgrade = getUpgrade(upgradeId);
  const cost = getUpgradeCost(state, upgrade);
  const projected = cloneState(state);
  projected.resources = payCost(projected.resources, cost);
  projected.upgrades[upgradeId] += 1;

  const weights = getPatientRoiWeights(state);
  const rateGain = getEffectiveRateGainLog(state, projected);
  const waitCompression = getStrategicWaitCompressionLog(state, projected);
  const paybackScore = getPatientPaybackScore(state, projected, cost);
  const unlockBias = projected.upgrades[upgradeId] === 1 ? getUnlockBias(upgradeId) * 0.15 : 0;
  const roleBias = getPatientRoleBias(state, upgradeId);
  const costPenalty = Math.max(0, log10ResourceCost(cost)) * weights.costPenalty;

  const score = rateGain * weights.rate
    + waitCompression * weights.wait
    + paybackScore * weights.payback
    + unlockBias
    + roleBias
    - costPenalty;

  return { upgradeId, score, rateGain, waitCompression, paybackScore };
}

function getPatientRoiWeights(state) {
  const milestone = getCurrentMainlineMilestone(state);
  const requiredRanks = milestone.requiredRainRanks ?? 0;
  const resetTargetReady = state.rainRanks >= requiredRanks;
  const postStorm = state.totalStormFronts > 0;

  return {
    rate: postStorm ? 7 : 5,
    wait: resetTargetReady ? 8 : 5,
    payback: postStorm ? 1.8 : 1.2,
    costPenalty: postStorm ? 0.012 : 0.02,
  };
}

function getPatientRoleBias(state, upgradeId) {
  const postStorm = state.totalStormFronts > 0;
  const milestone = getCurrentMainlineMilestone(state);
  const requiredRanks = milestone.requiredRainRanks ?? 0;

  if (upgradeId === "cloudTouch") {
    return -2;
  }

  if (postStorm && ["monsoonPull", "weatherAmplifier", "heavyRain"].includes(upgradeId)) {
    return 1.2;
  }

  if (postStorm && ["rootWake", "cloudBloom", "windEye"].includes(upgradeId)) {
    return state.rainRanks >= requiredRanks ? 0.9 : 0.5;
  }

  if (postStorm && ["pressureGaugeRun", "frontRain", "thunderReturn", "overloadedRain"].includes(upgradeId)) {
    return 0.6;
  }

  if (upgradeId === "autoDrizzle") {
    return postStorm ? -0.4 : -0.8;
  }

  return 0;
}

function getEffectiveRateGainLog(state, projected) {
  const before = calculateEffectiveWeatherGainLog(state);
  const after = calculateEffectiveWeatherGainLog(projected);

  if (!Number.isFinite(after) && !Number.isFinite(before)) {
    return 0;
  }

  if (!Number.isFinite(before)) {
    return Math.max(0, after);
  }

  return Math.max(0, after - before);
}

function getStrategicWaitCompressionLog(state, projected) {
  const before = getStrategicTargetWaitLog(state);
  const after = getStrategicTargetWaitLog(projected);

  if (!Number.isFinite(before) && !Number.isFinite(after)) {
    return getEffectiveRateGainLog(state, projected) * 0.35;
  }

  if (!Number.isFinite(before)) {
    return Math.max(0, 8 - after);
  }

  if (!Number.isFinite(after)) {
    return 0;
  }

  return Math.max(0, before - after);
}

function getStrategicTargetWaitLog(state) {
  const targetExp = getPatientStrategicTargetExp(state);
  const currentExp = log10Safe(state.resources.weather);
  if (currentExp >= targetExp) {
    return Number.NEGATIVE_INFINITY;
  }

  const gainLog = calculateEffectiveWeatherGainLog(state);
  if (!Number.isFinite(gainLog)) {
    return Number.POSITIVE_INFINITY;
  }

  return targetExp - gainLog;
}

function getPatientStrategicTargetExp(state) {
  const milestone = getCurrentMainlineMilestone(state);
  const requiredRanks = milestone.requiredRainRanks ?? 0;
  if (state.rainRanks < requiredRanks) {
    return Math.min(getRainRankRequirementExp(state), getCurrentMilestoneTargetExp(state));
  }

  return getCurrentMilestoneTargetExp(state);
}

function getPatientPaybackScore(state, projected, cost) {
  const weatherCost = cost.weather ?? 0;
  if (weatherCost <= 0) {
    return 0;
  }

  const before = calculateEffectiveWeatherGainLog(state);
  const after = calculateEffectiveWeatherGainLog(projected);
  if (!Number.isFinite(before) || !Number.isFinite(after) || after <= before) {
    return 0;
  }

  const deltaRateLog = after + Math.log10(1 - 10 ** Math.min(0, before - after));
  const paybackLog = log10Safe(weatherCost) - deltaRateLog;
  if (!Number.isFinite(paybackLog)) {
    return 0;
  }

  return Math.max(-2, Math.min(4, 3 - paybackLog));
}

function getPatientBuyNowThreshold(state) {
  if (state.totalStormFronts > 0) {
    return 2.4;
  }

  if (state.totalMonsoonCycles > 0) {
    return 2.8;
  }

  return 3.4;
}

function getNewPlayerVisibleRunOrder(state) {
  return uniqueUpgradeOrder([
    "cloudTouch",
    "dropletSeed",
    "weatherAmplifier",
    "rootWake",
    "cloudBloom",
    "windEye",
    "heavyRain",
    "monsoonPull",
    "autoDrizzle",
    "autoRank",
    "rankCompression",
    "monsoonFocus",
    "stormMemory",
    "pressureGaugeRun",
    "frontRain",
    "thunderReturn",
    "overloadedRain",
    "climateEcho",
    "deepVapor",
    "highCirculation",
    "skyWarmup",
    ...getGuidedRunOrder(state),
  ]);
}

function uniqueUpgradeOrder(order) {
  return [...new Set(order.filter(Boolean))];
}

function shouldInvestInCloudTouch(state) {
  if (!isUpgradeVisible(state, "cloudTouch")) {
    return false;
  }

  if (state.upgrades.cloudTouch >= 3) {
    return false;
  }

  const passiveLog = calculateWeatherPerSecondLog(state);
  const clickEquivalentLog = log10Safe(getCloudTouchAmount(state) / getClickCooldownSeconds(state));
  if (!Number.isFinite(passiveLog)) {
    return state.totalMonsoonCycles <= 0 && state.upgrades.cloudTouch < 2;
  }

  if (passiveLog >= clickEquivalentLog - 0.05) {
    return false;
  }

  if (isUpgradeVisible(state, "weatherAmplifier")) {
    const cloudTouchWait = estimateWaitSecondsForCost(state, getUpgradeCost(state, getUpgrade("cloudTouch")));
    const weatherAmplifierWait = estimateWaitSecondsForCost(state, getUpgradeCost(state, getUpgrade("weatherAmplifier")));
    const weatherAmplifierGain = getRunUpgradeRateGainLog(state, "weatherAmplifier");
    const cloudTouchGain = getRunUpgradeRateGainLog(state, "cloudTouch");
    if (weatherAmplifierWait <= Math.max(1, cloudTouchWait) * 1.5 && weatherAmplifierGain >= cloudTouchGain + 0.12) {
      return false;
    }
  }

  return passiveLog < clickEquivalentLog - 0.1;
}

function shouldPatientWaitForRunUpgrade(state) {
  if (canClaimRainRank(state)) {
    return false;
  }

  if (hasAffordableFirstLevelInfrastructure(state)) {
    return null;
  }

  if (hasStrongPatientAffordableUpgrade(state)) {
    return false;
  }

  if (shouldWaitForPatientMultiplierRollout(state, "weatherAmplifier", 90, 0.18)) {
    return true;
  }

  if (shouldWaitForPatientMultiplierRollout(state, "heavyRain", state.rainRanks >= 8 ? 90 : 45, 0.12)) {
    return true;
  }

  if (shouldWaitForPatientMultiplierRollout(state, "windEye", 75, 0.08, { onlyFirstLevel: true })) {
    return true;
  }

  if (shouldWaitForPatientMonsoonPull(state)) {
    return true;
  }

  return null;
}

function shouldWaitForPatientMultiplierRollout(state, upgradeId, maxWaitSeconds, minAdvantageLog, options = {}) {
  if (options.onlyFirstLevel && state.upgrades[upgradeId] > 0) {
    return false;
  }

  if (!shouldConsiderWaitingForUpgrade(state, upgradeId)) {
    return false;
  }

  const upgrade = getUpgrade(upgradeId);
  const waitSeconds = estimateWaitSecondsForCost(state, getUpgradeCost(state, upgrade));
  if (waitSeconds <= 0 || waitSeconds > maxWaitSeconds) {
    return false;
  }

  const rolloutAdvantage = getWaitThenBuySameWindowAdvantageLog(state, upgradeId, waitSeconds);
  if (rolloutAdvantage < minAdvantageLog) {
    return false;
  }

  const targetGain = getRunUpgradeRateGainLog(state, upgradeId);
  const bestAffordableGain = getBestAffordableRunUpgradeGainLog(state, upgradeId);
  return targetGain >= bestAffordableGain - 0.05;
}

function shouldWaitForPatientMonsoonPull(state) {
  if (!shouldConsiderWaitingForUpgrade(state, "monsoonPull")) {
    return false;
  }

  const waitSeconds = estimateWaitSecondsForCost(state, getUpgradeCost(state, getUpgrade("monsoonPull")));
  if (waitSeconds <= 60) {
    return true;
  }

  if (waitSeconds <= 120) {
    return !canAffordableMultiplierCompressTargetWait(state, "monsoonPull", 60);
  }

  return false;
}

function canAffordableMultiplierCompressTargetWait(state, targetUpgradeId, maxWaitAfterPurchase) {
  for (const upgradeId of ["weatherAmplifier", "heavyRain"]) {
    if (!canBuyRunUpgrade(state, upgradeId)) {
      continue;
    }

    const projected = cloneState(state);
    projected.resources = payCost(projected.resources, getUpgradeCost(projected, getUpgrade(upgradeId)));
    projected.upgrades[upgradeId] += 1;
    const waitAfterPurchase = estimateWaitSecondsForCost(projected, getUpgradeCost(projected, getUpgrade(targetUpgradeId)));
    if (waitAfterPurchase <= maxWaitAfterPurchase) {
      return true;
    }
  }

  return false;
}

function getWaitThenBuySameWindowAdvantageLog(state, upgradeId, waitSeconds) {
  const currentResourceLog = log10Safe(state.resources.weather);
  const currentGainLog = calculateEffectiveWeatherGainLog(state);
  const waitDurationLog = log10Safe(Math.max(1, waitSeconds));
  const noBuySameWindowLog = logSumExp10(currentResourceLog, currentGainLog + waitDurationLog);

  const projected = cloneState(state);
  projected.upgrades[upgradeId] += 1;
  const afterBuyGainLog = calculateEffectiveWeatherGainLog(projected);
  const afterBuySameWindowLog = afterBuyGainLog + waitDurationLog;

  return afterBuySameWindowLog - noBuySameWindowLog;
}

function shouldConsiderWaitingForUpgrade(state, upgradeId) {
  if (upgradeId === "weatherAmplifier" && state.upgrades.dropletSeed <= 0) {
    return false;
  }

  return RUN_UPGRADE_IDS.includes(upgradeId)
    && isUpgradeVisible(state, upgradeId)
    && !canBuyRunUpgrade(state, upgradeId);
}

function hasAffordableFirstLevelInfrastructure(state) {
  return ["rootWake", "cloudBloom", "windEye"].some((upgradeId) => (
    state.upgrades[upgradeId] <= 0 && canBuyRunUpgrade(state, upgradeId)
  ));
}

function getComfortRunOrder(state) {
  return [
    "cloudTouch",
    "dropletSeed",
    "weatherAmplifier",
    "autoDrizzle",
    "autoRank",
    "rankCompression",
    "rootWake",
    "cloudBloom",
    "windEye",
    "heavyRain",
    "monsoonPull",
    "monsoonFocus",
    "stormMemory",
    "pressureGaugeRun",
    "frontRain",
    "thunderReturn",
    "overloadedRain",
    "climateEcho",
    "deepVapor",
    "highCirculation",
    "skyWarmup",
    ...getGuidedRunOrder(state),
  ];
}

function getBadButPlausibleRunOrder(state) {
  return [
    "cloudTouch",
    "dropletSeed",
    "weatherAmplifier",
    "heavyRain",
    "monsoonPull",
    "autoDrizzle",
    "rankCompression",
    "stormMemory",
    "rootWake",
    "cloudBloom",
    "windEye",
    "monsoonFocus",
    "pressureGaugeRun",
    "frontRain",
    "overloadedRain",
    "thunderReturn",
    "climateEcho",
    "skyWarmup",
    "deepVapor",
    "highCirculation",
  ];
}

function chooseBestRunUpgradeByRate(state) {
  const candidates = UPGRADE_DEFINITIONS.filter((upgrade) => canBuyRunUpgrade(state, upgrade.id));
  const beforeLog = calculateWeatherPerSecondLog(state);
  let bestUpgradeId = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const upgrade of candidates) {
    const projected = cloneState(state);
    projected.resources = payCost(projected.resources, getUpgradeCost(projected, upgrade));
    projected.upgrades[upgrade.id] += 1;
    const afterLog = calculateWeatherPerSecondLog(projected);
    const costLog = log10ResourceCost(getUpgradeCost(state, upgrade));
    const unlockBias = projected.upgrades[upgrade.id] === 1 ? getUnlockBias(upgrade.id) : 0;
    const score = (afterLog - beforeLog) * 12 + unlockBias - costLog * 0.04;
    if (score > bestScore) {
      bestScore = score;
      bestUpgradeId = upgrade.id;
    }
  }

  return bestUpgradeId;
}

function getRunUpgradeRateGainLog(state, upgradeId) {
  if (!RUN_UPGRADE_IDS.includes(upgradeId) || !isUpgradeVisible(state, upgradeId)) {
    return Number.NEGATIVE_INFINITY;
  }

  const cost = getUpgradeCost(state, getUpgrade(upgradeId));
  const beforeLog = calculateWeatherPerSecondLog(state);
  const projected = cloneState(state);
  projected.resources = payCost(projected.resources, cost);
  projected.upgrades[upgradeId] += 1;
  const afterLog = calculateWeatherPerSecondLog(projected);

  if (!Number.isFinite(afterLog) && !Number.isFinite(beforeLog)) {
    return 0;
  }

  if (!Number.isFinite(beforeLog)) {
    return Math.max(0, afterLog);
  }

  return afterLog - beforeLog;
}

function getBestAffordableRunUpgradeGainLog(state, ignoredUpgradeId) {
  let bestGain = Number.NEGATIVE_INFINITY;

  for (const upgrade of UPGRADE_DEFINITIONS) {
    if (upgrade.id === ignoredUpgradeId || !canBuyRunUpgrade(state, upgrade.id)) {
      continue;
    }

    bestGain = Math.max(bestGain, getRunUpgradeRateGainLog(state, upgrade.id));
  }

  return Number.isFinite(bestGain) ? bestGain : 0;
}

function estimateWaitSecondsForCost(state, cost) {
  const weatherCost = cost.weather ?? 0;
  if (weatherCost <= state.resources.weather) {
    return 0;
  }

  const gainLog = calculateEffectiveWeatherGainLog(state);
  if (!Number.isFinite(gainLog)) {
    return Number.POSITIVE_INFINITY;
  }

  const missingLog = log10Safe(weatherCost - state.resources.weather);
  const waitLog = missingLog - gainLog;
  if (waitLog > 8) {
    return Number.POSITIVE_INFINITY;
  }

  return 10 ** waitLog;
}

function calculateEffectiveWeatherGainLog(state) {
  const passiveLog = calculateWeatherPerSecondLog(state);
  const clickAverage = getCloudTouchAmount(state) / getClickCooldownSeconds(state);
  return logSumExp10(passiveLog, log10Safe(clickAverage));
}

function getUnlockBias(upgradeId) {
  switch (upgradeId) {
    case "dropletSeed":
      return 8;
    case "rootWake":
    case "cloudBloom":
    case "windEye":
      return 7;
    case "monsoonPull":
      return 6;
    case "autoRank":
    case "rankCompression":
      return 4;
    default:
      return 0;
  }
}

function cloneState(state) {
  return {
    ...state,
    resources: { ...state.resources },
    upgrades: { ...state.upgrades },
    pressureUpgrades: { ...state.pressureUpgrades },
    stormUpgrades: { ...state.stormUpgrades },
    climateLaws: { ...state.climateLaws },
    activeClimateLaws: [...state.activeClimateLaws],
    permanentUpgrades: [...state.permanentUpgrades],
  };
}

function markRainRanks(state, rankAt, snapshots, second) {
  for (const rank of RANK_MILESTONES) {
    if (!rankAt[rank] && state.rainRanks >= rank) {
      rankAt[rank] = Math.floor(state.elapsedSeconds);
      snapshots.push(createSnapshot(second, `雨阶 ${rank}`, state));
    }
  }
}

function markProgressMilestones(state, milestoneAt, snapshots, second) {
  for (const milestone of PROGRESS_MILESTONES) {
    if (milestoneAt[milestone.id] || !milestone.isReached(state)) {
      continue;
    }

    milestoneAt[milestone.id] = second;
    snapshots.push(createSnapshot(second, milestone.label, state));
  }
}

function createSnapshot(second, label, state) {
  const layerBonus = getLayerBonusBreakdown(state);
  const clickAverage = getCloudTouchAmount(state) / getClickCooldownSeconds(state);
  return {
    second,
    label,
    rainRanks: state.rainRanks,
    weatherExp: log10Safe(state.resources.weather),
    rateLog: calculateWeatherPerSecondLog(state),
    bestWeatherExp: state.bestWeatherExp,
    totalMonsoonCycles: state.totalMonsoonCycles,
    totalStormFronts: state.totalStormFronts,
    totalClimateRewrites: state.totalClimateRewrites,
    skyHeartPulseLevel: state.skyHeartPulseLevel,
    cloudCores: state.cloudCores,
    totalCloudCores: state.totalCloudCores,
    pressure: state.pressure,
    stormCells: state.stormCells,
    climateThreads: state.climateThreads,
    layerBonus,
    componentLogs: {
      passive: log10Safe(getPassiveWeatherGain(state)),
      autoDrizzle: log10Safe(getAutoDrizzleGain(state)),
      clickAverage: log10Safe(clickAverage),
      producerMultiplier: log10Safe(getProducerMultiplier(state)),
    },
    runLevels: pickLevels(state.upgrades, STORM_WINDOW_RUN_UPGRADES),
    pressureLevels: pickLevels(state.pressureUpgrades, STORM_WINDOW_PRESSURE_UPGRADES),
    stormLevels: pickLevels(state.stormUpgrades, STORM_WINDOW_STORM_UPGRADES),
  };
}

function pickLevels(levels, ids) {
  return Object.fromEntries(ids.map((id) => [id, levels[id] ?? 0]));
}

function getMaxLevels(purchases) {
  const levels = new Map();
  for (const purchase of purchases) {
    const key = `${purchase.layer}.${purchase.id}`;
    const current = levels.get(key) ?? 0;
    levels.set(key, Math.max(current, purchase.level));
  }

  return [...levels.entries()]
    .map(([key, level]) => ({ key, level }))
    .sort((left, right) => right.level - left.level || left.key.localeCompare(right.key));
}

function createPurchaseLog(second, layer, id, level, beforeRateLog, afterRateLog, cost) {
  return {
    second,
    layer,
    id,
    level,
    beforeRateLog,
    afterRateLog,
    payback: estimatePaybackSeconds(beforeRateLog, afterRateLog, cost),
  };
}

function estimatePaybackSeconds(beforeRateLog, afterRateLog, cost) {
  const weatherCost = cost.weather ?? 0;
  if (weatherCost <= 0 || !Number.isFinite(beforeRateLog) || !Number.isFinite(afterRateLog) || afterRateLog <= beforeRateLog) {
    return null;
  }

  const deltaRateLog = afterRateLog + Math.log10(1 - 10 ** Math.min(0, beforeRateLog - afterRateLog));
  const paybackLog = log10Safe(weatherCost) - deltaRateLog;
  if (!Number.isFinite(paybackLog)) {
    return null;
  }

  if (paybackLog > 8) {
    return `1e${paybackLog.toFixed(1)}s`;
  }

  return 10 ** paybackLog;
}

function log10ResourceCost(cost) {
  const weightedCost = (cost.weather ?? 0)
    + (cost.droplets ?? 0) * 8
    + (cost.roots ?? 0) * 40
    + (cost.clouds ?? 0) * 160;

  return log10Safe(weightedCost || 1);
}

function getBottleneck(state) {
  const milestone = getCurrentMainlineMilestone(state);
  const targetExp = getCurrentMilestoneTargetExp(state);
  const currentWeatherExp = log10Safe(state.resources.weather);
  const requiredRanks = milestone.requiredRainRanks ?? 0;

  if (state.skyHeartAwakened) {
    return "ending reached";
  }

  if (state.rainRanks < requiredRanks) {
    return `rain rank ${state.rainRanks}/${requiredRanks}, next requires 1e${getRainRankRequirementExp(state).toFixed(1)}`;
  }

  if (milestone.kind === "monsoon" && state.upgrades.windEye <= 0) {
    return "needs windEye for monsoon";
  }

  if (milestone.kind === "stormFront" && state.monsoonCyclesInFront < (milestone.requiredMonsoonsInFront ?? 0)) {
    return `monsoon count ${state.monsoonCyclesInFront}/${milestone.requiredMonsoonsInFront}`;
  }

  if (milestone.kind === "climateRewrite" && state.totalStormFronts < (milestone.requiredStormFronts ?? 0)) {
    return `storm fronts ${state.totalStormFronts}/${milestone.requiredStormFronts}`;
  }

  if (currentWeatherExp < targetExp) {
    return `${(targetExp - currentWeatherExp).toFixed(1)} orders to ${milestone.title}`;
  }

  return `${milestone.title} ready`;
}

function printResult(result, gates) {
  const state = result.state;
  const layerBonus = getLayerBonusBreakdown(state);
  console.log(result.name);
  console.log(`  ${result.description}`);
  console.log(
    `  ending: ${formatTime(result.skyHeartAt)} | rank 1/3/6/8/10/14/16/20/25: `
    + RANK_MILESTONES.map((rank) => formatTime(result.rankAt[rank])).join(" / "),
  );
  console.log(`  milestones: ${formatMilestoneTimeline(result)}`);
  console.log(`  stage durations: ${formatStageDurations(result)}`);
  console.log(
    `  totals: monsoon ${state.totalMonsoonCycles}, stormFront ${state.totalStormFronts}, climateRewrite ${state.totalClimateRewrites}, `
    + `cloudCores ${state.cloudCores}/${state.totalCloudCores}, stormCells ${state.stormCells}/${state.totalStormCells}, `
    + `climateThreads ${state.climateThreads}/${state.totalClimateThreads}`,
  );
  console.log(`  storm trunk: ${formatStormTrunkStatus(state)}`);
  console.log(
    `  bestWeatherExp: ${state.bestWeatherExp.toFixed(2)} | layer orders: cloudCore +${layerBonus.cloudCore.toFixed(1)}, `
    + `pressure +${layerBonus.pressure.toFixed(1)}, storm +${layerBonus.storm.toFixed(1)}, climate +${layerBonus.climate.toFixed(1)}, `
    + `sky +${layerBonus.skyHeart.toFixed(1)}`,
  );
  console.log(`  quiet: max ${formatTime(result.maxQuietSeconds)}, warnings ${result.quietWarnings.length}`);
  for (const warning of compactList(result.quietWarnings, 6, 3)) {
    if (warning === "...") {
      console.log("    ...");
      continue;
    }
    console.log(`    quiet ${formatTime(warning.start)}-${formatTime(warning.end)}: ${warning.bottleneck}`);
  }
  console.log(`  bottleneck: ${result.bottleneck}`);
  console.log(`  gate status: ${formatGateStatus(gates)}`);
  for (const gate of gates.filter((candidate) => candidate.status !== "pass")) {
    console.log(`    - ${gate.status.toUpperCase()} ${gate.label}: ${gate.detail}`);
  }
  console.log(`  max levels: ${formatMaxLevels(result.maxLevels)}`);
  console.log(`  largest rate jumps: ${formatLargestRateJumps(result)}`);
  printMonsoonToStormDiagnostics(result);
  printStormWindowDiagnostics(result);
  console.log("  layer snapshots:");
  for (const snapshot of compactList(result.snapshots, 10, 8)) {
    if (snapshot === "...") {
      console.log("    ...");
      continue;
    }
    console.log(
      `    - ${formatTime(snapshot.second)} ${snapshot.label}: weather ${formatLogValue(snapshot.weatherExp)}, `
      + `rate ${formatLogValue(snapshot.rateLog)}/s, best ${formatLogValue(snapshot.bestWeatherExp)}, `
      + `layers core +${snapshot.layerBonus.cloudCore.toFixed(1)} / pressure +${snapshot.layerBonus.pressure.toFixed(1)} / `
      + `storm +${snapshot.layerBonus.storm.toFixed(1)} / climate +${snapshot.layerBonus.climate.toFixed(1)} / sky +${snapshot.layerBonus.skyHeart.toFixed(1)}`,
    );
  }
  console.log("  reset / milestone log:");
  for (const event of result.events) {
    console.log(`    - ${formatTime(event.second)} ${event.text}`);
  }
  console.log(`  purchase summary: ${formatPurchaseSummary(result.purchases)}`);
  console.log("  purchase milestones:");
  for (const purchase of compactList(result.purchases.filter(shouldPrintPurchase), 40, 20)) {
    if (purchase === "...") {
      console.log("    ...");
      continue;
    }
    console.log(
      `    - ${formatTime(purchase.second)} ${purchase.layer}.${purchase.id} Lv.${purchase.level} | `
      + `rate ${formatLogValue(purchase.beforeRateLog)} -> ${formatLogValue(purchase.afterRateLog)} | `
      + `payback ${formatPayback(purchase.payback)}`,
    );
  }
  console.log("");
}

function evaluateBalanceGates(result) {
  const gates = [];

  if (PRIMARY_BALANCE_STRATEGIES.includes(result.name)) {
    const earliestEnding = result.name === "guided-human" ? 100 * 60 : 120 * 60;
    pushWindowGate(gates, "fail", `${result.name} ending window`, result.skyHeartAt, earliestEnding, 210 * 60);
    pushQuietGate(gates, "fail", `${result.name} quiet time`, result.maxQuietSeconds, 10 * 60);
    pushStageWindowWarnings(gates, result);
    return gates;
  }

  if (result.name === "guided-human") {
    pushWindowGate(gates, "warning", "guided-human ending window", result.skyHeartAt, 100 * 60, 210 * 60);
    pushQuietGate(gates, "warning", "guided-human quiet time", result.maxQuietSeconds, 10 * 60);
    pushStageWindowWarnings(gates, result);
    return gates;
  }

  if (result.name === "comfort-first") {
    pushLatestGate(gates, "fail", "comfort ending latest", result.skyHeartAt, 4 * 60 * 60);
    pushEarliestGate(gates, "warning", "comfort ending too fast", result.skyHeartAt, 150 * 60);
    pushQuietGate(gates, "fail", "comfort quiet time", result.maxQuietSeconds, 10 * 60);
    return gates;
  }

  if (result.name === "bad-but-plausible") {
    pushLatestGate(gates, "fail", "bad route reaches climate", result.milestoneAt.firstClimateRewrite, 4 * 60 * 60);
    pushQuietGate(gates, "fail", "bad route quiet time", result.maxQuietSeconds, 12 * 60);
    pushLatestGate(gates, "warning", "bad route ending latest", result.skyHeartAt, 5 * 60 * 60);
    return gates;
  }

  if (result.name === "roi-greedy") {
    pushEarliestGate(gates, "warning", "roi-greedy exposes fast ending", result.skyHeartAt, 100 * 60);
    if (!result.skyHeartAt) {
      gates.push({ status: "warning", label: "roi-greedy ending", detail: "压力路线未通关，仅报告不阻断。" });
    }
    return gates;
  }

  if (result.name === "new-player-visible") {
    pushLatestGate(gates, "warning", "new player reaches climate", result.milestoneAt.firstClimateRewrite, 4 * 60 * 60);
    pushEarliestGate(gates, "warning", "new player ending too fast", result.skyHeartAt, 120 * 60);
    pushQuietGate(gates, "warning", "new player quiet time", result.maxQuietSeconds, 12 * 60);
  }

  if (result.name === "misled-storm-player") {
    pushLatestGate(gates, "warning", "misled storm reaches storm2", result.milestoneAt.secondStormFront, 4 * 60 * 60);
    pushQuietGate(gates, "warning", "misled storm quiet time", result.maxQuietSeconds, 12 * 60);
    if (!hasStormTrunk(result.state)) {
      gates.push({
        status: "warning",
        label: "misled storm trunk",
        detail: "风暴主干未完成，说明自动点亮或旧存档补偿失败。",
      });
    }
  }

  return gates;
}

function pushStageWindowWarnings(gates, result) {
  for (const window of STAGE_WINDOWS) {
    pushWindowGate(gates, "warning", window.label, getStageTime(result, window.id), window.min, window.max);
  }
}

function getStageTime(result, stageId) {
  if (stageId.startsWith("rank")) {
    return result.rankAt[Number(stageId.replace("rank", ""))];
  }

  if (stageId === "skyHeart") {
    return result.skyHeartAt;
  }

  return result.milestoneAt[stageId] ?? null;
}

function pushWindowGate(gates, severity, label, actual, min, max) {
  if (!actual) {
    gates.push({
      status: severity,
      label,
      detail: `未达成，目标 ${formatTime(min)}-${formatTime(max)}。`,
    });
    return;
  }

  if (actual < min) {
    gates.push({
      status: severity,
      label,
      detail: `${formatTime(actual)}，早于目标 ${formatTime(min)}。`,
    });
    return;
  }

  if (actual > max) {
    gates.push({
      status: severity,
      label,
      detail: `${formatTime(actual)}，晚于目标 ${formatTime(max)}。`,
    });
    return;
  }

  gates.push({
    status: "pass",
    label,
    detail: `${formatTime(actual)} 在目标 ${formatTime(min)}-${formatTime(max)} 内。`,
  });
}

function pushLatestGate(gates, severity, label, actual, latest) {
  if (!actual) {
    gates.push({
      status: severity,
      label,
      detail: `未达成，目标不晚于 ${formatTime(latest)}。`,
    });
    return;
  }

  gates.push({
    status: actual <= latest ? "pass" : severity,
    label,
    detail: `${formatTime(actual)}，目标不晚于 ${formatTime(latest)}。`,
  });
}

function pushEarliestGate(gates, severity, label, actual, earliest) {
  if (!actual) {
    gates.push({
      status: severity,
      label,
      detail: "未达成；若路线用于压力测试，这不是阻断项。",
    });
    return;
  }

  gates.push({
    status: actual >= earliest ? "pass" : severity,
    label,
    detail: `${formatTime(actual)}，目标不早于 ${formatTime(earliest)}。`,
  });
}

function pushQuietGate(gates, severity, label, actual, max) {
  gates.push({
    status: actual <= max ? "pass" : severity,
    label,
    detail: `最长静默 ${formatTime(actual)}，目标不超过 ${formatTime(max)}。`,
  });
}

function printGateSummary(gateResults) {
  console.log("Balance gate summary");
  for (const result of gateResults) {
    const failCount = result.gates.filter((gate) => gate.status === "fail").length;
    const warningCount = result.gates.filter((gate) => gate.status === "warning").length;
    const passCount = result.gates.filter((gate) => gate.status === "pass").length;
    console.log(`  ${result.name}: ${failCount} fail, ${warningCount} warning, ${passCount} pass`);
  }
}

function formatGateStatus(gates) {
  const failCount = gates.filter((gate) => gate.status === "fail").length;
  const warningCount = gates.filter((gate) => gate.status === "warning").length;
  if (failCount > 0) {
    return `${failCount} fail, ${warningCount} warning`;
  }

  if (warningCount > 0) {
    return `${warningCount} warning`;
  }

  return "pass";
}

function formatMilestoneTimeline(result) {
  const entries = [
    ["monsoon1", result.milestoneAt.firstMonsoon],
    ["storm1", result.milestoneAt.firstStormFront],
    ["storm2", result.milestoneAt.secondStormFront],
    ["climate1", result.milestoneAt.firstClimateRewrite],
    ["pulse1", result.milestoneAt.skyPulse1],
    ["pulse2", result.milestoneAt.skyPulse2],
    ["pulse3", result.milestoneAt.skyPulse3],
    ["skyHeart", result.skyHeartAt],
  ];

  return entries.map(([label, second]) => `${label} ${formatTime(second)}`).join(" | ");
}

function formatStageDurations(result) {
  const entries = [
    ["start->monsoon1", null, result.milestoneAt.firstMonsoon],
    ["monsoon1->storm1", result.milestoneAt.firstMonsoon, result.milestoneAt.firstStormFront],
    ["storm1->storm2", result.milestoneAt.firstStormFront, result.milestoneAt.secondStormFront],
    ["storm2->climate1", result.milestoneAt.secondStormFront, result.milestoneAt.firstClimateRewrite],
    ["climate1->ending", result.milestoneAt.firstClimateRewrite, result.skyHeartAt],
  ];

  return entries.map(([label, start, end]) => `${label} ${formatDuration(start, end)}`).join(" | ");
}

function formatDuration(start, end) {
  if (end === null || end === undefined) {
    return "never";
  }

  const startSecond = start ?? 0;
  if (end < startSecond) {
    return "n/a";
  }

  return formatTime(end - startSecond);
}

function formatStormTrunkStatus(state) {
  const completed = STORM_TRUNK_UPGRADES.filter((upgrade) => state.stormUpgrades[upgrade.id] >= upgrade.level);
  return `${completed.length}/${STORM_TRUNK_UPGRADES.length} ${hasStormTrunk(state) ? "complete" : "incomplete"}`;
}

function formatLargestRateJumps(result) {
  const jumps = [
    ...getLargestSnapshotRateJumps(result.snapshots),
    ...getLargestPurchaseRateJumps(result.purchases),
  ]
    .sort((left, right) => right.deltaOrders - left.deltaOrders)
    .slice(0, 6);

  if (jumps.length <= 0) {
    return "none";
  }

  return jumps
    .map((purchase) => (
      `${formatTime(purchase.second)} ${purchase.label} +${purchase.deltaOrders.toFixed(1)} orders`
    ))
    .join(", ");
}

function printStormWindowDiagnostics(result) {
  const storm1At = result.milestoneAt.firstStormFront;
  const storm2At = result.milestoneAt.secondStormFront;
  if (!storm1At || !storm2At) {
    console.log("  storm1->storm2 diagnostic: unavailable");
    return;
  }

  const startSnapshot = findSnapshot(result.snapshots, "第一风暴前线");
  const endSnapshot = findSnapshot(result.snapshots, "第二风暴前线前") ?? findSnapshot(result.snapshots, "第二风暴前线");
  if (!startSnapshot || !endSnapshot) {
    console.log("  storm1->storm2 diagnostic: missing snapshots");
    return;
  }

  const windowPurchases = result.purchases.filter((purchase) => (
    purchase.second > storm1At && purchase.second <= storm2At
  ));
  const rateDelta = endSnapshot.rateLog - startSnapshot.rateLog;
  const bestDelta = endSnapshot.bestWeatherExp - startSnapshot.bestWeatherExp;

  console.log("  storm1->storm2 diagnostic:");
  console.log(
    `    window ${formatDuration(storm1At, storm2At)} | rate ${formatLogValue(startSnapshot.rateLog)}/s -> ${formatLogValue(endSnapshot.rateLog)}/s `
    + `(${formatSignedOrders(rateDelta)}) | best ${formatLogValue(startSnapshot.bestWeatherExp)} -> ${formatLogValue(endSnapshot.bestWeatherExp)} `
    + `(${formatSignedOrders(bestDelta)})`,
  );
  console.log(`    components: ${formatComponentDelta(startSnapshot.componentLogs, endSnapshot.componentLogs)}`);
  console.log(`    layer bonus: ${formatLayerDelta(startSnapshot.layerBonus, endSnapshot.layerBonus)}`);
  console.log(`    run levels: ${formatLevelDeltas(startSnapshot.runLevels, endSnapshot.runLevels)}`);
  console.log(`    pressure levels: ${formatLevelDeltas(startSnapshot.pressureLevels, endSnapshot.pressureLevels)}`);
  console.log(`    storm levels: ${formatLevelDeltas(startSnapshot.stormLevels, endSnapshot.stormLevels)}`);
  console.log(`    purchases: ${formatPurchaseSummary(filterDiagnosticPurchases(windowPurchases)) || "none"}`);
  console.log(`    top purchase jumps: ${formatTopWindowPurchaseJumps(windowPurchases)}`);
}

function printMonsoonToStormDiagnostics(result) {
  const monsoon1At = result.milestoneAt.firstMonsoon;
  const storm1At = result.milestoneAt.firstStormFront;
  if (!monsoon1At || !storm1At) {
    console.log("  monsoon1->storm1 diagnostic: unavailable");
    return;
  }

  const startSnapshot = findSnapshot(result.snapshots, "第一次季风");
  const endSnapshot = findSnapshot(result.snapshots, "第一风暴前线前") ?? findSnapshot(result.snapshots, "第一风暴前线");
  if (!startSnapshot || !endSnapshot) {
    console.log("  monsoon1->storm1 diagnostic: missing snapshots");
    return;
  }

  const windowPurchases = result.purchases.filter((purchase) => (
    purchase.second > monsoon1At && purchase.second <= storm1At
  ));
  const rateDelta = endSnapshot.rateLog - startSnapshot.rateLog;
  const bestDelta = endSnapshot.bestWeatherExp - startSnapshot.bestWeatherExp;

  console.log("  monsoon1->storm1 diagnostic:");
  console.log(
    `    window ${formatDuration(monsoon1At, storm1At)} | rate ${formatLogValue(startSnapshot.rateLog)}/s -> ${formatLogValue(endSnapshot.rateLog)}/s `
    + `(${formatSignedOrders(rateDelta)}) | best ${formatLogValue(startSnapshot.bestWeatherExp)} -> ${formatLogValue(endSnapshot.bestWeatherExp)} `
    + `(${formatSignedOrders(bestDelta)})`,
  );
  console.log(`    components: ${formatComponentDelta(startSnapshot.componentLogs, endSnapshot.componentLogs)}`);
  console.log(`    layer bonus: ${formatLayerDelta(startSnapshot.layerBonus, endSnapshot.layerBonus)}`);
  console.log(`    run levels: ${formatLevelDeltas(startSnapshot.runLevels, endSnapshot.runLevels)}`);
  console.log(`    pressure levels: ${formatLevelDeltas(startSnapshot.pressureLevels, endSnapshot.pressureLevels)}`);
  console.log(`    storm levels: ${formatLevelDeltas(startSnapshot.stormLevels, endSnapshot.stormLevels)}`);
  console.log(`    purchases: ${formatPurchaseSummary(filterDiagnosticPurchases(windowPurchases)) || "none"}`);
  console.log(`    top purchase jumps: ${formatTopWindowPurchaseJumps(windowPurchases)}`);
}

function findSnapshot(snapshots, label) {
  return snapshots.find((snapshot) => snapshot.label === label);
}

function filterDiagnosticPurchases(purchases) {
  return purchases.filter((purchase) => {
    if (purchase.layer === "run") {
      return STORM_WINDOW_RUN_UPGRADES.includes(purchase.id);
    }

    if (purchase.layer === "pressure") {
      return STORM_WINDOW_PRESSURE_UPGRADES.includes(purchase.id);
    }

    if (purchase.layer === "storm") {
      return STORM_WINDOW_STORM_UPGRADES.includes(purchase.id);
    }

    return false;
  });
}

function formatTopWindowPurchaseJumps(purchases) {
  const jumps = purchases
    .map((purchase) => ({
      ...purchase,
      deltaOrders: purchase.afterRateLog - purchase.beforeRateLog,
    }))
    .filter((purchase) => Number.isFinite(purchase.deltaOrders) && purchase.deltaOrders > 0.05)
    .sort((left, right) => right.deltaOrders - left.deltaOrders)
    .slice(0, 8);

  if (jumps.length <= 0) {
    return "none";
  }

  return jumps
    .map((purchase) => `${formatTime(purchase.second)} ${purchase.layer}.${purchase.id} Lv.${purchase.level} ${formatSignedOrders(purchase.deltaOrders)}`)
    .join(", ");
}

function formatComponentDelta(before, after) {
  return [
    ["passive", "passive"],
    ["autoDrizzle", "auto"],
    ["clickAverage", "click/s"],
    ["producerMultiplier", "producer"],
  ]
    .map(([key, label]) => `${label} ${formatOrders(before[key])}->${formatOrders(after[key])} (${formatSignedOrders(after[key] - before[key])})`)
    .join(" | ");
}

function formatLayerDelta(before, after) {
  return ["cloudCore", "pressure", "storm", "climate", "skyHeart"]
    .map((key) => `${key} +${before[key].toFixed(1)}->+${after[key].toFixed(1)} (${formatSignedOrders(after[key] - before[key])})`)
    .join(" | ");
}

function formatLevelDeltas(before, after) {
  const deltas = Object.keys(after)
    .filter((key) => after[key] !== before[key])
    .map((key) => `${key} ${before[key]}->${after[key]}`);

  return deltas.length > 0 ? deltas.join(", ") : "none";
}

function formatSignedOrders(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} orders`;
}

function formatOrders(value) {
  if (!Number.isFinite(value)) {
    return "-inf";
  }

  return `${value.toFixed(2)} orders`;
}

function getLargestSnapshotRateJumps(snapshots) {
  const jumps = [];
  for (let index = 1; index < snapshots.length; index += 1) {
    const before = snapshots[index - 1];
    const after = snapshots[index];
    const deltaOrders = after.rateLog - before.rateLog;
    if (!Number.isFinite(deltaOrders) || deltaOrders < 5) {
      continue;
    }

    jumps.push({
      second: after.second,
      label: `${before.label}->${after.label}`,
      deltaOrders,
    });
  }

  return jumps;
}

function getLargestPurchaseRateJumps(purchases) {
  return purchases
    .map((purchase) => ({
      second: purchase.second,
      label: `${purchase.layer}.${purchase.id} Lv.${purchase.level}`,
      deltaOrders: purchase.afterRateLog - purchase.beforeRateLog,
    }))
    .filter((purchase) => Number.isFinite(purchase.deltaOrders) && purchase.deltaOrders >= 5)
    .sort((left, right) => right.deltaOrders - left.deltaOrders)
    .slice(0, 6);
}

function formatMaxLevels(maxLevels) {
  if (maxLevels.length <= 0) {
    return "none";
  }

  return maxLevels
    .slice(0, 12)
    .map((entry) => `${entry.key} Lv.${entry.level}`)
    .join(", ");
}

function compactList(items, headCount, tailCount) {
  if (items.length <= headCount + tailCount + 1) {
    return items;
  }

  return [
    ...items.slice(0, headCount),
    "...",
    ...items.slice(items.length - tailCount),
  ];
}

function shouldPrintPurchase(purchase) {
  if (purchase.layer !== "run") {
    return true;
  }

  return purchase.level <= 3 || [5, 10, 25, 50, 100, 200, 300].includes(purchase.level);
}

function formatPurchaseSummary(purchases) {
  const groups = new Map();
  for (const purchase of purchases) {
    const key = `${purchase.layer}.${purchase.id}`;
    const current = groups.get(key) ?? { count: 0, maxLevel: 0 };
    current.count += 1;
    current.maxLevel = Math.max(current.maxLevel, purchase.level);
    groups.set(key, current);
  }

  return [...groups.entries()]
    .map(([key, value]) => `${key} x${value.count} (max Lv.${value.maxLevel})`)
    .join(", ");
}

function formatLog(value) {
  if (!Number.isFinite(value)) {
    return "-inf";
  }

  return value.toFixed(2);
}

function formatLogValue(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const exponent = Math.floor(value);
  let mantissa = 10 ** (value - exponent);
  let normalizedExponent = exponent;

  if (mantissa >= 9.95) {
    mantissa = 1;
    normalizedExponent += 1;
  }

  if (normalizedExponent >= -2 && normalizedExponent <= 5) {
    return formatSmallScientificValue(mantissa * 10 ** normalizedExponent);
  }

  return `${mantissa.toFixed(1)}e${normalizedExponent}`;
}

function formatSmallScientificValue(value) {
  if (value >= 1000) {
    return Math.round(value).toString();
  }

  if (value >= 100) {
    return value.toFixed(1).replace(/\.0$/, "");
  }

  if (value >= 10) {
    return value.toFixed(2).replace(/\.?0+$/, "");
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
}

function formatPayback(value) {
  if (value === null) {
    return "n/a";
  }

  if (typeof value === "string") {
    return value;
  }

  return formatTime(value);
}

function formatTime(second) {
  if (second === null || second === undefined) {
    return "never";
  }

  const rounded = Math.floor(second);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
