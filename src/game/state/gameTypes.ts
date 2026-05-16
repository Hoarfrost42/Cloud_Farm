import type { MachineId } from "../../data/machines";
import type { CropPlotModel } from "../entities/CropPlot";

export interface Resources {
  water: number;
  cloudCotton: number;
  sunlight: number;
}

export interface UpgradeLevels {
  cloudCapacity: number;
  clickRainPower: number;
  cropGrowthSpeed: number;
  waterStorage: number;
  rainCollectorEfficiency: number;
  windmillPower: number;
  sunPrismPower: number;
}

export interface Unlocks {
  rainCollector: boolean;
  windmill: boolean;
  sunPrism: boolean;
  autoHarvest: boolean;
}

export interface GameState {
  resources: Resources;
  upgrades: UpgradeLevels;
  unlocks: Unlocks;
  cropPlots: CropPlotModel[];
  totalPlayTimeSeconds: number;
  lastSaveAt: number;
}

export type GameAction =
  | { type: "tick"; deltaSeconds: number }
  | { type: "rainHitCrop"; plotId: string; moisture: number; water: number }
  | { type: "rainCollected"; water: number }
  | { type: "rainHitGround"; water: number }
  | { type: "harvestCrop"; plotId: string }
  | { type: "buyUpgrade"; upgradeId: keyof UpgradeLevels }
  | { type: "buyMachine"; machineId: MachineId }
  | { type: "resetGame" };
