import type { CropPlotModel } from "../entities/CropPlot";
import type { GameState } from "../state/gameTypes";

/**
 * Advances one crop plot with stored moisture and current growth bonuses.
 */
export function advanceCropGrowth(plot: CropPlotModel, gameState: GameState, deltaSeconds: number) {
  if (plot.isReady) {
    return plot;
  }

  const prismMultiplier = isSunPrismActive(gameState) ? 1.5 + gameState.upgrades.sunPrismPower * 0.12 : 1;
  const growthRate = 8 * gameState.upgrades.cropGrowthSpeed * prismMultiplier;
  const consumedMoisture = Math.min(plot.moisture, growthRate * deltaSeconds);
  const nextGrowth = Math.min(plot.growth + consumedMoisture, plot.growthRequired);

  return {
    ...plot,
    moisture: plot.moisture - consumedMoisture,
    growth: nextGrowth,
    isReady: nextGrowth >= plot.growthRequired,
  };
}

/**
 * Returns whether the sun prism boost window is currently active.
 */
export function isSunPrismActive(gameState: GameState) {
  if (!gameState.unlocks.sunPrism) {
    return false;
  }

  return gameState.totalPlayTimeSeconds % 10 < 3;
}
