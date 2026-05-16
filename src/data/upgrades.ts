import type { Resources, UpgradeLevels } from "../game/state/gameTypes";

export type UpgradeId = keyof Pick<
  UpgradeLevels,
  "cloudCapacity" | "clickRainPower" | "cropGrowthSpeed" | "waterStorage"
>;

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  effect: string;
  costs: Partial<Resources>[];
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: "clickRainPower",
    name: "轻轻一挤",
    effect: "每次点击云生成更多雨滴",
    costs: [{ water: 3 }, { water: 8 }, { water: 18, cloudCotton: 2 }],
  },
  {
    id: "cloudCapacity",
    name: "蓬松云层",
    effect: "云可连续释放更多雨水",
    costs: [
      { water: 5, cloudCotton: 1 },
      { water: 12, cloudCotton: 4 },
      { water: 24, cloudCotton: 8 },
    ],
  },
  {
    id: "cropGrowthSpeed",
    name: "湿润土壤",
    effect: "作物把水分转化为成长更快",
    costs: [
      { water: 5, cloudCotton: 1 },
      { water: 14, cloudCotton: 4 },
      { water: 30, cloudCotton: 10 },
    ],
  },
  {
    id: "waterStorage",
    name: "小水罐",
    effect: "雨滴落地和润湿作物时获得更多水滴",
    costs: [{ water: 6 }, { water: 14, cloudCotton: 3 }, { water: 28, cloudCotton: 8 }],
  },
];
