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
  | "stormMemory"
  | "pressureGaugeRun"
  | "frontRain"
  | "thunderReturn"
  | "overloadedRain"
  | "climateEcho"
  | "deepVapor"
  | "highCirculation"
  | "skyWarmup";

export type UpgradeGroupId = "rainRank" | "producerChain" | "monsoonSprint" | "automation" | "stormFrontRun" | "climateRun";

export type PermanentUpgradeId =
  | "drizzleMemory"
  | "dropletEcho"
  | "cloudAutoTouch"
  | "rainRankMastery"
  | "livingSoil"
  | "rankCompressionCore"
  | "monsoonLens"
  | "autoRainRank"
  | "bulkRainRank"
  | "windEyeMemory"
  | "cloudCorePrism"
  | "returningMonsoonCore";

export type PressureUpgradeId = "lowPressure" | "updraft" | "eyeWall" | "frontCompression" | "pressureGauge";

export type StormUpgradeId =
  | "frontMemory"
  | "rainOverload"
  | "thunderUpdraft"
  | "frontScar"
  | "stormBatch"
  | "windEyeRelic"
  | "stormPrism";

export type ClimateLawId =
  | "condensationLaw"
  | "deepRootLaw"
  | "returningMonsoon"
  | "stormWeaving"
  | "cloudCoreRefraction"
  | "skyHeartOmen"
  | "climateCodex";

export type ActiveClimateLawId = "quietRain" | "thunderCloud" | "backflow" | "shortDay";

export type MainlineMilestoneKind = "monsoon" | "stormFront" | "climateRewrite" | "skyPulse" | "ending";

export type ResourceMap = Record<ResourceKey, number>;

export type ResourceCost = Partial<Record<ResourceKey, number>>;

export interface WeatherReactorState {
  resources: ResourceMap;
  upgrades: Record<UpgradeId, number>;
  pressureUpgrades: Record<PressureUpgradeId, number>;
  stormUpgrades: Record<StormUpgradeId, number>;
  climateLaws: Record<ClimateLawId, number>;
  cloudLevel: number;
  rainRanks: number;
  cloudCores: number;
  totalCloudCores: number;
  monsoonCycles: number;
  totalMonsoonCycles: number;
  monsoonCyclesInFront: number;
  pressure: number;
  totalPressureSpentThisFront: number;
  frontEchoesThisFront: number;
  stormCells: number;
  totalStormCells: number;
  totalStormFronts: number;
  stormFrontsInClimate: number;
  climateThreads: number;
  totalClimateThreads: number;
  totalClimateRewrites: number;
  activeClimateLaws: ActiveClimateLawId[];
  skyHeartPulseLevel: number;
  skyHeartAwakened: boolean;
  permanentUpgrades: PermanentUpgradeId[];
  clickCooldownRemaining: number;
  bestWeather: number;
  bestWeatherExp: number;
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
  maxLevel?: number;
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
  isUnlocked?: (state: WeatherReactorState) => boolean;
}

export interface LayerUpgradeDefinition<Id extends string> {
  id: Id;
  name: string;
  description: string;
  costSequence: number[];
  maxLevel?: number;
  isUnlocked?: (state: WeatherReactorState) => boolean;
}

export interface MainlineMilestone {
  id: string;
  kind: MainlineMilestoneKind;
  title: string;
  targetExp: number;
  requiredRainRanks?: number;
  requiredMonsoonsInFront?: number;
  requiredStormFronts?: number;
}

export interface LayerBonusBreakdown {
  cloudCore: number;
  pressure: number;
  storm: number;
  climate: number;
  skyHeart: number;
  total: number;
}

export interface NextGoal {
  title: string;
  description: string;
  progress: number;
}
