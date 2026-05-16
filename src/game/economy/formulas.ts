import {
  BASE_CLICK_COOLDOWN_SECONDS,
  BASE_CLICK_WEATHER,
  AUTO_DRIZZLE_CLICK_CONVERSION,
  CLOUD_BLOOM_BASE_RATE,
  CLOUD_BLOOM_RATE_MULTIPLIER,
  CLOUD_TOUCH_WEATHER_MULTIPLIER,
  DROPLET_LOG_DIVISOR,
  DROPLET_SEED_BASE_RATE,
  DROPLET_LOG_MULTIPLIER_STEP,
  HEAVY_RAIN_WEATHER_MULTIPLIER,
  MAX_CLIMATE_EXPONENT_BONUS,
  MAX_CLOUD_CORE_EXPONENT_BONUS,
  MAX_PRESSURE_EXPONENT_BONUS,
  MAX_STORM_EXPONENT_BONUS,
  MONSOON_FOCUS_PRODUCER_BONUS,
  MONSOON_PULL_WEATHER_MULTIPLIER,
  PRODUCER_STOCK_LOG_DIVISOR,
  PRODUCER_STOCK_LOG_MULTIPLIER_STEP,
  RAIN_RANK_BASE_BONUS,
  ROOT_WAKE_BASE_RATE,
  ROOT_WAKE_RATE_MULTIPLIER,
  WEATHER_AMPLIFIER_MULTIPLIER,
  WIND_EYE_BASE_RATE,
  WIND_EYE_RATE_MULTIPLIER,
  SKY_HEART_PULSE_BONUS_EXPONENTS,
} from "./constants.ts";
import type { ResourceKey, WeatherReactorState } from "./types.ts";
import { log10Safe, pow10Clamped } from "./logNumbers.ts";

/**
 * Calculates all current per-second production rates.
 */
export function calculateRates(state: WeatherReactorState): Record<ResourceKey, number> {
  return {
    weather: getWeatherGain(state),
    droplets: getDropletGain(state),
    roots: getRootGain(state),
    clouds: getCloudGain(state),
  };
}

/**
 * Returns total weather vitality production.
 */
export function getWeatherGain(state: WeatherReactorState) {
  return pow10Clamped(calculateWeatherPerSecondLog(state));
}

/**
 * Returns the full weather vitality production in base-10 log space.
 */
export function calculateWeatherPerSecondLog(state: WeatherReactorState) {
  const baseGain = getPassiveWeatherGain(state) + getAutoDrizzleGain(state);
  if (baseGain <= 0) {
    return Number.NEGATIVE_INFINITY;
  }

  return log10Safe(baseGain) + getLayerBonusBreakdown(state).total;
}

/**
 * Returns passive weather vitality production before auto-click conversion.
 */
export function getPassiveWeatherGain(state: WeatherReactorState) {
  const baseWeatherPower = getDropletSeedWeatherRate(state.upgrades.dropletSeed);
  const dropletMultiplier = getDropletWeatherMultiplier(state.resources.droplets, state);
  const rankWeatherMultiplier = getRainRankWeatherMultiplier(state);
  const weatherAmplifierMultiplier = Math.pow(WEATHER_AMPLIFIER_MULTIPLIER, state.upgrades.weatherAmplifier);
  const heavyRainMultiplier = Math.pow(HEAVY_RAIN_WEATHER_MULTIPLIER, state.upgrades.heavyRain);
  const monsoonPullMultiplier = Math.pow(getMonsoonPullMultiplier(state), state.upgrades.monsoonPull);
  const stormMultiplier = 1 + state.upgrades.stormMemory * Math.max(1, state.totalMonsoonCycles) * 0.12;

  return (
    baseWeatherPower
    * dropletMultiplier
    * rankWeatherMultiplier
    * weatherAmplifierMultiplier
    * heavyRainMultiplier
    * monsoonPullMultiplier
    * stormMultiplier
  );
}

/**
 * Returns the weather rate supplied by the direct automation upgrade.
 */
export function getDropletSeedWeatherRate(level: number) {
  return level > 0 ? DROPLET_SEED_BASE_RATE * level : 0;
}

/**
 * Returns the weather multiplier supplied by stored droplets.
 */
