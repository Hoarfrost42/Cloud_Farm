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
} from "./constants.ts";
import type { ResourceKey, WeatherReactorState } from "./types.ts";

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
  return getPassiveWeatherGain(state) + getAutoDrizzleGain(state);
}

/**
 * Returns passive weather vitality production before auto-click conversion.
 */
export function getPassiveWeatherGain(state: WeatherReactorState) {
  const baseWeatherPower = getDropletSeedWeatherRate(state.upgrades.dropletSeed);
  const dropletMultiplier = getDropletWeatherMultiplier(state.resources.droplets);
  const rankWeatherMultiplier = getRainRankWeatherMultiplier(state.rainRanks);
  const weatherAmplifierMultiplier = Math.pow(WEATHER_AMPLIFIER_MULTIPLIER, state.upgrades.weatherAmplifier);
  const heavyRainMultiplier = Math.pow(HEAVY_RAIN_WEATHER_MULTIPLIER, state.upgrades.heavyRain);
  const monsoonPullMultiplier = Math.pow(MONSOON_PULL_WEATHER_MULTIPLIER, state.upgrades.monsoonPull);
  const stormMultiplier = 1 + state.upgrades.stormMemory * Math.max(1, state.monsoonCycles) * 0.12;
  const coreMultiplier = 1 + state.totalCloudCores * 0.03;

  return (
    baseWeatherPower
    * dropletMultiplier
    * rankWeatherMultiplier
    * weatherAmplifierMultiplier
    * heavyRainMultiplier
    * monsoonPullMultiplier
    * stormMultiplier
    * coreMultiplier
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
export function getDropletWeatherMultiplier(droplets: number) {
  return 1 + Math.log10(1 + Math.max(0, droplets) / DROPLET_LOG_DIVISOR) * DROPLET_LOG_MULTIPLIER_STEP;
}

/**
 * Returns the core rain-rank multiplier for all weather vitality income.
 */
export function getRainRankWeatherMultiplier(rainRanks: number) {
  return 1 + rainRanks * RAIN_RANK_BASE_BONUS;
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
    * getProducerStockMultiplier(state.resources.roots)
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
    * getProducerStockMultiplier(state.resources.clouds)
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
  const rankWeatherMultiplier = getRainRankWeatherMultiplier(state.rainRanks);
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
  return livingSoilMultiplier * monsoonFocusMultiplier;
}

/**
 * Converts producer stockpiles into a bounded multiplier instead of a linear base value.
 */
export function getProducerStockMultiplier(amount: number) {
  return 1 + Math.log10(1 + Math.max(0, amount) / PRODUCER_STOCK_LOG_DIVISOR)
    * PRODUCER_STOCK_LOG_MULTIPLIER_STEP;
}
