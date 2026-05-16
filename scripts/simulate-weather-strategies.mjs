import {
  UPGRADE_DEFINITIONS,
  MONSOON_RAIN_RANK_REQUIREMENT,
  applyCloudTouch,
  calculateRates,
  canPay,
  canRunMonsoon,
  createInitialState,
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

const strategies = [
  {
    name: "early-click-auto",
    description: "先买点击和自动生成，再买倍率，够雨阶就重置。",
    order: ["cloudTouch", "dropletSeed", "weatherAmplifier", "rootWake", "cloudBloom", "windEye", "heavyRain", "monsoonPull", "autoDrizzle"],
    buyBeforeReset: ["rootWake", "cloudBloom", "windEye", "heavyRain", "monsoonPull"],
    resetFirst: true,
  },
  {
    name: "auto-rush",
    description: "只买点击和活力基流，测试纯早期路线是否会卡住。",
    order: ["cloudTouch", "dropletSeed"],
    resetFirst: true,
  },
  {
    name: "producer-chain",
    description: "雨阶后优先打通根系、云团、风眼生产链。",
    getOrder: (state) => (state.rainRanks < 3
      ? ["cloudTouch", "dropletSeed", "weatherAmplifier", "rootWake"]
      : ["rootWake", "cloudBloom", "windEye", "dropletSeed", "weatherAmplifier", "heavyRain", "monsoonPull", "cloudTouch"]),
    buyBeforeReset: ["rootWake", "cloudBloom", "windEye", "heavyRain", "monsoonPull"],
    resetFirst: true,
  },
  {
    name: "value-greedy",
    description: "贪心估算：每次买 45 秒内天气收益提升/成本最高的可见升级，买不到再雨阶。",
    chooseUpgrade: chooseBestValueUpgrade,
    resetFirst: false,
  },
];

const results = strategies.map((strategy) => simulateStrategy(strategy));

console.log("Weather strategy simulation");
console.log("Formula source: src/game/economy/*");
console.log("");
for (const result of results) {
  console.log(`${result.name}`);
  console.log(`  ${result.description}`);
  console.log(
    `  passive: ${formatTime(result.firstPassiveAt)} | `
    + `rank 1/3/6/8/${MONSOON_RAIN_RANK_REQUIREMENT}: ${formatTime(result.firstRankAt)} / ${formatTime(result.rank3At)} / ${formatTime(result.rank6At)} / ${formatTime(result.rank8At)} / ${formatTime(result.monsoonRankAt)} | `
    + `monsoon: ${formatTime(result.firstMonsoonAt)}`,
  );
  console.log(`  final: rank ${result.rainRanks}, cloudLevel ${result.cloudLevel}, weather ${formatNumber(result.resources.weather)}, droplets ${formatNumber(result.resources.droplets)}, roots ${formatNumber(result.resources.roots)}, clouds ${formatNumber(result.resources.clouds)}`);
  console.log(`  purchases: ${formatPurchases(result.purchases)}`);
  console.log(`  bottleneck: ${result.bottleneck}`);
}

function simulateStrategy(strategy) {
  const state = createInitialState();
  const purchases = {};
  const milestones = {
    firstPassiveAt: null,
    firstRankAt: null,
    rank3At: null,
    rank6At: null,
    rank8At: null,
    monsoonRankAt: null,
    firstMonsoonAt: null,
  };

  for (let tick = 1; tick <= MAX_SECONDS / STEP_SECONDS; tick += 1) {
    const second = tick * STEP_SECONDS;
    state.elapsedSeconds = second;
    tickState(state, STEP_SECONDS);

    const boughtBeforeReset = canClaimRainRank(state)
      ? buyFirstLevelUpgrade(state, strategy.buyBeforeReset, purchases)
      : false;

    if (boughtBeforeReset) {
      // Keep the current run alive after buying a production-chain unlock; it exists to push this run farther.
    } else if (strategy.resetFirst && canClaimRainRank(state)) {
      Object.assign(state, performRainRankReset(state));
    } else {
      const boughtUpgrade = strategy.chooseUpgrade
        ? buyChosenUpgrade(state, strategy.chooseUpgrade(state), purchases)
        : buyAvailableUpgrade(state, getStrategyOrder(strategy, state), purchases);

      if (!boughtUpgrade && canClaimRainRank(state)) {
        Object.assign(state, performRainRankReset(state));
      }
    }

    if (!milestones.firstPassiveAt && state.upgrades.dropletSeed >= 1) milestones.firstPassiveAt = second;
    if (!milestones.firstRankAt && state.rainRanks >= 1) milestones.firstRankAt = second;
    if (!milestones.rank3At && state.rainRanks >= 3) milestones.rank3At = second;
    if (!milestones.rank6At && state.rainRanks >= 6) milestones.rank6At = second;
    if (!milestones.rank8At && state.rainRanks >= 8) milestones.rank8At = second;
    if (!milestones.monsoonRankAt && state.rainRanks >= MONSOON_RAIN_RANK_REQUIREMENT) {
      milestones.monsoonRankAt = second;
    }
    if (!milestones.firstMonsoonAt && canRunMonsoon(state)) {
      milestones.firstMonsoonAt = second;
      break;
    }
  }

  return {
    name: strategy.name,
    description: strategy.description,
    ...milestones,
    rainRanks: state.rainRanks,
    cloudLevel: state.cloudLevel,
    resources: { ...state.resources },
    bottleneck: getBottleneck(state),
    purchases,
  };
}

function tickState(state, seconds) {
  if (state.clickCooldownRemaining <= 0) {
    Object.assign(state, applyCloudTouch(state));
  }

  Object.assign(state, runTick(state, seconds));
}

function getStrategyOrder(strategy, state) {
  return strategy.getOrder ? strategy.getOrder(state) : strategy.order;
}

function buyAvailableUpgrade(state, order, purchases) {
  if (!order) return false;

  for (const upgradeId of order) {
    if (!buyChosenUpgrade(state, upgradeId, purchases)) continue;
    return true;
  }

  return false;
}

function buyFirstLevelUpgrade(state, order, purchases) {
  if (!order) return false;

  for (const upgradeId of order) {
    if (state.upgrades[upgradeId] > 0) continue;
    if (!buyChosenUpgrade(state, upgradeId, purchases)) continue;
    return true;
  }

  return false;
}

function buyChosenUpgrade(state, upgradeId, purchases) {
  if (!upgradeId || !isUpgradeVisible(state, upgradeId)) return false;

  const upgrade = getUpgrade(upgradeId);
  const cost = getUpgradeCost(state, upgrade);
  if (!canPay(state.resources, cost)) return false;

  state.resources = payCost(state.resources, cost);
  state.upgrades[upgradeId] += 1;
  if (purchases) {
    purchases[upgradeId] = (purchases[upgradeId] ?? 0) + 1;
  }
  return true;
}

function chooseBestValueUpgrade(state) {
  const candidates = UPGRADE_DEFINITIONS
    .filter((upgrade) => isUpgradeVisible(state, upgrade.id))
    .filter((upgrade) => canPay(state.resources, getUpgradeCost(state, upgrade)));

  let bestUpgradeId = null;
  let bestScore = 0;

  for (const upgrade of candidates) {
    const currentProjection = projectWeatherAfterSeconds(state, 45);
    const nextState = cloneState(state);
    buyChosenUpgrade(nextState, upgrade.id);
    const nextProjection = projectWeatherAfterSeconds(nextState, 45);
    const gainDelta = nextProjection - currentProjection;
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
    return `${formatNumber(getRainRankRequirement(state) - state.resources.weather)} weather to rank ${state.rainRanks + 1}`;
  }

  if (state.upgrades.windEye <= 0) {
    return "needs windEye for monsoon";
  }

  if (!canRunMonsoon(state)) {
    return "needs monsoon weather target";
  }

  return "ready for monsoon";
}

function formatTime(second) {
  if (!second) return "never";
  const rounded = Math.floor(second);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function formatNumber(value) {
  const absValue = Math.abs(value);
  if (absValue >= 1e6) return value.toExponential(2).replace("e+", "e");
  if (absValue >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return Math.round(value).toString();
}

function formatPurchases(purchases) {
  const entries = Object.entries(purchases)
    .filter(([, count]) => count > 0)
    .map(([upgradeId, count]) => `${upgradeId} x${count}`);

  return entries.length > 0 ? entries.join(", ") : "none";
}
