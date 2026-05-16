import { UPGRADE_DEFINITIONS } from "../../data/upgrades";
import type { UpgradeId } from "../../data/upgrades";
import type { GameState, Resources } from "../state/gameTypes";

/**
 * Checks whether the current resources can pay a cost object.
 */
export function canAfford(resources: Resources, cost: Partial<Resources>) {
  return (
    resources.water >= (cost.water ?? 0) &&
    resources.cloudCotton >= (cost.cloudCotton ?? 0) &&
    resources.sunlight >= (cost.sunlight ?? 0)
  );
}

/**
 * Returns the next cost for an upgrade, or null when maxed.
 */
export function getUpgradeCost(gameState: GameState, upgradeId: UpgradeId) {
  const definition = UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === upgradeId);
  const currentLevel = gameState.upgrades[upgradeId];
  return definition?.costs[currentLevel - 1] ?? null;
}

/**
 * Checks whether an upgrade can currently be purchased.
 */
export function canBuyUpgrade(gameState: GameState, upgradeId: UpgradeId) {
  const cost = getUpgradeCost(gameState, upgradeId);
  return Boolean(cost && canAfford(gameState.resources, cost));
}
