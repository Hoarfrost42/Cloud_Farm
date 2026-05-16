import { CLOUD_LEVEL_THRESHOLDS, RESOURCE_KEYS } from "./constants.ts";
import type { PermanentUpgradeId, ResourceCost, ResourceMap, UpgradeId, WeatherReactorState } from "./types.ts";
import { PERMANENT_UPGRADES, UPGRADE_DEFINITIONS } from "./upgrades.ts";

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
      | "permanentUpgrades"
      | "bestWeather"
      | "skyHeartAwakened"
      | "elapsedSeconds"
      | "rainRanks"
    >
  >,
): WeatherReactorState {
  const permanentUpgrades = meta?.permanentUpgrades ?? [];
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
    cloudLevel: 0,
    rainRanks: meta?.rainRanks ?? (permanentUpgrades.includes("drizzleMemory") ? 1 : 0),
    cloudCores: meta?.cloudCores ?? 0,
    totalCloudCores: meta?.totalCloudCores ?? meta?.cloudCores ?? 0,
    monsoonCycles: meta?.monsoonCycles ?? 0,
    skyHeartAwakened: meta?.skyHeartAwakened ?? false,
    permanentUpgrades,
    clickCooldownRemaining: 0,
    bestWeather: meta?.bestWeather ?? 0,
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
  const cloudLevel = getCloudLevelFromWeather(bestWeather);

  return {
    ...initialState,
    resources,
    upgrades: normalizeUpgradeRecord(savedState.upgrades),
    cloudLevel,
    rainRanks: normalizeNumber(savedState.rainRanks),
    cloudCores: normalizeNumber(savedState.cloudCores),
    totalCloudCores: Math.max(normalizeNumber(savedState.totalCloudCores), normalizeNumber(savedState.cloudCores)),
    monsoonCycles: normalizeNumber(savedState.monsoonCycles),
    skyHeartAwakened: savedState.skyHeartAwakened === true,
    permanentUpgrades,
    clickCooldownRemaining: normalizeNumber(savedState.clickCooldownRemaining),
    bestWeather,
    elapsedSeconds: normalizeNumber(savedState.elapsedSeconds),
  };
}

/**
 * Syncs automatic cloud unlocks from this run's highest weather vitality.
 */
export function syncCloudUnlocks<T extends WeatherReactorState>(state: T): T {
  const bestWeather = Math.max(state.bestWeather, state.resources.weather);
  const cloudLevel = getCloudLevelFromWeather(bestWeather);

  return {
    ...state,
    bestWeather,
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
