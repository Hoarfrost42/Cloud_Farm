import {
  BASE_RAIN_RANK_REQUIREMENT,
  MAINLINE_MILESTONES,
  MAX_RAIN_COMPRESSION_EXPONENT,
  MONSOON_RAIN_RANK_REQUIREMENT,
  RAIN_RANK_REQUIREMENT_EXPONENTS,
  SKY_HEART_CORE_TARGET,
  SKY_HEART_CYCLE_TARGET,
  SKY_HEART_ENDING_EXPONENT,
  SKY_HEART_PULSE_BONUS_EXPONENTS,
} from "./constants.ts";
import { log10Safe, pow10Clamped } from "./logNumbers.ts";
import {
  createEmptyPressureUpgrades,
  createInitialState,
} from "./state.ts";
import type { MainlineMilestone, WeatherReactorState } from "./types.ts";

/**
 * Performs the small rain-rank reset.
 */
export function performRainRankReset<T extends WeatherReactorState>(state: T): T {
  const nextRainRanks = Math.min(getMaxRainRanks(state), state.rainRanks + 1);
  const resetState = createInitialState({
    cloudCores: state.cloudCores,
    totalCloudCores: state.totalCloudCores,
    monsoonCycles: state.monsoonCycles,
    totalMonsoonCycles: state.totalMonsoonCycles,
    monsoonCyclesInFront: state.monsoonCyclesInFront,
    pressure: state.pressure,
    totalPressureSpentThisFront: state.totalPressureSpentThisFront,
    stormCells: state.stormCells,
    totalStormCells: state.totalStormCells,
    totalStormFronts: state.totalStormFronts,
    stormFrontsInClimate: state.stormFrontsInClimate,
    climateThreads: state.climateThreads,
    totalClimateThreads: state.totalClimateThreads,
    totalClimateRewrites: state.totalClimateRewrites,
    activeClimateLaws: state.activeClimateLaws,
    stormUpgrades: state.stormUpgrades,
    skyHeartPulseLevel: state.skyHeartPulseLevel,
    permanentUpgrades: state.permanentUpgrades,
    skyHeartAwakened: state.skyHeartAwakened,
    elapsedSeconds: state.elapsedSeconds,
    bestWeather: state.bestWeather,
    bestWeatherExp: state.bestWeatherExp,
  });
  const upgrades = { ...resetState.upgrades };

  if (state.permanentUpgrades.includes("rainRankMastery")) {
    for (const upgradeId of ["cloudTouch", "dropletSeed", "weatherAmplifier"] as const) {
      upgrades[upgradeId] = Math.max(upgrades[upgradeId], state.upgrades[upgradeId]);
    }
  }

  if (state.permanentUpgrades.includes("windEyeMemory") || state.stormUpgrades.windEyeRelic > 0) {
    upgrades.windEye = Math.max(upgrades.windEye, 1);
  }

  upgrades.monsoonPull = state.upgrades.monsoonPull;

  return {
    ...state,
    ...resetState,
    upgrades,
    pressureUpgrades: state.pressureUpgrades,
    stormUpgrades: state.stormUpgrades,
    climateLaws: state.climateLaws,
    rainRanks: nextRainRanks,
    elapsedSeconds: state.elapsedSeconds,
    clickCooldownRemaining: 0,
  };
}

/**
 * Returns the next rain-rank requirement.
 */
export function getRainRankRequirement(state: WeatherReactorState) {
  return pow10Clamped(getRainRankRequirementExp(state));
}

/**
 * Returns the next rain-rank requirement in base-10 exponent form.
 */
export function getRainRankRequirementExp(state: WeatherReactorState) {
  const index = Math.min(state.rainRanks, RAIN_RANK_REQUIREMENT_EXPONENTS.length - 1);
  const baseExp = state.rainRanks < RAIN_RANK_REQUIREMENT_EXPONENTS.length
    ? RAIN_RANK_REQUIREMENT_EXPONENTS[index]
    : RAIN_RANK_REQUIREMENT_EXPONENTS[RAIN_RANK_REQUIREMENT_EXPONENTS.length - 1]
      + (state.rainRanks - RAIN_RANK_REQUIREMENT_EXPONENTS.length + 1) * 12;
  const activePenalty = state.activeClimateLaws.includes("thunderCloud") ? 3 : 0;

  return Math.max(log10Safe(BASE_RAIN_RANK_REQUIREMENT), baseExp + activePenalty - getRainCompressionExp(state));
}

