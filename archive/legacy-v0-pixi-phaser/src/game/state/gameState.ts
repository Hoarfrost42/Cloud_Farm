import { MACHINE_DEFINITIONS } from "../../data/machines";
import type { MachineId } from "../../data/machines";
import { advanceCropGrowth, isSunPrismActive } from "../systems/growthSystem";
import { addResources } from "../systems/resourceSystem";
import { subtractResources } from "../systems/resourceSystem";
import { canAfford, canBuyUpgrade, getUpgradeCost } from "../systems/upgradeSystem";
import { SCENE_LAYOUT } from "../sceneLayout";
import type { UpgradeId } from "../../data/upgrades";
import type { GameAction, GameState } from "./gameTypes";

/**
 * Creates the serializable v0.1 starting state.
 */
export function createInitialGameState(): GameState {
  return {
    resources: {
      water: 0,
      cloudCotton: 0,
      sunlight: 0,
    },
    upgrades: {
      cloudCapacity: 1,
      clickRainPower: 1,
      cropGrowthSpeed: 1,
      waterStorage: 1,
      rainCollectorEfficiency: 0,
      windmillPower: 0,
      sunPrismPower: 0,
    },
    unlocks: {
      rainCollector: false,
      windmill: false,
      sunPrism: false,
      autoHarvest: false,
    },
    cropPlots: SCENE_LAYOUT.cropPlotAnchors.map((plot) => ({
      id: plot.id,
      x: plot.x,
      y: plot.y,
      growth: 0,
      growthRequired: 100,
      isReady: false,
      moisture: 0,
    })),
    totalPlayTimeSeconds: 0,
    lastSaveAt: 0,
  };
}

/**
 * Applies serializable gameplay actions to the v0.1 state.
 */
export function gameReducer(gameState: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "tick":
      return {
        ...gameState,
        resources: isSunPrismActive(gameState)
          ? addResources(gameState.resources, {
              sunlight: 0.025 * Math.max(1, gameState.upgrades.sunPrismPower),
            })
          : gameState.resources,
        cropPlots: gameState.cropPlots.map((plot) =>
          advanceCropGrowth(plot, gameState, action.deltaSeconds),
        ),
        totalPlayTimeSeconds: gameState.totalPlayTimeSeconds + action.deltaSeconds,
      };
    case "rainHitCrop":
      return {
        ...gameState,
        resources: addResources(gameState.resources, { water: action.water }),
        cropPlots: gameState.cropPlots.map((plot) =>
          plot.id === action.plotId
            ? {
                ...plot,
                moisture: plot.moisture + action.moisture,
              }
            : plot,
        ),
      };
    case "rainHitGround":
      return {
        ...gameState,
        resources: addResources(gameState.resources, { water: action.water }),
      };
    case "rainCollected":
      return {
        ...gameState,
        resources: addResources(gameState.resources, { water: action.water }),
      };
    case "harvestCrop": {
      const targetPlot = gameState.cropPlots.find((plot) => plot.id === action.plotId);
      if (!targetPlot?.isReady) {
        return gameState;
      }

      return {
        ...gameState,
        resources: addResources(gameState.resources, {
          cloudCotton: 6,
          sunlight: 1.25,
        }),
        cropPlots: gameState.cropPlots.map((plot) =>
          plot.id === action.plotId
            ? {
                ...plot,
                growth: 0,
                moisture: 0,
                isReady: false,
              }
            : plot,
        ),
      };
    }
    case "buyUpgrade": {
      const upgradeId = action.upgradeId as UpgradeId;
      const cost = getUpgradeCost(gameState, upgradeId);
      if (!cost || !canBuyUpgrade(gameState, upgradeId)) {
        return gameState;
      }

      return {
        ...gameState,
        resources: subtractResources(gameState.resources, cost),
        upgrades: {
          ...gameState.upgrades,
          [upgradeId]: gameState.upgrades[upgradeId] + 1,
        },
      };
    }
    case "buyMachine": {
      const machineDefinition = MACHINE_DEFINITIONS.find(
        (definition) => definition.id === action.machineId,
      );
      if (!machineDefinition) {
        return gameState;
      }

      const level = gameState.upgrades[machineDefinition.levelKey];
      const cost = machineDefinition.costs[level];
      if (!cost || !canBuyMachine(gameState, action.machineId)) {
        return gameState;
      }

      return {
        ...gameState,
        resources: subtractResources(gameState.resources, cost),
        upgrades: {
          ...gameState.upgrades,
          [machineDefinition.levelKey]: level + 1,
        },
        unlocks: {
          ...gameState.unlocks,
          [action.machineId]: true,
        },
      };
    }
    case "resetGame":
      return createInitialGameState();
    default:
      return gameState;
  }
}

/**
 * Checks whether a weather machine can be built or upgraded.
 */
export function canBuyMachine(gameState: GameState, machineId: MachineId) {
  const machineDefinition = MACHINE_DEFINITIONS.find((definition) => definition.id === machineId);
  if (!machineDefinition) {
    return false;
  }

  const level = gameState.upgrades[machineDefinition.levelKey];
  const cost = machineDefinition.costs[level];
  return Boolean(cost && canAfford(gameState.resources, cost));
}
