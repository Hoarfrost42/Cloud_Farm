import { UPGRADE_DEFINITIONS } from "../data/upgrades";
import type { UpgradeId } from "../data/upgrades";
import { canAfford } from "../game/systems/upgradeSystem";
import type { GameState, Resources } from "../game/state/gameTypes";

interface UpgradePanelProps {
  gameState: GameState;
  onBuyUpgrade: (upgradeId: UpgradeId) => void;
}

/**
 * Displays compact v0.1 upgrade controls.
 */
export function UpgradePanel({ gameState, onBuyUpgrade }: UpgradePanelProps) {
  return (
    <section className="upgrade-panel" aria-label="升级面板">
      <h2>升级</h2>
      <div className="upgrade-list">
        {UPGRADE_DEFINITIONS.map((upgrade) => {
          const currentLevel = gameState.upgrades[upgrade.id];
          const nextCost = upgrade.costs[currentLevel - 1] ?? null;
          const isMaxed = nextCost === null;
          const canBuy = nextCost !== null && canAfford(gameState.resources, nextCost);

          return (
            <button
              key={upgrade.id}
              className="upgrade-button"
              type="button"
              disabled={!canBuy || isMaxed}
              onClick={() => onBuyUpgrade(upgrade.id)}
              title={isMaxed ? "已满级" : formatCost(nextCost)}
            >
              <span className="upgrade-title">
                {upgrade.name} <strong>Lv.{currentLevel}</strong>
              </span>
              <span className="upgrade-effect">{upgrade.effect}</span>
              <span className="upgrade-cost">{isMaxed ? "已满级" : formatCost(nextCost)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Formats a resource cost for compact upgrade buttons.
 */
function formatCost(cost: Partial<Resources> | null) {
  if (!cost) {
    return "";
  }

  return [
    cost.water ? `水滴 ${cost.water}` : null,
    cost.cloudCotton ? `云棉 ${cost.cloudCotton}` : null,
    cost.sunlight ? `阳光 ${cost.sunlight}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
