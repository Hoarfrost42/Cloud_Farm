import {
  UPGRADE_DEFINITIONS,
  MONSOON_RAIN_RANK_REQUIREMENT,
  applyCloudTouch,
  calculateRates,
  canPay,
  canRunMonsoon,
  createInitialState,
  getMonsoonWeatherTarget,
  getRainRankRequirement,
  getUpgrade,
  getUpgradeCost,
  isUpgradeVisible,
  payCost,
  performRainRankReset,
  runTick,
} from "../src/game/economy/index.ts";

const STEP_SECONDS = 1;
const MAX_SECONDS = 21600;
const QUIET_WARNING_SECONDS = 600;
const RANK_MILESTONES = [1, 3, 6, 8, MONSOON_RAIN_RANK_REQUIREMENT];
const FIRST_LEVEL_BEFORE_RANK_RESET = ["rootWake", "cloudBloom", "windEye", "heavyRain", "monsoonPull"];
const ALL_UPGRADE_IDS = UPGRADE_DEFINITIONS.map((upgrade) => upgrade.id);

const strategies = [
  {
    name: "guided-human",
    description: "按当前 UI 目标理解来买：先建立基流，再按雨阶推进生产者链和季风牵引。",
    chooseUpgrade: (state) => chooseFirstAffordable(state, getGuidedOrder(state)),
    buyBeforeReset: FIRST_LEVEL_BEFORE_RANK_RESET,
    resetFirst: false,
  },
  {
    name: "roi-greedy-45s",
    description: "买 45 秒内天气活力收益/成本最高的可见升级，代表短线熟练玩家。",
    chooseUpgrade: (state) => chooseBestValueUpgrade(state, 45),
    resetFirst: false,
  },
  {
    name: "roi-greedy-180s",
    description: "买 180 秒内天气活力收益/成本最高的可见升级，代表更有耐心的 ROI 玩家。",
    chooseUpgrade: (state) => chooseBestValueUpgrade(state, 180),
    resetFirst: false,
  },
  {
    name: "comfort-first",
    description: "优先点击、基流和明确自动增长，再补生产者链；够雨阶时偏向先 reset。",
    chooseUpgrade: (state) => chooseFirstAffordable(state, getComfortOrder(state)),
    buyBeforeReset: ["rootWake", "cloudBloom", "windEye"],
    resetFirst: true,
  },
  {
    name: "bad-but-plausible",
    description: "过度强化早期点击和基流，较晚补生产者链，用来测试低效但合理的路线。",
    chooseUpgrade: (state) => chooseFirstAffordable(state, getBadButPlausibleOrder(state)),
    resetFirst: true,
  },
];

const results = strategies.map((strategy) => simulateStrategy(strategy));

console.log("Weather strategy simulation");
console.log("Formula source: src/game/economy/*");
console.log(`Quiet warning threshold: ${formatTime(QUIET_WARNING_SECONDS)}`);
console.log("");

for (const result of results) {
  console.log(result.name);
  console.log(`  ${result.description}`);
  console.log(
    `  passive: ${formatTime(result.firstPassiveAt)} | `
    + `rank 1/3/6/8/${MONSOON_RAIN_RANK_REQUIREMENT}: `
    + `${formatTime(result.rankAt[1])} / ${formatTime(result.rankAt[3])} / ${formatTime(result.rankAt[6])} / `
    + `${formatTime(result.rankAt[8])} / ${formatTime(result.rankAt[MONSOON_RAIN_RANK_REQUIREMENT])} | `
    + `monsoon: ${formatTime(result.firstMonsoonAt)}`,
  );
  console.log(
    `  quiet: max ${formatTime(result.maxQuietSeconds)}, `
    + `${result.quietWarnings.length} warning${result.quietWarnings.length === 1 ? "" : "s"}`,
  );
  console.log(
    `  final: rank ${result.rainRanks}, cloudLevel ${result.cloudLevel}, `
    + `weather ${formatNumber(result.resources.weather)}, droplets ${formatNumber(result.resources.droplets)}, `
    + `roots ${formatNumber(result.resources.roots)}, clouds ${formatNumber(result.resources.clouds)}`,
  );
  console.log(`  purchases: ${formatPurchases(result.purchases)}`);
  console.log(`  bottleneck: ${result.bottleneck}`);
}

