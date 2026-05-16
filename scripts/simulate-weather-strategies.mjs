import {
  CLIMATE_LAWS,
  PERMANENT_UPGRADES,
  PRESSURE_UPGRADES,
  STORM_UPGRADES,
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
  getLayerBonusBreakdown,
  getLayerUpgradeCost,
  getPressureGainOnMonsoon,
  getRainRankRequirementExp,
  getStormCellGain,
  getUpgrade,
  getUpgradeCost,
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
const PRIMARY_BALANCE_STRATEGIES = ["patient-multiplier-human", "guided-human"];

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
  { id: "firstClimateRewrite", label: "第一次气候改写", isReached: (state) => state.totalClimateRewrites >= 1 },
  { id: "skyPulse1", label: "天空心脏脉冲 1", isReached: (state) => state.skyHeartPulseLevel >= 1 },
  { id: "skyPulse2", label: "天空心脏脉冲 2", isReached: (state) => state.skyHeartPulseLevel >= 2 },
  { id: "skyPulse3", label: "天空心脏脉冲 3", isReached: (state) => state.skyHeartPulseLevel >= 3 },
  { id: "skyHeart", label: "天空心脏点燃", isReached: (state) => state.skyHeartAwakened },
];

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
    stormOrder: ["frontMemory", "rainOverload", "thunderUpdraft", "stormBatch", "windEyeRelic", "frontScar", "stormPrism"],
    climateOrder: ["condensationLaw", "deepRootLaw", "returningMonsoon", "stormWeaving", "cloudCoreRefraction", "skyHeartOmen", "climateCodex"],
    resetFirst: false,
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
    stormOrder: ["frontMemory", "rainOverload", "thunderUpdraft", "stormBatch", "windEyeRelic", "frontScar", "stormPrism"],
    climateOrder: ["condensationLaw", "deepRootLaw", "returningMonsoon", "stormWeaving", "cloudCoreRefraction", "skyHeartOmen", "climateCodex"],
    resetFirst: true,
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
    stormOrder: ["thunderUpdraft", "rainOverload", "frontScar", "stormPrism", "stormBatch", "frontMemory", "windEyeRelic"],
    climateOrder: ["deepRootLaw", "condensationLaw", "stormWeaving", "cloudCoreRefraction", "skyHeartOmen", "returningMonsoon", "climateCodex"],
    resetFirst: false,
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
    stormOrder: ["frontMemory", "stormBatch", "windEyeRelic", "rainOverload", "thunderUpdraft", "frontScar", "stormPrism"],
    climateOrder: ["returningMonsoon", "condensationLaw", "deepRootLaw", "cloudCoreRefraction", "stormWeaving", "skyHeartOmen", "climateCodex"],
    resetFirst: true,
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
    stormOrder: ["rainOverload", "frontMemory", "stormBatch", "thunderUpdraft", "windEyeRelic", "frontScar", "stormPrism"],
    climateOrder: ["condensationLaw", "returningMonsoon", "deepRootLaw", "stormWeaving", "skyHeartOmen", "cloudCoreRefraction", "climateCodex"],
    resetFirst: true,
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
      "livingSoil",
      "autoRainRank",
      "bulkRainRank",
      "rankCompressionCore",
      "monsoonLens",
      "windEyeMemory",
      "cloudCorePrism",
      "returningMonsoonCore",
    ],
    pressureOrder: ["lowPressure", "updraft", "eyeWall", "frontCompression", "pressureGauge"],
    stormOrder: ["frontMemory", "rainOverload", "thunderUpdraft", "stormBatch", "windEyeRelic", "frontScar", "stormPrism"],
    climateOrder: ["condensationLaw", "deepRootLaw", "returningMonsoon", "stormWeaving", "cloudCoreRefraction", "skyHeartOmen", "climateCodex"],
    resetFirst: true,
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
      const action = runStrategyAction(state, strategy, second, purchases, events);
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

