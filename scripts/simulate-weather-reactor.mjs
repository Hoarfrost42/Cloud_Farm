import {
  PERMANENT_UPGRADES,
  MONSOON_RAIN_RANK_REQUIREMENT,
  SKY_HEART_CORE_TARGET,
  SKY_HEART_CYCLE_TARGET,
  UPGRADE_DEFINITIONS,
  applyCloudTouch,
  applyPermanentUpgradeEffects,
  calculateRates,
  canPay,
  canRunMonsoon,
  createInitialState,
  getCloudCoreGain,
  getUpgrade,
  getMonsoonWeatherTarget,
  getRainRankRequirement,
  getUpgradeCost,
  isUpgradeVisible,
  payCost,
  performRainRankReset,
  runTick,
  syncCloudUnlocks,
} from "../src/game/economy/index.ts";

const STEP_SECONDS = 0.25;
const MAX_SECONDS = 21600;
const checkpoints = new Set([60, 180, 300, 600, 900, 1200, 1800, 2400, 3600, 5400, 7200, 10800, 14400, 18000, 21600]);
const RUN_UPGRADE_ORDER = [
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
];
const FIRST_LEVEL_BEFORE_RANK_RESET = ["rootWake", "cloudBloom", "windEye"];

const state = createInitialState();
const events = [];
const loggedUpgradeMilestones = new Set();
let finalSecond = 0;

for (let tick = 1; tick <= MAX_SECONDS / STEP_SECONDS; tick += 1) {
  const second = tick * STEP_SECONDS;
  finalSecond = second;
  state.elapsedSeconds = second;

  tickState(state, STEP_SECONDS);

  buyAvailablePermanent(second);
  const boughtBeforeRankReset = canClaimRainRankForSimulation(state)
    ? buyFirstLevelRunUpgrade(second, FIRST_LEVEL_BEFORE_RANK_RESET)
    : false;
  const shouldResetRainRank = canClaimRainRankForSimulation(state);
  const boughtUpgrade = boughtBeforeRankReset || (shouldResetRainRank ? false : buyAvailableRunUpgrade(second));

  if (canRunMonsoon(state)) {
    const gained = getCloudCoreGain(state);
    const nextState = createInitialState({
      cloudCores: state.cloudCores + gained,
      totalCloudCores: state.totalCloudCores + gained,
      monsoonCycles: state.monsoonCycles + 1,
      permanentUpgrades: [...state.permanentUpgrades],
      skyHeartAwakened: state.skyHeartAwakened,
    });
    Object.assign(state, nextState);
    events.push([second, `季风循环 ${state.monsoonCycles}，+${gained} 云核，总云核 ${state.totalCloudCores}`]);
  } else if (!boughtUpgrade && canClaimRainRankForSimulation(state)) {
    const before = state.rainRanks;
    Object.assign(state, performRainRankReset(state));
    if (state.rainRanks > before && shouldLogRainRank(state.rainRanks)) {
      events.push([second, `雨阶 -> ${state.rainRanks}`]);
    }
  }

  if (!state.skyHeartAwakened && state.monsoonCycles >= SKY_HEART_CYCLE_TARGET && state.totalCloudCores >= SKY_HEART_CORE_TARGET) {
    state.skyHeartAwakened = true;
    events.push([second, "天空心脏苏醒"]);
    break;
  }

  if (Number.isInteger(second) && checkpoints.has(second)) {
    printCheckpoint(second);
  }
}

printCheckpoint(Math.floor(finalSecond));
console.log("\nKey events:");
for (const [second, text] of events) {
  console.log(`- ${formatTime(second)} ${text}`);
}

function tickState(targetState, seconds) {
  if (targetState.clickCooldownRemaining <= 0) {
    Object.assign(targetState, applyCloudTouch(targetState));
  }

  Object.assign(targetState, runTick(targetState, seconds));
}

function buyAvailableRunUpgrade(second) {
  for (const upgradeId of RUN_UPGRADE_ORDER) {
    if (buyRunUpgrade(second, upgradeId)) {
      return true;
    }
  }

  return false;
}

function buyFirstLevelRunUpgrade(second, upgradeIds) {
  for (const upgradeId of upgradeIds) {
    if (state.upgrades[upgradeId] > 0) continue;
    if (buyRunUpgrade(second, upgradeId)) {
      return true;
    }
  }

  return false;
}

function buyRunUpgrade(second, upgradeId) {
  const upgrade = getUpgrade(upgradeId);
  if (!UPGRADE_DEFINITIONS.some((definition) => definition.id === upgrade.id)) return false;
  if (!isUpgradeVisible(state, upgrade.id)) return false;
  const cost = getUpgradeCost(state, upgrade);
  if (!canPay(state.resources, cost)) return false;

  state.resources = payCost(state.resources, cost);
  state.upgrades[upgrade.id] += 1;

  if (shouldLogUpgrade(upgrade.id, state.upgrades[upgrade.id])) {
    events.push([second, `${upgrade.id} -> Lv.${state.upgrades[upgrade.id]}`]);
  }
  return true;
}

function buyAvailablePermanent(second) {
  for (const upgrade of PERMANENT_UPGRADES) {
    if (state.permanentUpgrades.includes(upgrade.id)) continue;
    if (state.cloudCores < upgrade.cost) continue;

    state.cloudCores -= upgrade.cost;
    state.permanentUpgrades.push(upgrade.id);
    Object.assign(state, applyPermanentUpgradeEffects(syncCloudUnlocks(state), upgrade.id));
    events.push([second, `天赋 ${upgrade.id}`]);
    return true;
  }

  return false;
}

function canClaimRainRankForSimulation(targetState) {
  return targetState.resources.weather >= getRainRankRequirement(targetState);
}

function shouldLogRainRank(rank) {
  return rank <= 8 || rank === MONSOON_RAIN_RANK_REQUIREMENT || rank % 10 === 0;
}

function shouldLogUpgrade(id, level) {
  const shouldLog = level === 1
    || (["monsoonPull", "autoDrizzle", "autoRank", "rankCompression", "monsoonFocus", "stormMemory", "windEye"].includes(id) && level <= 3)
    || [5, 10, 25, 50, 100].includes(level);
  const key = `${id}:${level}`;
  if (!shouldLog || loggedUpgradeMilestones.has(key)) {
    return false;
  }

  loggedUpgradeMilestones.add(key);
  return true;
}

function printCheckpoint(second) {
  const rates = calculateRates(state);
  console.log(
    `${formatTime(second)} | cycle=${state.monsoonCycles} cores=${state.cloudCores}/${state.totalCloudCores} rank=${state.rainRanks} cloudLv=${state.cloudLevel} `
    + `| weather=${fmt(state.resources.weather)} drop=${fmt(state.resources.droplets)} root=${fmt(state.resources.roots)} cloud=${fmt(state.resources.clouds)} `
    + `| w/s=${fmt(rates.weather)} target=${fmt(getMonsoonWeatherTarget(state))}`,
  );
}

function fmt(value) {
  if (value >= 1e6) return value.toExponential(2).replace("e+", "e");
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatTime(second) {
  const rounded = Math.floor(second);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