/**
 * Returns all rain-rank compression as an exponent reduction.
 */
export function getRainCompressionExp(state: WeatherReactorState) {
  const permanentCompression = state.permanentUpgrades.includes("rankCompressionCore") ? 0.3 : 0;
  const bulkBonus = state.permanentUpgrades.includes("bulkRainRank") ? 1.5 : 0;
  const value = 0.5 * state.upgrades.rankCompression
    + 1 * state.upgrades.overloadedRain
    + 2 * state.climateLaws.condensationLaw
    + 0.8 * state.pressureUpgrades.lowPressure
    + permanentCompression
    + bulkBonus;

  return Math.min(MAX_RAIN_COMPRESSION_EXPONENT, value);
}

/**
 * Returns max rain rank unlocked by current meta stage.
 */
export function getMaxRainRanks(state: WeatherReactorState) {
  if (state.totalClimateRewrites >= 1) {
    return Math.min(25, 20 + state.climateLaws.condensationLaw * 2 + state.upgrades.overloadedRain);
  }

  if (state.totalStormFronts >= 1) {
    return 20;
  }

  if (state.totalMonsoonCycles >= 1 || state.cloudCores > 0) {
    return 14;
  }

  return MONSOON_RAIN_RANK_REQUIREMENT;
}

/**
 * Returns whether the current run can claim one rain rank.
 */
export function canClaimRainRank(state: WeatherReactorState) {
  return state.rainRanks < getMaxRainRanks(state) && log10Safe(state.resources.weather) >= getRainRankRequirementExp(state);
}

/**
 * Returns the largest rain rank reachable with current weather vitality.
 */
export function getRainRankBulk(state: WeatherReactorState) {
  if (!canClaimRainRank(state)) {
    return state.rainRanks;
  }

  if (!state.permanentUpgrades.includes("bulkRainRank") && state.stormUpgrades.stormBatch <= 0) {
    return state.rainRanks + 1;
  }

  let nextRank = state.rainRanks;
  const maxRank = Math.min(getMaxRainRanks(state), nextRank + 5);
  while (nextRank < maxRank) {
    const projected = { ...state, rainRanks: nextRank };
    if (log10Safe(state.resources.weather) < getRainRankRequirementExp(projected)) {
      break;
    }
    nextRank += 1;
  }

  return nextRank;
}

/**
 * Returns the current mainline milestone.
 */
export function getCurrentMainlineMilestone(state: WeatherReactorState): MainlineMilestone {
  return MAINLINE_MILESTONES.find((milestone) => !isMainlineMilestoneComplete(state, milestone))
    ?? MAINLINE_MILESTONES[MAINLINE_MILESTONES.length - 1];
}

/**
 * Returns whether a milestone has been completed.
 */
export function isMainlineMilestoneComplete(state: WeatherReactorState, milestone: MainlineMilestone) {
  if (milestone.kind === "monsoon") {
    const monsoonNumber = Number(milestone.id.split("_")[1] ?? 0);
    return state.totalMonsoonCycles >= monsoonNumber;
  }

  if (milestone.kind === "stormFront") {
    const frontNumber = Number(milestone.id.split("_")[2] ?? 0);
    return state.totalStormFronts >= frontNumber;
  }

  if (milestone.kind === "climateRewrite") {
    const rewriteNumber = Number(milestone.id.split("_")[2] ?? 0);
    return state.totalClimateRewrites >= rewriteNumber;
  }

  if (milestone.kind === "skyPulse") {
    const pulseNumber = Number(milestone.id.split("_")[2] ?? 0);
    return state.skyHeartPulseLevel >= pulseNumber;
  }

  return state.skyHeartAwakened;
}

/**
 * Returns the current milestone target exponent after compression.
 */
