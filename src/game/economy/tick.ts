import { calculateRates, calculateWeatherPerSecondLog, getCloudTouchAmount, getClickCooldownSeconds } from "./formulas.ts";
import { log10Safe, logSumExp10, pow10Clamped } from "./logNumbers.ts";
import { canClaimRainRank, getRainRankBulk, performRainRankReset } from "./resets.ts";
import { addResources, syncCloudUnlocks } from "./state.ts";
import type { WeatherReactorState } from "./types.ts";

/**
 * Advances the weather chain by one tick.
 */
export function runTick<T extends WeatherReactorState>(state: T, seconds: number): T {
  const rates = calculateRates(state);
  const weatherLog = log10Safe(state.resources.weather);
  const weatherDeltaLog = calculateWeatherPerSecondLog(state) + log10Safe(seconds);
  const nextWeatherLog = logSumExp10(weatherLog, weatherDeltaLog);
  let nextState = syncCloudUnlocks({
    ...state,
    resources: addResources(state.resources, {
      weather: pow10Clamped(nextWeatherLog) - state.resources.weather,
      droplets: rates.droplets * seconds,
      roots: rates.roots * seconds,
      clouds: rates.clouds * seconds,
    }),
    bestWeatherExp: Math.max(state.bestWeatherExp, nextWeatherLog),
    clickCooldownRemaining: Math.max(0, state.clickCooldownRemaining - seconds),
    elapsedSeconds: state.elapsedSeconds + seconds,
  });

  if (nextState.permanentUpgrades.includes("cloudAutoTouch") && nextState.clickCooldownRemaining <= 0) {
    nextState = applyCloudTouch(nextState);
  }

  if ((nextState.upgrades.autoRank > 0 || nextState.permanentUpgrades.includes("autoRainRank")) && canClaimRainRank(nextState)) {
    const targetRank = getRainRankBulk(nextState);
    while (nextState.rainRanks < targetRank && canClaimRainRank(nextState)) {
      nextState = performRainRankReset(nextState);
    }
  }

  return nextState;
}

/**
 * Applies a manual cloud click and starts the click cooldown.
 */
export function applyCloudTouch<T extends WeatherReactorState>(state: T): T {
  const amount = getCloudTouchAmount(state);
  const nextWeatherLog = logSumExp10(log10Safe(state.resources.weather), log10Safe(amount));
  return syncCloudUnlocks({
    ...state,
    resources: {
      ...state.resources,
      weather: pow10Clamped(nextWeatherLog),
    },
    bestWeatherExp: Math.max(state.bestWeatherExp, nextWeatherLog),
    clickCooldownRemaining: getClickCooldownSeconds(state),
  });
}
