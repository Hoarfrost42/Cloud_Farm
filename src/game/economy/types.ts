export type ResourceKey = "weather" | "droplets" | "roots" | "clouds";

export type UpgradeId =
  | "cloudTouch"
  | "dropletSeed"
  | "weatherAmplifier"
  | "cooldownDraft"
  | "rootWake"
  | "cloudBloom"
  | "windEye"
  | "heavyRain"
  | "monsoonPull"
  | "autoDrizzle"
  | "autoRank"
  | "rankCompression"
  | "monsoonFocus"
  | "stormMemory";

export type UpgradeGroupId = "rainRank" | "producerChain" | "monsoonSprint" | "automation";

export type PermanentUpgradeId =
  | "drizzleMemory"
  | "dropletEcho"
  | "cloudAutoTouch"
  | "rainRankMastery"
  | "livingSoil"
  | "rankCompressionCore"
  | "monsoonLens";

export type ResourceMap = Record<ResourceKey, number>;

export type ResourceCost = Partial<Record<ResourceKey, number>>;

export interface WeatherReactorState {
  resources: ResourceMap;
  upgrades: Record<UpgradeId, number>;
  cloudLevel: number;
  rainRanks: number;
  cloudCores: number;
  totalCloudCores: number;
  monsoonCycles: number;
  skyHeartAwakened: boolean;
  permanentUpgrades: PermanentUpgradeId[];
  clickCooldownRemaining: number;
  bestWeather: number;
  elapsedSeconds: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  baseCost: ResourceCost;
  costGrowth: number;
  costExponent?: number;
  costSequence?: Partial<Record<ResourceKey, number[]>>;
}

export interface UpgradeGroupDefinition {
  id: UpgradeGroupId;
  title: string;
  badge: string;
  description: string;
  lockedHint: string;
  upgradeIds: UpgradeId[];
  isUnlocked: (state: WeatherReactorState) => boolean;
}

export interface PermanentUpgradeDefinition {
  id: PermanentUpgradeId;
  name: string;
  description: string;
  cost: number;
}

export interface NextGoal {
  title: string;
  description: string;
  progress: number;
}