function simulateStrategy(strategy) {
  const state = createInitialState();
  const purchases = {};
  const rankAt = Object.fromEntries(RANK_MILESTONES.map((rank) => [rank, null]));
  const quietWarnings = [];
  let firstPassiveAt = null;
  let firstMonsoonAt = null;
  let lastActionSecond = 0;
  let maxQuietSeconds = 0;

  for (let second = STEP_SECONDS; second <= MAX_SECONDS; second += STEP_SECONDS) {
    tickState(state, STEP_SECONDS);
    markMilestones();

    if (canRunMonsoon(state)) {
      firstMonsoonAt = second;
      break;
    }

    const actionTaken = runStrategyAction(state, strategy, purchases);
    markMilestones();

    if (canRunMonsoon(state)) {
      firstMonsoonAt = second;
      break;
    }

    if (actionTaken) {
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

  function markMilestones() {
    if (!firstPassiveAt && state.upgrades.dropletSeed >= 1) {
      firstPassiveAt = Math.floor(state.elapsedSeconds);
    }

    for (const rank of RANK_MILESTONES) {
      if (!rankAt[rank] && state.rainRanks >= rank) {
        rankAt[rank] = Math.floor(state.elapsedSeconds);
      }
    }
  }

  return {
    name: strategy.name,
    description: strategy.description,
    firstPassiveAt,
    rankAt,
    firstMonsoonAt,
    maxQuietSeconds,
    quietWarnings,
    rainRanks: state.rainRanks,
    cloudLevel: state.cloudLevel,
    resources: { ...state.resources },
    bottleneck: getBottleneck(state),
    purchases,
  };
}

function runStrategyAction(state, strategy, purchases) {
  if (canClaimRainRank(state) && buyFirstLevelUpgrade(state, strategy.buyBeforeReset, purchases)) {
    return true;
  }

  if (strategy.resetFirst && canClaimRainRank(state)) {
    Object.assign(state, performRainRankReset(state));
    return true;
  }

  const chosenUpgrade = strategy.chooseUpgrade?.(state) ?? null;
  if (buyChosenUpgrade(state, chosenUpgrade, purchases)) {
    return true;
  }

  if (canClaimRainRank(state)) {
    Object.assign(state, performRainRankReset(state));
    return true;
  }

  return false;
}

function tickState(state, seconds) {
  if (state.clickCooldownRemaining <= 0) {
    Object.assign(state, applyCloudTouch(state));
  }

  Object.assign(state, runTick(state, seconds));
}

function getGuidedOrder(state) {
  if (state.rainRanks < 1) {
    return ["cloudTouch", "dropletSeed", "weatherAmplifier"];
  }

  if (state.rainRanks < 3) {
    return ["rootWake", "weatherAmplifier", "dropletSeed", "cloudTouch"];
  }

  if (state.rainRanks < 6) {
    return ["cloudBloom", "rootWake", "weatherAmplifier", "dropletSeed", "windEye", "cloudTouch"];
  }

  if (state.rainRanks < MONSOON_RAIN_RANK_REQUIREMENT) {
    return ["windEye", "cloudBloom", "rootWake", "heavyRain", "weatherAmplifier", "dropletSeed", "cloudTouch"];
  }

  return ["monsoonPull", "heavyRain", "weatherAmplifier", "windEye", "cloudBloom", "rootWake", "dropletSeed", "cloudTouch"];
}

function getComfortOrder(state) {
  if (state.rainRanks < 1) {
    return ["cloudTouch", "dropletSeed", "weatherAmplifier"];
  }

  return [
    "cloudTouch",
    "dropletSeed",
    "weatherAmplifier",
    "rootWake",
    "cloudBloom",
    "windEye",
    "heavyRain",
    "monsoonPull",
  ];
}

function getBadButPlausibleOrder(state) {
  if (state.rainRanks < 8) {
    return ["cloudTouch", "dropletSeed", "weatherAmplifier"];
  }

  return [
    "cloudTouch",
    "dropletSeed",
    "weatherAmplifier",
    "heavyRain",
    "monsoonPull",
    "rootWake",
    "cloudBloom",
    "windEye",
  ];
}

function chooseFirstAffordable(state, order) {
  if (!order) {
    return null;
  }

  return order.find((upgradeId) => canBuyUpgrade(state, upgradeId)) ?? null;
}

function buyFirstLevelUpgrade(state, order, purchases) {
  if (!order) {
    return false;
  }

  for (const upgradeId of order) {
    if (state.upgrades[upgradeId] > 0) {
      continue;
    }

    if (buyChosenUpgrade(state, upgradeId, purchases)) {
      return true;
    }
  }

  return false;
}

function buyChosenUpgrade(state, upgradeId, purchases) {
  if (!upgradeId || !canBuyUpgrade(state, upgradeId)) {
    return false;
  }

  const upgrade = getUpgrade(upgradeId);
  const cost = getUpgradeCost(state, upgrade);
  state.resources = payCost(state.resources, cost);
  state.upgrades[upgradeId] += 1;

  if (purchases) {
    purchases[upgradeId] = (purchases[upgradeId] ?? 0) + 1;
  }

  return true;
}

function canBuyUpgrade(state, upgradeId) {
  if (!isUpgradeVisible(state, upgradeId)) {
    return false;
  }

  return canPay(state.resources, getUpgradeCost(state, getUpgrade(upgradeId)));
}

function chooseBestValueUpgrade(state, horizonSeconds) {
  const candidates = UPGRADE_DEFINITIONS
    .filter((upgrade) => canBuyUpgrade(state, upgrade.id));

  let bestUpgradeId = null;
  let bestScore = 0;
  const currentProjection = projectWeatherAfterSeconds(state, horizonSeconds);

  for (const upgrade of candidates) {
    const nextState = cloneState(state);
    buyChosenUpgrade(nextState, upgrade.id);
    const nextProjection = projectWeatherAfterSeconds(nextState, horizonSeconds);
    const gainDelta = Math.max(0, nextProjection - currentProjection);
    const score = gainDelta / Math.max(1, getWeightedCost(getUpgradeCost(state, upgrade)));

    if (score > bestScore) {
      bestScore = score;
      bestUpgradeId = upgrade.id;
    }
  }

  return bestUpgradeId;
}

function projectWeatherAfterSeconds(state, seconds) {
  const projected = cloneState(state);
  for (let elapsed = 0; elapsed < seconds; elapsed += STEP_SECONDS) {
    tickState(projected, STEP_SECONDS);
  }

  return projected.resources.weather;
}

function cloneState(state) {
  return {
    ...state,
    resources: { ...state.resources },
    upgrades: { ...state.upgrades },
    permanentUpgrades: [...state.permanentUpgrades],
  };
}

function getWeightedCost(cost) {
  return (cost.weather ?? 0)
    + (cost.droplets ?? 0) * 8
    + (cost.roots ?? 0) * 40
    + (cost.clouds ?? 0) * 160;
}

function canClaimRainRank(state) {
  return state.resources.weather >= getRainRankRequirement(state);
}

function getBottleneck(state) {
  if (state.rainRanks < MONSOON_RAIN_RANK_REQUIREMENT) {
    return `${formatNumber(Math.max(0, getRainRankRequirement(state) - state.resources.weather))} weather to rank ${state.rainRanks + 1}`;
  }

  if (state.upgrades.windEye <= 0) {
    return "needs windEye for monsoon";
  }

  if (!canRunMonsoon(state)) {
    return `${formatNumber(Math.max(0, getMonsoonWeatherTarget(state) - state.resources.weather))} weather to monsoon`;
  }

  return "ready for monsoon";
}

function formatTime(second) {
  if (!second) {
    return "never";
  }

  const rounded = Math.floor(second);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function formatNumber(value) {
  const absValue = Math.abs(value);
  if (absValue >= 1e6) {
    return value.toExponential(2).replace("e+", "e");
  }

  if (absValue >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return Math.round(value).toString();
}

function formatPurchases(purchases) {
  const entries = Object.entries(purchases)
    .filter(([, count]) => count > 0)
    .sort(([leftId], [rightId]) => ALL_UPGRADE_IDS.indexOf(leftId) - ALL_UPGRADE_IDS.indexOf(rightId))
    .map(([upgradeId, count]) => `${upgradeId} x${count}`);

  return entries.length > 0 ? entries.join(", ") : "none";
}