export function getDropletWeatherMultiplier(droplets: number, state?: WeatherReactorState) {
  const deepVaporBonus = state ? state.upgrades.deepVapor * 2 : 0;
  return 1 + Math.log10(1 + Math.max(0, droplets) / DROPLET_LOG_DIVISOR)
    * (DROPLET_LOG_MULTIPLIER_STEP + deepVaporBonus);
}

/**
 * Returns the core rain-rank multiplier for all weather vitality income.
 */
export function getRainRankWeatherMultiplier(state: WeatherReactorState) {
  const rainRanks = state.rainRanks;
  const overloadBonus = 0.04 * state.stormUpgrades.rainOverload * rainRanks ** 2;
  const climateBonus = 0.12 * state.climateLaws.condensationLaw * rainRanks ** 2;
  const activeLawMultiplier = state.activeClimateLaws.includes("quietRain") ? 3 : 1;
  return (1 + rainRanks * RAIN_RANK_BASE_BONUS + overloadBonus + climateBonus) * activeLawMultiplier;
}

/**
 * Returns automatic weather vitality gained from stored cloud touch power.
 */
export function getAutoDrizzleGain(state: WeatherReactorState) {
  return state.upgrades.autoDrizzle > 0
    ? getCloudTouchAmount(state) * state.upgrades.autoDrizzle * AUTO_DRIZZLE_CLICK_CONVERSION
    : 0;
}

/**
 * Returns rain droplet production from roots.
 */
export function getDropletGain(state: WeatherReactorState) {
  if (state.upgrades.rootWake <= 0) {
    return 0;
  }

  const rootWakeMultiplier = Math.pow(ROOT_WAKE_RATE_MULTIPLIER, state.upgrades.rootWake - 1);
  return ROOT_WAKE_BASE_RATE
    * rootWakeMultiplier
    * getProducerStockMultiplier(state.resources.roots, state)
    * getProducerMultiplier(state);
}

/**
 * Returns root production from cloud mass.
 */
export function getRootGain(state: WeatherReactorState) {
  if (state.upgrades.cloudBloom <= 0) {
    return 0;
  }

  const cloudBloomMultiplier = Math.pow(CLOUD_BLOOM_RATE_MULTIPLIER, state.upgrades.cloudBloom - 1);
  return CLOUD_BLOOM_BASE_RATE
    * cloudBloomMultiplier
    * getProducerStockMultiplier(state.resources.clouds, state)
    * getProducerMultiplier(state);
}

/**
 * Returns cloud production from wind eye.
 */
export function getCloudGain(state: WeatherReactorState) {
  if (state.upgrades.windEye <= 0) {
    return 0;
  }

  return WIND_EYE_BASE_RATE * Math.pow(WIND_EYE_RATE_MULTIPLIER, state.upgrades.windEye - 1) * getProducerMultiplier(state);
}

/**
 * Returns the current manual cloud touch amount.
 */
export function getCloudTouchAmount(state: WeatherReactorState) {
  const baseAmount = BASE_CLICK_WEATHER * Math.pow(CLOUD_TOUCH_WEATHER_MULTIPLIER, state.upgrades.cloudTouch);
  if (state.activeClimateLaws.includes("quietRain")) {
    return 0;
  }

  const rankWeatherMultiplier = getRainRankWeatherMultiplier(state);
  const rainMultiplier = Math.pow(HEAVY_RAIN_WEATHER_MULTIPLIER, state.upgrades.heavyRain);
  const coreClickMultiplier = 1 + state.totalCloudCores * 0.015;
  return baseAmount * rankWeatherMultiplier * rainMultiplier * coreClickMultiplier;
}

/**
 * Returns the current cloud touch cooldown in seconds.
 */
export function getClickCooldownSeconds(state: WeatherReactorState) {
  return BASE_CLICK_COOLDOWN_SECONDS;
}

/**
 * Returns the shared multiplier for the producer chain.
 */
export function getProducerMultiplier(state: WeatherReactorState) {
  const livingSoilMultiplier = state.permanentUpgrades.includes("livingSoil") ? 1.25 : 1;
  const monsoonFocusMultiplier = 1 + state.upgrades.monsoonFocus * MONSOON_FOCUS_PRODUCER_BONUS;
  const producerOrders = state.upgrades.thunderReturn * 4
    + state.stormUpgrades.thunderUpdraft * 3
    + state.pressureUpgrades.updraft * 1.5
    + (state.activeClimateLaws.includes("thunderCloud") ? 15 : 0);
  return livingSoilMultiplier * monsoonFocusMultiplier * pow10Clamped(producerOrders);
}

