import {
  BASE_MONSOON_WEATHER_TARGET,
  BASE_RAIN_RANK_REQUIREMENT,
  MONSOON_RAIN_RANK_REQUIREMENT,
  MONSOON_TARGET_GROWTH,
  RAIN_RANK_REQUIREMENT_STEPS,
  SKY_HEART_CORE_TARGET,
  SKY_HEART_CYCLE_TARGET,
} from "./constants.ts";
import { createInitialState } from "./state.ts";
import type { WeatherReactorState } from "./types.ts";

/**
 * Performs the small rain-rank reset.
 */
export function performRainRankReset<T extends WeatherReactorState>(state: T): T {
  const nextRainRanks = state.rainRanks + 1;
  const resetState = createInitialState({
    cloudCores: state.cloudCores,
    totalCloudCores: state.totalCloudCores,
    monsoonCycles: state.monsoonCycles,
    permanentUpgrades: state.permanentUpgrades,
    skyHeartAwakened: state.skyHeartAwakened,
    elapsedSeconds: state.elapsedSeconds,
  });
  const upgrades = { ...resetState.upgrades };

  if (state.permanentUpgrades.includes("rainRankMastery")) {
    for (const upgradeId of ["cloudTouch", "dropletSeed", "weatherAmplifier"] as const) {
      upgrades[upgradeId] = Math.max(upgrades[upgradeId], state.upgrades[upgradeId]);
    }
  }

  upgrades.monsoonPull = state.upgrades.monsoonPull;

  return {
    ...state,
    ...resetState,
    upgrades,
    rainRanks: nextRainRanks,
    elapsedSeconds: state.elapsedSeconds,
    clickCooldownRemaining: 0,
  };
}

/**
 * Returns the next rain-rank requirement.
 */
export function getRainRankRequirement(state: WeatherReactorState) {
  const baseRequirement = state.rainRanks < RAIN_RANK_REQUIREMENT_STEPS.length
    ? RAIN_RANK_REQUIREMENT_STEPS[state.rainRanks]
    : RAIN_RANK_REQUIREMENT_STEPS[RAIN_RANK_REQUIREMENT_STEPS.length - 1]
      * Math.pow(10, state.rainRanks - RAIN_RANK_REQUIREMENT_STEPS.length + 1);
  const permanentCompressionDivisor = state.permanentUpgrades.includes("rankCompressionCore") ? 2 : 1;
  const compressionDivisor = Math.pow(10, Math.min(2, state.upgrades.rankCompression)) * permanentCompressionDivisor;
  return Math.max(BASE_RAIN_RANK_REQUIREMENT, baseRequirement / compressionDivisor);
}

/**
 * Returns whether the current run can claim one rain rank.
 */
export function canClaimRainRank(state: WeatherReactorState) {
  return state.resources.weather >= getRainRankRequirement(state);
}

/**
 * Returns the largest rain rank reachable with current weather vitality.
 */
export function getRainRankBulk(state: WeatherReactorState) {
  return state.resources.weather >= getRainRankRequirement(state) ? state.rainRanks + 1 : state.rainRanks;
}

/**
 * Makes each monsoon reset feel close at first, then creates a mid-game plateau.
 */
export function getMonsoonWeatherTarget(state: WeatherReactorState) {
  return Math.round(BASE_MONSOON_WEATHER_TARGET * Math.pow(MONSOON_TARGET_GROWTH, state.monsoonCycles));
}

/**
 * Returns whether the current run can execute a monsoon cycle.
 */
export function canRunMonsoon(state: WeatherReactorState) {
  return (
    state.resources.weather >= getMonsoonWeatherTarget(state)
    && state.rainRanks >= MONSOON_RAIN_RANK_REQUIREMENT
    && state.upgrades.windEye > 0
  );
}

/**
 * Converts current run progress into meta currency.
 */
export function getCloudCoreGain(state: WeatherReactorState) {
  const target = getMonsoonWeatherTarget(state);
  if (
    state.resources.weather < target
    || state.rainRanks < MONSOON_RAIN_RANK_REQUIREMENT
    || state.upgrades.windEye <= 0
  ) {
    return 0;
  }

  const baseGain = 3 + Math.floor(Math.pow(state.resources.weather / target, 1 / 4));
  const rankBonus = Math.floor(Math.max(0, state.rainRanks - MONSOON_RAIN_RANK_REQUIREMENT) / 2);
  const lensBonus = state.permanentUpgrades.includes("monsoonLens") ? 1 : 0;

  return Math.min(12, Math.max(4, baseGain + rankBonus + lensBonus));
}

/**
 * Returns progress toward the first complete weather ending.
 */
export function getSkyHeartProgress(state: WeatherReactorState) {
  if (state.skyHeartAwakened) {
    return 1;
  }

  const cycleProgress = Math.min(1, state.monsoonCycles / SKY_HEART_CYCLE_TARGET);
  const coreProgress = Math.min(1, state.totalCloudCores / SKY_HEART_CORE_TARGET);
  return Math.min(cycleProgress, coreProgress);
}

export { SKY_HEART_CORE_TARGET, SKY_HEART_CYCLE_TARGET };