export function getCurrentMilestoneTargetExp(state: WeatherReactorState) {
  const milestone = getCurrentMainlineMilestone(state);
  let targetExp = milestone.targetExp;

  if (milestone.kind === "monsoon") {
    targetExp -= state.pressureUpgrades.frontCompression * 3;
    targetExp -= state.stormUpgrades.frontScar * 4;
    targetExp -= state.upgrades.highCirculation * 5;
    targetExp += state.activeClimateLaws.includes("backflow") ? 5 : 0;
  }

  if (milestone.kind === "skyPulse") {
    targetExp -= state.upgrades.skyWarmup * 5;
    targetExp -= state.climateLaws.skyHeartOmen > 0 ? 5 : 0;
    targetExp -= state.activeClimateLaws.includes("shortDay") ? 10 : 0;
  }

  return Math.max(0, targetExp);
}

/**
 * Returns the current monsoon target as a clamped number.
 */
export function getMonsoonWeatherTarget(state: WeatherReactorState) {
  return pow10Clamped(getCurrentMilestoneTargetExp(state));
}

/**
 * Returns whether the current run can execute a monsoon cycle.
 */
export function canRunMonsoon(state: WeatherReactorState) {
  const milestone = getCurrentMainlineMilestone(state);
  const requiredRainRanks = milestone.requiredRainRanks ?? MONSOON_RAIN_RANK_REQUIREMENT;
  return (
    milestone.kind === "monsoon"
    && log10Safe(state.resources.weather) >= getCurrentMilestoneTargetExp(state)
    && state.rainRanks >= requiredRainRanks
    && state.upgrades.windEye > 0
  );
}

/**
 * Returns whether the current run can execute a storm-front reset.
 */
export function canRunStormFront(state: WeatherReactorState) {
  const milestone = getCurrentMainlineMilestone(state);
  return (
    milestone.kind === "stormFront"
    && log10Safe(state.resources.weather) >= getCurrentMilestoneTargetExp(state)
    && state.rainRanks >= (milestone.requiredRainRanks ?? 0)
    && state.monsoonCyclesInFront >= (milestone.requiredMonsoonsInFront ?? 0)
  );
}

/**
 * Returns whether the current run can execute a climate rewrite.
 */
export function canRunClimateRewrite(state: WeatherReactorState) {
  const milestone = getCurrentMainlineMilestone(state);
  return (
    milestone.kind === "climateRewrite"
    && log10Safe(state.resources.weather) >= getCurrentMilestoneTargetExp(state)
    && state.totalStormFronts >= (milestone.requiredStormFronts ?? 0)
  );
}

/**
 * Returns whether the current run can buy the next sky-heart pulse.
 */
export function canBuySkyHeartPulse(state: WeatherReactorState) {
  const milestone = getCurrentMainlineMilestone(state);
  return milestone.kind === "skyPulse" && log10Safe(state.resources.weather) >= getCurrentMilestoneTargetExp(state);
}

/**
 * Returns whether the sky heart can be awakened.
 */
export function canAwakenSkyHeart(state: WeatherReactorState) {
  const milestone = getCurrentMainlineMilestone(state);
  return milestone.kind === "ending" && log10Safe(state.resources.weather) >= SKY_HEART_ENDING_EXPONENT;
}

/**
 * Converts current run progress into cloud cores.
 */
export function getCloudCoreGain(state: WeatherReactorState) {
  if (!canRunMonsoon(state)) {
    return 0;
  }

  if (state.totalStormFronts <= 0) {
    const preStormCoreSteps = [4, 4, 4, 5];
    return preStormCoreSteps[Math.min(state.monsoonCyclesInFront, preStormCoreSteps.length - 1)] ?? 4;
  }

  const targetExp = getCurrentMilestoneTargetExp(state);
  const base = 4;
  const globalMonsoonBonus = Math.floor(state.totalMonsoonCycles / 3);
  const stormBonus = state.totalStormFronts;
  const surplusBonus = Math.floor(Math.max(0, log10Safe(state.resources.weather) - targetExp) / 12);
  const lensBonus = state.permanentUpgrades.includes("monsoonLens") ? 1 : 0;
  const climateBonus = state.climateLaws.returningMonsoon > 0 ? 2 : 0;
  const activeBonus = state.activeClimateLaws.includes("backflow") ? 1 : 0;

  return Math.min(24, Math.max(4, base + globalMonsoonBonus + stormBonus + surplusBonus + lensBonus + climateBonus + activeBonus));
}