/**
 * Converts producer stockpiles into a bounded multiplier instead of a linear base value.
 */
export function getProducerStockMultiplier(amount: number, state?: WeatherReactorState) {
  const climateBonus = state ? state.climateLaws.deepRootLaw * 1.2 : 0;
  return 1 + Math.log10(1 + Math.max(0, amount) / PRODUCER_STOCK_LOG_DIVISOR)
    * (PRODUCER_STOCK_LOG_MULTIPLIER_STEP + climateBonus);
}

/**
 * Returns all v13 layer exponent contributions.
 */
export function getLayerBonusBreakdown(state: WeatherReactorState) {
  const cloudCore = getCloudCoreExponentBonus(state);
  const pressure = getPressureExponentBonus(state);
  const storm = getStormCellExponentBonus(state);
  const climate = getClimateLawExponentBonus(state);
  const skyHeart = getSkyHeartExponentBonus(state);

  return {
    cloudCore,
    pressure,
    storm,
    climate,
    skyHeart,
    total: cloudCore + pressure + storm + climate + skyHeart,
  };
}

/**
 * Returns the exponent bonus from cloud-core progression.
 */
export function getCloudCoreExponentBonus(state: WeatherReactorState) {
  const prismBonus = state.permanentUpgrades.includes("cloudCorePrism") ? 0.6 : 0;
  const lensBonus = state.permanentUpgrades.includes("monsoonLens") ? 0.8 : 0;
  const returningBonus = state.climateLaws.returningMonsoon > 0 ? 2 : 0;
  return Math.min(
    MAX_CLOUD_CORE_EXPONENT_BONUS,
    prismBonus + lensBonus + returningBonus,
  );
}

/**
 * Returns the exponent bonus from current-front pressure choices.
 */
export function getPressureExponentBonus(state: WeatherReactorState) {
  return Math.min(
    MAX_PRESSURE_EXPONENT_BONUS,
    1.2 * state.pressureUpgrades.updraft
      + 1.5 * state.pressureUpgrades.eyeWall
      + 1.4 * state.upgrades.frontRain
      + 0.12 * state.totalPressureSpentThisFront,
  );
}

/**
 * Returns the exponent bonus from storm-front meta progression.
 */
export function getStormCellExponentBonus(state: WeatherReactorState) {
  const stormWeavingCapBonus = state.climateLaws.stormWeaving > 0 ? 15 : 0;
  return Math.min(
    MAX_STORM_EXPONENT_BONUS + stormWeavingCapBonus,
    1.6 * state.totalStormCells
      + 2.2 * state.stormUpgrades.thunderUpdraft
      + 3.5 * state.stormUpgrades.stormPrism
      + Math.min(12, 0.035 * state.totalStormCells * state.totalCloudCores),
  );
}

/**
 * Returns the exponent bonus from climate laws.
 */
export function getClimateLawExponentBonus(state: WeatherReactorState) {
  const activeBonus = state.activeClimateLaws.includes("backflow") ? 1 : 0;
  return Math.min(
    MAX_CLIMATE_EXPONENT_BONUS,
    4 * state.totalClimateThreads
      + 4 * state.upgrades.climateEcho
      + 3 * state.climateLaws.condensationLaw
      + 4 * state.climateLaws.deepRootLaw
      + 4 * state.climateLaws.stormWeaving
      + (state.climateLaws.cloudCoreRefraction > 0 ? 0.08 * state.totalCloudCores : 0)
      + activeBonus,
  );
}

/**
 * Returns the exponent bonus from final sky-heart pulses.
 */
export function getSkyHeartExponentBonus(state: WeatherReactorState) {
  const pulseBonus = SKY_HEART_PULSE_BONUS_EXPONENTS
    .slice(0, state.skyHeartPulseLevel)
    .reduce((total, bonus) => total + bonus, 0);
  const activeBonus = state.activeClimateLaws.includes("shortDay") ? 8 : 0;
  return pulseBonus + activeBonus;
}

/**
 * Returns the current monsoon-pull multiplier after pressure upgrades.
 */
export function getMonsoonPullMultiplier(state: WeatherReactorState) {
  const hasEyeWall = state.pressureUpgrades.eyeWall > 0;
  return hasEyeWall ? 300 : MONSOON_PULL_WEATHER_MULTIPLIER;
}
