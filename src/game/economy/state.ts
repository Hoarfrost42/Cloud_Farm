import { CLOUD_LEVEL_THRESHOLDS, RESOURCE_KEYS } from "./constants.ts";
import { log10Safe } from "./logNumbers.ts";
import type {
  ActiveClimateLawId,
  ClimateLawId,
  PermanentUpgradeId,
  PressureUpgradeId,
  ResourceCost,
  ResourceMap,
  StormUpgradeId,
  UpgradeId,
  WeatherReactorState,
} from "./types.ts";
import { PERMANENT_UPGRADES, UPGRADE_DEFINITIONS } from "./upgrades.ts";

const PRESSURE_UPGRADE_IDS: PressureUpgradeId[] = ["lowPressure", "updraft", "eyeWall", "frontCompression", "pressureGauge"];
const STORM_UPGRADE_IDS: StormUpgradeId[] = [
  "frontMemory",
  "rainOverload",
  "thunderUpdraft",
  "frontScar",
  "stormBatch",
  "windEyeRelic",
  "stormPrism",
];
const CLIMATE_LAW_IDS: ClimateLawId[] = [
  "condensationLaw",
  "deepRootLaw",
  "returningMonsoon",
  "stormWeaving",
  "cloudCoreRefraction",
  "skyHeartOmen",
  "climateCodex",
];
const ACTIVE_CLIMATE_LAW_IDS: ActiveClimateLawId[] = ["quietRain", "thunderCloud", "backflow", "shortDay"];

/**
 * Creates a new run, optionally preserving meta progression.
 */
export function createInitialState(
  meta?: Partial<
    Pick<
      WeatherReactorState,
      | "cloudCores"
      | "totalCloudCores"
      | "monsoonCycles"
      | "totalMonsoonCycles"
      | "monsoonCyclesInFront"
      | "pressure"
      | "totalPressureSpentThisFront"
      | "stormCells"
      | "totalStormCells"
      | "totalStormFronts"
      | "stormFrontsInClimate"
      | "climateThreads"
      | "totalClimateThreads"
      | "totalClimateRewrites"
      | "activeClimateLaws"
      | "stormUpgrades"
      | "skyHeartPulseLevel"
      | "permanentUpgrades"
      | "bestWeather"
      | "bestWeatherExp"
      | "skyHeartAwakened"
      | "elapsedSeconds"
      | "rainRanks"
    >
  >,
): WeatherReactorState {
  const permanentUpgrades = meta?.permanentUpgrades ?? [];
  const stormUpgrades = meta?.stormUpgrades ?? createEmptyStormUpgrades();
  const bestWeather = meta?.bestWeather ?? 0;
  const bestWeatherExp = Math.max(meta?.bestWeatherExp ?? Number.NEGATIVE_INFINITY, log10Safe(bestWeather), 0);
  const upgrades = createEmptyUpgrades();
  if (permanentUpgrades.includes("dropletEcho")) {
    upgrades.dropletSeed = 1;
  }
  if (permanentUpgrades.includes("rainRankMastery")) {
    upgrades.cloudTouch = 1;
    upgrades.dropletSeed = Math.max(upgrades.dropletSeed, 1);
    upgrades.weatherAmplifier = 1;
  }

  return {
    resources: createEmptyResources(),
    upgrades,
    pressureUpgrades: createEmptyPressureUpgrades(),
    stormUpgrades,
    climateLaws: createEmptyClimateLaws(),
    cloudLevel: getCloudLevelFromWeather(bestWeather),
    rainRanks: Math.max(
      meta?.rainRanks ?? 0,
      getInitialRainRanks(permanentUpgrades, meta?.totalStormFronts ?? 0, stormUpgrades.frontMemory),
    ),
    cloudCores: meta?.cloudCores ?? 0,
    totalCloudCores: meta?.totalCloudCores ?? meta?.cloudCores ?? 0,
    monsoonCycles: meta?.monsoonCycles ?? 0,
    totalMonsoonCycles: meta?.totalMonsoonCycles ?? meta?.monsoonCycles ?? 0,
    monsoonCyclesInFront: meta?.monsoonCyclesInFront ?? 0,
    pressure: meta?.pressure ?? 0,
    totalPressureSpentThisFront: meta?.totalPressureSpentThisFront ?? 0,
    stormCells: meta?.stormCells ?? 0,
    totalStormCells: meta?.totalStormCells ?? meta?.stormCells ?? 0,
    totalStormFronts: meta?.totalStormFronts ?? 0,
    stormFrontsInClimate: meta?.stormFrontsInClimate ?? 0,
    climateThreads: meta?.climateThreads ?? 0,
    totalClimateThreads: meta?.totalClimateThreads ?? meta?.climateThreads ?? 0,
    totalClimateRewrites: meta?.totalClimateRewrites ?? 0,
    activeClimateLaws: meta?.activeClimateLaws ?? [],
    skyHeartPulseLevel: meta?.skyHeartPulseLevel ?? 0,
    skyHeartAwakened: meta?.skyHeartAwakened ?? false,
    permanentUpgrades,
    clickCooldownRemaining: 0,
    bestWeather,
    bestWeatherExp,
    elapsedSeconds: meta?.elapsedSeconds ?? 0,
  };
}