/**
 * Returns pressure gained on monsoon reset.
 */
export function getPressureGainOnMonsoon(state: WeatherReactorState) {
  if (state.totalMonsoonCycles < 1) {
    return 0;
  }

  return 1
    + Math.floor(getCurrentMilestoneTargetExp(state) / 25)
    + state.pressureUpgrades.pressureGauge
    + state.upgrades.pressureGaugeRun
    + Math.floor(state.totalStormFronts / 2)
    + (state.climateLaws.returningMonsoon > 0 ? 2 : 0);
}

/**
 * Performs a monsoon reset.
 */
export function performMonsoonReset<T extends WeatherReactorState>(state: T): T {
  const gainedCloudCores = getCloudCoreGain(state);
  const gainedPressure = getPressureGainOnMonsoon(state);
  const resetState = createInitialState({
    cloudCores: state.cloudCores + gainedCloudCores,
    totalCloudCores: state.totalCloudCores + gainedCloudCores,
    monsoonCycles: state.monsoonCycles + 1,
    totalMonsoonCycles: state.totalMonsoonCycles + 1,
    monsoonCyclesInFront: state.monsoonCyclesInFront + 1,
    pressure: state.pressure + gainedPressure,
    totalPressureSpentThisFront: state.totalPressureSpentThisFront,
    stormCells: state.stormCells,
    totalStormCells: state.totalStormCells,
    totalStormFronts: state.totalStormFronts,
    stormFrontsInClimate: state.stormFrontsInClimate,
    climateThreads: state.climateThreads,
    totalClimateThreads: state.totalClimateThreads,
    totalClimateRewrites: state.totalClimateRewrites,
    activeClimateLaws: state.activeClimateLaws,
    stormUpgrades: state.stormUpgrades,
    skyHeartPulseLevel: state.skyHeartPulseLevel,
    permanentUpgrades: state.permanentUpgrades,
    skyHeartAwakened: state.skyHeartAwakened,
    elapsedSeconds: state.elapsedSeconds,
    bestWeather: state.bestWeather,
    bestWeatherExp: state.bestWeatherExp,
  });
  const upgrades = { ...resetState.upgrades };

  if (state.permanentUpgrades.includes("returningMonsoonCore") || state.climateLaws.returningMonsoon > 0) {
    upgrades.monsoonPull = 1;
  }

  return {
    ...state,
    ...resetState,
    upgrades,
    pressureUpgrades: state.pressureUpgrades,
    stormUpgrades: state.stormUpgrades,
    climateLaws: state.climateLaws,
    clickCooldownRemaining: 0,
  };
}

/**
 * Returns storm cells gained on storm-front reset.
 */
export function getStormCellGain(state: WeatherReactorState) {
  if (!canRunStormFront(state)) {
    return 0;
  }

  const targetExp = getCurrentMilestoneTargetExp(state);
  const base = 4 + 2 * state.totalStormFronts;
  const surplus = Math.floor(Math.max(0, log10Safe(state.resources.weather) - targetExp) / 15);
  const monsoonBonus = Math.floor(Math.max(0, state.monsoonCyclesInFront - 4) / 2);
  const climateBonus = state.climateLaws.stormWeaving > 0 ? 2 : 0;

  return Math.min(20, Math.max(4, base + surplus + monsoonBonus + climateBonus));
}

/**
 * Performs a storm-front reset.
 */
