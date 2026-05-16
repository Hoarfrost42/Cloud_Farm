import { calculateRates, getCloudTouchAmount, getClickCooldownSeconds } from "./formulas.ts";
import { canClaimRainRank, performRainRankReset } from "./resets.ts";
import { addResources, syncCloudUnlocks } from "./state.ts";
import type { WeatherReactorState } from "./types.ts";

/**
 * Advances the weather chain by one tick.
 */
export function runTick<T extends WeatherReactorState>(state: T, seconds: number): T {
  const rates = calculateRates(state);
  let nextState = syncCloudUnlocks({
    ...state,
    resources: addResources(state.resources, {
      weather: rates.weather * seconds,
      droplets: rates.droplets * seconds,
      roots: rates.roots * seconds,
      clouds: rates.clouds * seconds,
    }),
    clickCooldownRemaining: Math.max(0, state.clickCooldownRemaining - seconds),
    elapsedSeconds: state.elapsedSeconds + seconds,
  });

  if (nextState.permanentUpgrades.includes("cloudAutoTouch") && nextState.clickCooldownRemaining <= 0) {
    nextState = applyCloudTouch(nextState);
  }

  if (nextState.upgrades.autoRank > 0 && canClaimRainRank(nextState)) {
    nextState = performRainRankReset(nextState);
  }

  return nextState;
}

/**
 * Applies a manual cloud click and starts the click cooldown.
 */
export function applyCloudTouch<T extends WeatherReactorState>(state: T): T {
  const amount = getCloudTouchAmount(state);
  return syncCloudUnlocks({
    ...state,
    resources: addResources(state.resources, { weather: amount }),
    clickCooldownRemaining: getClickCooldownSeconds(state),
  });
}