/**
 * Protects the prototype from old or malformed saves.
 */
export function normalizeState(savedState: Partial<WeatherReactorState>): WeatherReactorState {
  const initialState = createInitialState();
  const permanentUpgrades = Array.isArray(savedState.permanentUpgrades)
    ? savedState.permanentUpgrades.filter(isPermanentUpgradeId)
    : [];
  const resources = normalizeResourceRecord(savedState.resources);
  const bestWeather = Math.max(normalizeNumber(savedState.bestWeather), resources.weather);
  const bestWeatherExp = Math.max(normalizeNumber(savedState.bestWeatherExp), log10Safe(bestWeather));
  const cloudLevel = getCloudLevelFromWeather(bestWeather);

  return {
    ...initialState,
    resources,
    upgrades: normalizeUpgradeRecord(savedState.upgrades),
    pressureUpgrades: normalizeLayerRecord(savedState.pressureUpgrades, PRESSURE_UPGRADE_IDS),
    stormUpgrades: normalizeLayerRecord(savedState.stormUpgrades, STORM_UPGRADE_IDS),
    climateLaws: normalizeLayerRecord(savedState.climateLaws, CLIMATE_LAW_IDS),
    cloudLevel,
    rainRanks: normalizeNumber(savedState.rainRanks),
    cloudCores: normalizeNumber(savedState.cloudCores),
    totalCloudCores: Math.max(normalizeNumber(savedState.totalCloudCores), normalizeNumber(savedState.cloudCores)),
    monsoonCycles: normalizeNumber(savedState.monsoonCycles),
    totalMonsoonCycles: Math.max(normalizeNumber(savedState.totalMonsoonCycles), normalizeNumber(savedState.monsoonCycles)),
    monsoonCyclesInFront: normalizeNumber(savedState.monsoonCyclesInFront),
    pressure: normalizeNumber(savedState.pressure),
    totalPressureSpentThisFront: normalizeNumber(savedState.totalPressureSpentThisFront),
    stormCells: normalizeNumber(savedState.stormCells),
    totalStormCells: Math.max(normalizeNumber(savedState.totalStormCells), normalizeNumber(savedState.stormCells)),
    totalStormFronts: normalizeNumber(savedState.totalStormFronts),
    stormFrontsInClimate: normalizeNumber(savedState.stormFrontsInClimate),
    climateThreads: normalizeNumber(savedState.climateThreads),
    totalClimateThreads: Math.max(normalizeNumber(savedState.totalClimateThreads), normalizeNumber(savedState.climateThreads)),
    totalClimateRewrites: normalizeNumber(savedState.totalClimateRewrites),
    activeClimateLaws: Array.isArray(savedState.activeClimateLaws)
      ? savedState.activeClimateLaws.filter(isActiveClimateLawId)
      : [],
    skyHeartPulseLevel: normalizeNumber(savedState.skyHeartPulseLevel),
    skyHeartAwakened: savedState.skyHeartAwakened === true,
    permanentUpgrades,
    clickCooldownRemaining: normalizeNumber(savedState.clickCooldownRemaining),
    bestWeather,
    bestWeatherExp,
    elapsedSeconds: normalizeNumber(savedState.elapsedSeconds),
  };
}

/**
 * Syncs automatic cloud unlocks from this run's highest weather vitality.
 */
export function syncCloudUnlocks<T extends WeatherReactorState>(state: T): T {
  const bestWeather = Math.max(state.bestWeather, state.resources.weather);
  const bestWeatherExp = Math.max(state.bestWeatherExp, log10Safe(bestWeather));
  const cloudLevel = getCloudLevelFromWeather(bestWeather);

  return {
    ...state,
    bestWeather,
    bestWeatherExp,
    cloudLevel,
  };
}

/**
 * Turns clean weather milestones into automatic upgrade disclosure.
 */
export function getCloudLevelFromWeather(weather: number) {
  return CLOUD_LEVEL_THRESHOLDS.filter((threshold) => weather >= threshold).length;
}

/**
 * Returns the next automatic cloud unlock threshold.
 */
export function getNextCloudLevelRequirement(state: WeatherReactorState) {
  return CLOUD_LEVEL_THRESHOLDS[state.cloudLevel]
    ?? CLOUD_LEVEL_THRESHOLDS[CLOUD_LEVEL_THRESHOLDS.length - 1]
      * Math.pow(10, state.cloudLevel - CLOUD_LEVEL_THRESHOLDS.length + 1);
}

/**
 * Adds resources without mutating the original record.
 */
export function addResources(resources: ResourceMap, delta: ResourceCost) {
  const nextResources = { ...resources };
  for (const resourceKey of RESOURCE_KEYS) {
    nextResources[resourceKey] += delta[resourceKey] ?? 0;
  }

  return nextResources;
}