export function performStormFrontReset<T extends WeatherReactorState>(state: T): T {
  const gainedStormCells = getStormCellGain(state);
  const resetState = createInitialState({
    cloudCores: state.cloudCores,
    totalCloudCores: state.totalCloudCores,
    monsoonCycles: state.monsoonCycles,
    totalMonsoonCycles: state.totalMonsoonCycles,
    monsoonCyclesInFront: 0,
    pressure: 0,
    totalPressureSpentThisFront: 0,
    stormCells: state.stormCells + gainedStormCells,
    totalStormCells: state.totalStormCells + gainedStormCells,
    totalStormFronts: state.totalStormFronts + 1,
    stormFrontsInClimate: state.stormFrontsInClimate + 1,
    climateThreads: state.climateThreads,
    totalClimateThreads: state.totalClimateThreads,
    totalClimateRewrites: state.totalClimateRewrites,
    activeClimateLaws: state.activeClimateLaws,
    stormUpgrades: state.stormUpgrades,
    skyHeartPulseLevel: state.skyHeartPulseLevel,
    permanentUpgrades: state.permanentUpgrades,
    skyHeartAwakened: state.skyHeartAwakened,
    elapsedSeconds: state.elapsedSeconds,
    bestWeather: state.bestWeather,
    bestWeatherExp: state.bestWeatherExp,
  });

  return {
    ...state,
    ...resetState,
    pressureUpgrades: createEmptyPressureUpgrades(),
    stormUpgrades: state.stormUpgrades,
    climateLaws: state.climateLaws,
    clickCooldownRemaining: 0,
  };
}

/**
 * Returns climate threads gained on climate rewrite.
 */
export function getClimateThreadGain(state: WeatherReactorState) {
  if (!canRunClimateRewrite(state)) {
    return 0;
  }

  const targetExp = getCurrentMilestoneTargetExp(state);
  const base = state.totalClimateRewrites === 0 ? 4 : 5;
  const stormBonus = Math.floor(state.stormFrontsInClimate / 2);
  const surplus = Math.floor(Math.max(0, log10Safe(state.resources.weather) - targetExp) / 35);

  return Math.min(10, Math.max(4, base + stormBonus + surplus));
}

/**
 * Performs a climate rewrite reset.
 */
export function performClimateRewrite<T extends WeatherReactorState>(state: T): T {
  const gainedThreads = getClimateThreadGain(state);
  const resetState = createInitialState({
    cloudCores: state.cloudCores,
    totalCloudCores: state.totalCloudCores,
    monsoonCycles: state.monsoonCycles,
    totalMonsoonCycles: state.totalMonsoonCycles,
    monsoonCyclesInFront: 0,
    pressure: 0,
    totalPressureSpentThisFront: 0,
    stormCells: state.stormCells,
    totalStormCells: state.totalStormCells,
    totalStormFronts: state.totalStormFronts,
    stormFrontsInClimate: 0,
    climateThreads: state.climateThreads + gainedThreads,
    totalClimateThreads: state.totalClimateThreads + gainedThreads,
    totalClimateRewrites: state.totalClimateRewrites + 1,
    activeClimateLaws: state.activeClimateLaws,
    stormUpgrades: state.stormUpgrades,
    skyHeartPulseLevel: state.skyHeartPulseLevel,
    permanentUpgrades: state.permanentUpgrades,
    skyHeartAwakened: state.skyHeartAwakened,
    elapsedSeconds: state.elapsedSeconds,
    bestWeather: state.bestWeather,
    bestWeatherExp: state.bestWeatherExp,
  });

  return {
    ...state,
    ...resetState,
    pressureUpgrades: createEmptyPressureUpgrades(),
    stormUpgrades: state.stormUpgrades,
    climateLaws: state.climateLaws,
    clickCooldownRemaining: 0,
  };
}

/**
 * Buys the next sky-heart pulse.
 */
export function performSkyHeartPulse<T extends WeatherReactorState>(state: T): T {
  if (!canBuySkyHeartPulse(state) || state.skyHeartPulseLevel >= SKY_HEART_PULSE_BONUS_EXPONENTS.length) {
    return state;
  }

  return {
    ...state,
    skyHeartPulseLevel: state.skyHeartPulseLevel + 1,
  };
}

/**
 * Awakens the sky heart.
 */
export function awakenSkyHeart<T extends WeatherReactorState>(state: T): T {
  if (!canAwakenSkyHeart(state)) {
    return state;
  }

  return {
    ...state,
    skyHeartAwakened: true,
  };
}

/**
 * Returns progress toward the first complete weather ending.
 */
export function getSkyHeartProgress(state: WeatherReactorState) {
  if (state.skyHeartAwakened) {
    return 1;
  }

  return Math.min(1, state.bestWeatherExp / SKY_HEART_ENDING_EXPONENT);
}

export { SKY_HEART_CORE_TARGET, SKY_HEART_CYCLE_TARGET };