function runStrategyAction(state, strategy, second, purchases, events) {
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
    Object.assign(state, performStormFrontReset(state));
    events.push({ second, type: "storm", text: `${milestone.title}，+${gainedStormCells} 风暴胞` });
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

  const shouldProtectFirstLevels = ["rootWake", "cloudBloom", "windEye", "heavyRain", "monsoonPull"];
  if (canClaimRainRank(state) && buyFirstMissingRunUpgrade(state, shouldProtectFirstLevels, second, purchases)) {
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

  if (state.rainRanks < 1) {
    return uniqueUpgradeOrder(["weatherAmplifier", "dropletSeed", ...clickBridge]);
  }

  if (state.rainRanks < 3) {
    return uniqueUpgradeOrder(["rootWake", "weatherAmplifier", "dropletSeed", ...clickBridge]);
  }

  if (state.rainRanks < 6) {
    return uniqueUpgradeOrder(["cloudBloom", "rootWake", "windEye", "weatherAmplifier", "dropletSeed", ...clickBridge]);
  }

  if (state.rainRanks < requiredRanks) {
    return uniqueUpgradeOrder(["windEye", "cloudBloom", "rootWake", "heavyRain", "weatherAmplifier", "dropletSeed", ...clickBridge, "rankCompression"]);
  }

  return uniqueUpgradeOrder([
    "monsoonPull",
    "weatherAmplifier",
    "heavyRain",
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
  if (state.totalMonsoonCycles <= 0 && state.upgrades.cloudTouch < 3) {
    return true;
  }

  if (state.upgrades.cloudTouch >= 3) {
    return false;
  }

  const passiveLog = calculateWeatherPerSecondLog(state);
  const clickEquivalentLog = log10Safe(getCloudTouchAmount(state) / 2);
  return !Number.isFinite(passiveLog) || passiveLog < clickEquivalentLog;
}

function shouldPatientWaitForRunUpgrade(state) {
  if (hasAffordableFirstLevelInfrastructure(state)) {
    return null;
  }

  const candidates = [
    { id: "weatherAmplifier", maxWaitSeconds: state.totalMonsoonCycles <= 0 ? 60 : 30, minAdvantageLog: 0.18, maxCurrentLevel: state.totalMonsoonCycles <= 0 ? 5 : 3 },
    { id: "windEye", maxWaitSeconds: 75, minAdvantageLog: 0.08, maxCurrentLevel: 1 },
    { id: "heavyRain", maxWaitSeconds: state.rainRanks >= 8 ? 90 : 45, minAdvantageLog: 0.12, maxCurrentLevel: 2 },
    { id: "monsoonPull", maxWaitSeconds: 90, minAdvantageLog: 0.35, maxCurrentLevel: 3 },
  ];

  for (const candidate of candidates) {
    if (state.upgrades[candidate.id] >= candidate.maxCurrentLevel) {
      continue;
    }

    if (!shouldConsiderWaitingForUpgrade(state, candidate.id)) {
      continue;
    }

    const upgrade = getUpgrade(candidate.id);
    const waitSeconds = estimateWaitSecondsForCost(state, getUpgradeCost(state, upgrade));
    if (waitSeconds > candidate.maxWaitSeconds) {
      continue;
    }

    const targetGain = getRunUpgradeRateGainLog(state, candidate.id);
    const bestAffordableGain = getBestAffordableRunUpgradeGainLog(state, candidate.id);
    if (targetGain >= bestAffordableGain + candidate.minAdvantageLog) {
      return { upgradeId: candidate.id, waitSeconds };
    }
  }

  return null;
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
  };
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
  console.log(
    `  totals: monsoon ${state.totalMonsoonCycles}, stormFront ${state.totalStormFronts}, climateRewrite ${state.totalClimateRewrites}, `
    + `cloudCores ${state.cloudCores}/${state.totalCloudCores}, stormCells ${state.stormCells}/${state.totalStormCells}, `
    + `climateThreads ${state.climateThreads}/${state.totalClimateThreads}`,
  );
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
  console.log("  layer snapshots:");
  for (const snapshot of compactList(result.snapshots, 10, 8)) {
    if (snapshot === "...") {
      console.log("    ...");
      continue;
    }
    console.log(
      `    - ${formatTime(snapshot.second)} ${snapshot.label}: weather 1e${formatLog(snapshot.weatherExp)}, `
      + `rate 1e${formatLog(snapshot.rateLog)}/s, best 1e${formatLog(snapshot.bestWeatherExp)}, `
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
      + `rate 1e${formatLog(purchase.beforeRateLog)} -> 1e${formatLog(purchase.afterRateLog)} | `
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
    pushQuietGate(gates, "warning", "new player quiet time", result.maxQuietSeconds, 12 * 60);
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
    ["climate1", result.milestoneAt.firstClimateRewrite],
    ["pulse1", result.milestoneAt.skyPulse1],
    ["pulse2", result.milestoneAt.skyPulse2],
    ["pulse3", result.milestoneAt.skyPulse3],
    ["skyHeart", result.skyHeartAt],
  ];

  return entries.map(([label, second]) => `${label} ${formatTime(second)}`).join(" | ");
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