/**
 * Checks if the player can afford a resource cost.
 */
export function canPay(resources: ResourceMap, cost: ResourceCost) {
  return RESOURCE_KEYS.every((resourceKey) => resources[resourceKey] >= (cost[resourceKey] ?? 0));
}

/**
 * Subtracts a resource cost.
 */
export function payCost(resources: ResourceMap, cost: ResourceCost) {
  const nextResources = { ...resources };
  for (const resourceKey of RESOURCE_KEYS) {
    nextResources[resourceKey] -= cost[resourceKey] ?? 0;
  }

  return nextResources;
}

/**
 * Converts untrusted saves into finite non-negative numbers.
 */
export function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Checks if a value is a known permanent upgrade id.
 */
export function isPermanentUpgradeId(value: unknown): value is PermanentUpgradeId {
  return typeof value === "string" && PERMANENT_UPGRADES.some((upgrade) => upgrade.id === value);
}

/**
 * Applies immediate run-start effects from permanent cloud-core upgrades.
 */
export function applyPermanentUpgradeEffects<T extends WeatherReactorState>(state: T, upgradeId: PermanentUpgradeId): T {
  const upgrades = { ...state.upgrades };
  let rainRanks = state.rainRanks;

  if (upgradeId === "drizzleMemory") {
    rainRanks = Math.max(rainRanks, 1);
  }

  if (upgradeId === "dropletEcho") {
    upgrades.dropletSeed = Math.max(upgrades.dropletSeed, 1);
  }

  if (upgradeId === "rainRankMastery") {
    upgrades.cloudTouch = Math.max(upgrades.cloudTouch, 1);
    upgrades.dropletSeed = Math.max(upgrades.dropletSeed, 1);
    upgrades.weatherAmplifier = Math.max(upgrades.weatherAmplifier, 1);
  }

  return syncCloudUnlocks({
    ...state,
    upgrades,
    rainRanks,
  });
}

/**
 * Creates a blank resource record.
 */
export function createEmptyResources(): ResourceMap {
  return {
    weather: 0,
    droplets: 0,
    roots: 0,
    clouds: 0,
  };
}

/**
 * Creates a blank run-upgrade record.
 */
export function createEmptyUpgrades(): Record<UpgradeId, number> {
  return Object.fromEntries(UPGRADE_DEFINITIONS.map((upgrade) => [upgrade.id, 0])) as Record<UpgradeId, number>;
}

/**
 * Creates a blank pressure upgrade record.
 */
export function createEmptyPressureUpgrades(): Record<PressureUpgradeId, number> {
  return Object.fromEntries(PRESSURE_UPGRADE_IDS.map((upgradeId) => [upgradeId, 0])) as Record<PressureUpgradeId, number>;
}

/**
 * Creates a blank storm atlas record.
 */
export function createEmptyStormUpgrades(): Record<StormUpgradeId, number> {
  return Object.fromEntries(STORM_UPGRADE_IDS.map((upgradeId) => [upgradeId, 0])) as Record<StormUpgradeId, number>;
}

/**
 * Creates a blank climate law record.
 */
export function createEmptyClimateLaws(): Record<ClimateLawId, number> {
  return Object.fromEntries(CLIMATE_LAW_IDS.map((lawId) => [lawId, 0])) as Record<ClimateLawId, number>;
}

function normalizeResourceRecord(resources: Partial<ResourceMap> | undefined) {
  return {
    weather: normalizeNumber(resources?.weather),
    droplets: normalizeNumber(resources?.droplets),
    roots: normalizeNumber(resources?.roots),
    clouds: normalizeNumber(resources?.clouds),
  };
}

function normalizeUpgradeRecord(upgrades: Partial<Record<UpgradeId, number>> | undefined) {
  const normalized = createEmptyUpgrades();
  for (const upgrade of UPGRADE_DEFINITIONS) {
    normalized[upgrade.id] = normalizeNumber(upgrades?.[upgrade.id]);
  }

  return normalized;
}

function normalizeLayerRecord<Id extends string>(record: Partial<Record<Id, number>> | undefined, ids: Id[]) {
  return Object.fromEntries(ids.map((id) => [id, normalizeNumber(record?.[id])])) as Record<Id, number>;
}

function isActiveClimateLawId(value: unknown): value is ActiveClimateLawId {
  return typeof value === "string" && ACTIVE_CLIMATE_LAW_IDS.includes(value as ActiveClimateLawId);
}

function getInitialRainRanks(permanentUpgrades: PermanentUpgradeId[], totalStormFronts: number, frontMemoryLevel: number) {
  const drizzleMemoryRanks = permanentUpgrades.includes("drizzleMemory") ? 1 : 0;
  const frontMemoryRanks = frontMemoryLevel > 0 ? totalStormFronts : 0;
  return drizzleMemoryRanks + frontMemoryRanks;
}
