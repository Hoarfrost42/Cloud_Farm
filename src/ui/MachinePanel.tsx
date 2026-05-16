import { MACHINE_DEFINITIONS } from "../data/machines";
import type { MachineId } from "../data/machines";
import { canAfford } from "../game/systems/upgradeSystem";
import type { GameState, Resources } from "../game/state/gameTypes";

interface MachinePanelProps {
  gameState: GameState;
  onBuyMachine: (machineId: MachineId) => void;
}

/**
 * Displays weather machine build and upgrade controls.
 */
export function MachinePanel({ gameState, onBuyMachine }: MachinePanelProps) {
  return (
    <section className="machine-panel" aria-label="机器面板">
      <h2>天气机器</h2>
      <div className="machine-list">
        {MACHINE_DEFINITIONS.map((machine) => {
          const level = gameState.upgrades[machine.levelKey];
          const cost = machine.costs[level] ?? null;
          const isUnlocked = gameState.unlocks[machine.id];
          const isMaxed = cost === null;
          const canBuy = cost !== null && canAfford(gameState.resources, cost);

          return (
            <button
              key={machine.id}
              className="machine-button"
              type="button"
              disabled={!canBuy || isMaxed}
              onClick={() => onBuyMachine(machine.id)}
              title={isMaxed ? "已满级" : formatCost(cost)}
            >
              <span className="machine-title">
                {machine.name} <strong>{isUnlocked ? `Lv.${level}` : "未建造"}</strong>
              </span>
              <span className="machine-effect">{machine.effect}</span>
              <span className="machine-cost">{isMaxed ? "已满级" : formatCost(cost)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Formats a weather machine cost.
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
