import type { Resources, UpgradeLevels } from "../game/state/gameTypes";

export type MachineId = "rainCollector" | "windmill" | "sunPrism";

export interface MachineDefinition {
  id: MachineId;
  name: string;
  effect: string;
  levelKey: keyof Pick<
    UpgradeLevels,
    "rainCollectorEfficiency" | "windmillPower" | "sunPrismPower"
  >;
  costs: Partial<Resources>[];
}

export const MACHINE_DEFINITIONS: MachineDefinition[] = [
  {
    id: "rainCollector",
    name: "小水槽",
    effect: "雨滴落入水槽时自动收集水滴",
    levelKey: "rainCollectorEfficiency",
    costs: [
      { water: 12, cloudCotton: 4 },
      { water: 24, cloudCotton: 8 },
      { water: 45, cloudCotton: 14 },
    ],
  },
  {
    id: "windmill",
    name: "风向标",
    effect: "风车让云在小岛上方停留更久",
    levelKey: "windmillPower",
    costs: [
      { cloudCotton: 16, sunlight: 3 },
      { cloudCotton: 30, sunlight: 7 },
      { cloudCotton: 52, sunlight: 12 },
    ],
  },
  {
    id: "sunPrism",
    name: "太阳棱镜",
    effect: "周期性照亮小岛，加快作物成长",
    levelKey: "sunPrismPower",
    costs: [
      { cloudCotton: 24, sunlight: 6 },
      { cloudCotton: 42, sunlight: 11 },
      { cloudCotton: 68, sunlight: 18 },
    ],
  },
];
