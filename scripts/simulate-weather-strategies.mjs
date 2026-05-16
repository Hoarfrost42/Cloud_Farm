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
  getCloudCoreGain,
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
];

const results = strategies.map((strategy) => simulateStrategy(strategy));

console.log("Weather Reactor v13 strategy simulation");
console.log("Formula source: src/game/economy/*");
console.log(`Quiet warning threshold: ${formatTime(QUIET_WARNING_SECONDS)}`);
console.log("");

for (const result of results) {
  printResult(result);
}

const requiredStrategies = results.filter((result) => ["guided-human", "roi-greedy", "comfort-first"].includes(result.name));
if (requiredStrategies.some((result) => !result.skyHeartAt)) {
  process.exitCode = 1;
}

function simulateStrategy(strategy) {
  const state = createInitialState();
  const rankAt = Object.fromEntries(RANK_MILESTONES.map((rank) => [rank, null]));
  const purchases = [];
  const events = [];
  const quietWarnings = [];
  let lastActionSecond = 0;
  let maxQuietSeconds = 0;
  let skyHeartAt = null;

  for (let second = STEP_SECONDS; second <= MAX_SECONDS; second += STEP_SECONDS) {
    tickState(state, STEP_SECONDS);
    markRainRanks(state, rankAt);

    let actionTakenThisSecond = false;
    for (let actionIndex = 0; actionIndex < MAX_ACTIONS_PER_SECOND; actionIndex += 1) {
      const action = runStrategyAction(state, strategy, second, purchases, events);
      if (!action) {
        break;
      }

      actionTakenThisSecond = true;
      markRainRanks(state, rankAt);
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
    skyHeartAt,
    maxQuietSeconds,
    quietWarnings,
    purchases,
    events,
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

function markRainRanks(state, rankAt) {
  for (const rank of RANK_MILESTONES) {
    if (!rankAt[rank] && state.rainRanks >= rank) {
      rankAt[rank] = Math.floor(state.elapsedSeconds);
    }
  }
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

function printResult(result) {
  const state = result.state;
  const layerBonus = getLayerBonusBreakdown(state);
  console.log(result.name);
  console.log(`  ${result.description}`);
  console.log(
    `  ending: ${formatTime(result.skyHeartAt)} | rank 1/3/6/8/10/14/16/20/25: `
    + RANK_MILESTONES.map((rank) => formatTime(result.rankAt[rank])).join(" / "),
  );
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
  console.log("  reset / milestone log:");
  for (const event of result.events) {
    console.log(`    - ${formatTime(event.second)} ${event.text}`);
  }
  console.log(`  purchase summary: ${formatPurchaseSummary(result.purchases)}`);
  console.log("  purchase milestones:");
  for (const purchase of compactList(result.purchases.filter(shouldPrintPurchase), 80, 30)) {
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
