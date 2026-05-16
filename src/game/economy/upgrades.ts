import {
  CLOUD_BLOOM_BASE_RATE,
  CLOUD_BLOOM_RATE_MULTIPLIER,
  CLOUD_TOUCH_WEATHER_MULTIPLIER,
  HEAVY_RAIN_WEATHER_MULTIPLIER,
  AUTO_DRIZZLE_CLICK_CONVERSION,
  MONSOON_FOCUS_PRODUCER_BONUS,
  MONSOON_PULL_WEATHER_MULTIPLIER,
  RESOURCE_KEYS,
  ROOT_WAKE_BASE_RATE,
  ROOT_WAKE_RATE_MULTIPLIER,
  WEATHER_AMPLIFIER_MULTIPLIER,
  WIND_EYE_BASE_RATE,
  WIND_EYE_RATE_MULTIPLIER,
} from "./constants.ts";
import {
  formatMultiplier,
  formatPercentValue,
  formatRate,
} from "./format.ts";
import { getDropletSeedWeatherRate, getMonsoonPullMultiplier } from "./formulas.ts";
import type {
  PermanentUpgradeDefinition,
  LayerUpgradeDefinition,
  ResourceKey,
  ResourceCost,
  ClimateLawId,
  PressureUpgradeId,
  StormUpgradeId,
  UpgradeDefinition,
  UpgradeGroupDefinition,
  UpgradeGroupId,
  UpgradeId,
  WeatherReactorState,
} from "./types.ts";

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: "cloudTouch",
    name: "云层注入",
    description: "让点击云层获得更多天气活力。",
    baseCost: { weather: 10 },
    costGrowth: 100,
    costSequence: { weather: [10, 100, 1000, 10000, 100000] },
    maxLevel: 6,
  },
  {
    id: "dropletSeed",
    name: "活力基流",
    description: "增加天气活力的基础自动增长。",
    baseCost: { weather: 30 },
    costGrowth: 4,
    costSequence: {
      weather: [
        30,
        60,
        100,
        160,
        250,
        400,
        650,
        1000,
        1600,
        2500,
        4000,
        6500,
        10000,
        16000,
        25000,
        40000,
        65000,
        100000,
        160000,
        250000,
        400000,
        650000,
        1000000,
        2000000,
        4000000,
        8000000,
        16000000,
        40000000,
        100000000,
      ],
    },
  },
  {
    id: "weatherAmplifier",
    name: "天气增幅",
    description: "增加一个独立天气活力乘区。",
    baseCost: { weather: 100 },
    costGrowth: 10,
    costSequence: { weather: [100, 1000, 10000, 30000, 100000, 300000, 1000000, 3000000, 10000000, 30000000, 100000000] },
  },
  {
    id: "cooldownDraft",
    name: "冷却气流",
    description: "缩短点击云层后的回拢时间。",
    baseCost: { weather: 1000 },
    costGrowth: 5,
    costSequence: { weather: [1000, 3000, 10000, 30000, 100000, 300000, 1000000, 3000000] },
  },
  {
    id: "rootWake",
    name: "根系苏醒",
    description: "增加根系生成器，让雨滴开始自动增长。",
    baseCost: { weather: 1000000 },
    costGrowth: 6,
    costSequence: { weather: [1000000, 3000000, 10000000, 30000000, 100000000, 300000000, 1000000000] },
  },
  {
    id: "cloudBloom",
    name: "云团孕育",
    description: "增加云团生成器，让根系开始自动增长。",
    baseCost: { weather: 100000000 },
    costGrowth: 6,
    costSequence: { weather: [100000000, 300000000, 1000000000, 3000000000, 10000000000, 30000000000] },
  },
  {
    id: "windEye",
    name: "风眼牵引",
    description: "增加风眼强度，让云团开始自动增长。",
    baseCost: { weather: 1000000000 },
    costGrowth: 5,
    costSequence: { weather: [1000000000, 3000000000, 10000000000, 30000000000, 100000000000] },
  },
  {
    id: "heavyRain",
    name: "厚云降雨",
    description: "增加一个较强的厚云天气乘区。",
    baseCost: { weather: 1000000000000000 },
    costGrowth: 10,
    costSequence: { weather: [1000000000000000, 100000000000000000, 100000000000000000000] },
  },
  {
    id: "monsoonPull",
    name: "季风牵引",
    description: "把第 10 雨阶后的被动增长牵引到季风爆发。",
    baseCost: { weather: 10000000000000000 },
    costGrowth: 300,
    costSequence: { weather: [10000000000000000, 300000000000000000, 10000000000000000000] },
  },
  {
    id: "autoDrizzle",
    name: "自动细雨",
    description: "把部分点击收益转为每秒自动天气活力。",
    baseCost: { weather: 10000000, roots: 1000 },
    costGrowth: 10,
    maxLevel: 100,
  },
  {
    id: "autoRank",
    name: "自动雨阶",
    description: "天气活力足够时，自动凝结雨阶。",
    baseCost: { weather: 100000000, clouds: 10 },
    costGrowth: 10,
  },
  {
    id: "rankCompression",
    name: "雨阶压缩",
    description: "降低后续雨阶需求增长。",
    baseCost: { weather: 1000000000, clouds: 100 },
    costGrowth: 10,
  },
  {
    id: "monsoonFocus",
    name: "季风聚焦",
    description: "提高风眼生产云团的速度。",
    baseCost: { weather: 10000000000, roots: 10000, clouds: 1000 },
    costGrowth: 10,
  },
  {
    id: "stormMemory",
    name: "风暴记忆",
    description: "按季风循环次数提高天气活力增长。",
    baseCost: { weather: 100000000000, clouds: 10000 },
    costGrowth: 10,
  },
  {
    id: "pressureGaugeRun",
    name: "气压计校准",
    description: "后续季风获得更多气压。",
    baseCost: { weather: 1e30 },
    costGrowth: 10000,
    costSequence: { weather: [1e30, 1e45, 1e70] },
  },
  {
    id: "frontRain",
    name: "前线积雨",
    description: "当前前线获得额外气压指数奖励。",
    baseCost: { weather: 1e35 },
    costGrowth: 10000,
    costSequence: { weather: [1e35, 1e60, 1e90] },
  },
  {
    id: "thunderReturn",
    name: "雷云回流",
    description: "生产者公共乘区获得数量级加成。",
    baseCost: { weather: 1e50 },
    costGrowth: 10000,
    costSequence: { weather: [1e50, 1e80, 1e120] },
  },
  {
    id: "overloadedRain",
    name: "过载雨阶",
    description: "提高最大雨阶并降低雨阶需求指数。",
    baseCost: { weather: 1e70 },
    costGrowth: 10000,
    costSequence: { weather: [1e70, 1e110, 1e150] },
  },
  {
    id: "climateEcho",
    name: "气候回声",
    description: "气候指数奖励增加。",
    baseCost: { weather: 1e165 },
    costGrowth: 10000,
    costSequence: { weather: [1e165, 1e190, 1e220] },
  },
  {
    id: "deepVapor",
    name: "深层水汽",
    description: "雨滴 log 系数提高。",
    baseCost: { weather: 1e175 },
    costGrowth: 10000,
    costSequence: { weather: [1e175, 1e205, 1e235] },
  },
  {
    id: "highCirculation",
    name: "高空环流",
    description: "降低后续季风目标指数。",
    baseCost: { weather: 1e185 },
    costGrowth: 10000,
    costSequence: { weather: [1e185, 1e215, 1e245] },
  },
  {
    id: "skyWarmup",
    name: "天穹预热",
    description: "降低天空心脏脉冲成本指数。",
    baseCost: { weather: 1e210 },
    costGrowth: 10000,
    costSequence: { weather: [1e210, 1e240] },
  },
];

export const UPGRADE_GROUPS: UpgradeGroupDefinition[] = [
  {
    id: "rainRank",
    title: "雨阶爬坡",
    badge: "I",
    description: "推高天气活力，反复凝结雨阶，打开基础活力爬坡。",
    lockedHint: "默认开启。",
    upgradeIds: ["cloudTouch", "dropletSeed", "weatherAmplifier"],
    isUnlocked: () => true,
  },
  {
    id: "producerChain",
    title: "生产者链",
    badge: "II",
    description: "建立风眼、云团、根系、雨滴的嵌套生产。",
    lockedHint: "凝结 1 次雨阶。",
    upgradeIds: ["rootWake", "cloudBloom", "windEye", "heavyRain"],
    isUnlocked: (state) => state.rainRanks >= 1 || state.upgrades.rootWake > 0,
  },
  {
    id: "monsoonSprint",
    title: "季风冲刺",
    badge: "III",
    description: "第 10 雨阶后，把最终冲刺变成可见台阶。",
    lockedHint: "达到 10 雨阶并形成风眼。",
    upgradeIds: ["monsoonPull"],
    isUnlocked: (state) => state.rainRanks >= 10 || state.upgrades.monsoonPull > 0,
  },
  {
    id: "automation",
    title: "自动化",
    badge: "IV",
    description: "让旧流程自己运转，准备冲向季风循环。",
    lockedHint: "完成第一次季风循环。",
    upgradeIds: ["autoDrizzle", "autoRank", "rankCompression", "monsoonFocus", "stormMemory"],
    isUnlocked: (state) => state.monsoonCycles > 0 || state.cloudCores > 0,
  },
  {
    id: "stormFrontRun",
    title: "当前前线",
    badge: "V",
    description: "用本轮天气活力推进气压和前线构筑。",
    lockedHint: "完成 2 次季风。",
    upgradeIds: ["pressureGaugeRun", "frontRain", "thunderReturn", "overloadedRain"],
    isUnlocked: (state) => state.totalMonsoonCycles >= 2 || state.totalStormFronts > 0,
  },
  {
    id: "climateRun",
    title: "气候回声",
    badge: "VI",
    description: "气候改写后出现的本轮指数推动。",
    lockedHint: "完成第一次气候改写。",
    upgradeIds: ["climateEcho", "deepVapor", "highCirculation", "skyWarmup"],
    isUnlocked: (state) => state.totalClimateRewrites > 0,
  },
];

export const PERMANENT_UPGRADES: PermanentUpgradeDefinition[] = [
  {
    id: "drizzleMemory",
    name: "初雨记忆",
    description: "每轮开局获得 1 雨阶。",
    cost: 1,
  },
  {
    id: "dropletEcho",
    name: "基流余响",
    description: "每轮开局保留活力基流 Lv.1。",
    cost: 1,
  },
  {
    id: "cloudAutoTouch",
    name: "云层自触",
    description: "云层回拢完成后自动注入天气活力。",
    cost: 2,
  },
  {
    id: "rainRankMastery",
    name: "凝雨熟练",
    description: "雨阶重置保留第一组本轮升级。",
    cost: 3,
  },
  {
    id: "livingSoil",
    name: "活土",
    description: "根系生成雨滴速度提高 25%。",
    cost: 4,
  },
  {
    id: "rankCompressionCore",
    name: "雨阶压缩",
    description: "雨阶需求减半，压缩后续季风循环。",
    cost: 6,
  },
  {
    id: "monsoonLens",
    name: "季风透镜",
    description: "每次季风循环额外获得 1 云核。",
    cost: 8,
    isUnlocked: (state) => state.totalMonsoonCycles >= 4,
  },
  {
    id: "autoRainRank",
    name: "自动凝雨",
    description: "天气活力足够时自动凝结雨阶。",
    cost: 4,
    isUnlocked: (state) => state.totalMonsoonCycles >= 2,
  },
  {
    id: "bulkRainRank",
    name: "批量凝雨",
    description: "自动凝雨可以一次跨越多个已解锁雨阶。",
    cost: 5,
    isUnlocked: (state) => state.totalMonsoonCycles >= 3,
  },
  {
    id: "windEyeMemory",
    name: "风眼记忆",
    description: "每轮开局保留风眼牵引 Lv.1。",
    cost: 8,
    isUnlocked: (state) => state.totalMonsoonCycles >= 4,
  },
  {
    id: "cloudCorePrism",
    name: "云核棱镜",
    description: "云核提供额外指数奖励。",
    cost: 12,
    isUnlocked: (state) => state.totalStormFronts >= 1,
  },
  {
    id: "returningMonsoonCore",
    name: "回环季风",
    description: "每次季风后保留 1 级季风牵引。",
    cost: 16,
    isUnlocked: (state) => state.totalClimateRewrites >= 1,
  },
];

export const PRESSURE_UPGRADES: LayerUpgradeDefinition<PressureUpgradeId>[] = [
  {
    id: "lowPressure",
    name: "低压环流",
    description: "当前前线雨阶需求指数每级 -0.8。",
    costSequence: [1, 2, 4, 8],
  },
  {
    id: "updraft",
    name: "积雨上升",
    description: "生产者公共乘区每级获得 +1.5 orders。",
    costSequence: [1, 2, 4, 8],
  },
  {
    id: "eyeWall",
    name: "眼墙牵引",
    description: "当前前线内季风牵引更强。",
    costSequence: [2, 4, 8],
  },
  {
    id: "frontCompression",
    name: "前线压缩",
    description: "当前前线后续季风目标指数每级 -3。",
    costSequence: [3, 6, 12],
  },
  {
    id: "pressureGauge",
    name: "气压计",
    description: "后续每次季风气压 +1。",
    costSequence: [2, 5, 10],
  },
];

export const STORM_UPGRADES: LayerUpgradeDefinition<StormUpgradeId>[] = [
  {
    id: "frontMemory",
    name: "前线记忆",
    description: "每个风暴前线后，开局获得 +1 初始雨阶。",
    costSequence: [1],
  },
  {
    id: "rainOverload",
    name: "雨阶过载",
    description: "雨阶倍率加入平方项。",
    costSequence: [1, 2, 4],
  },
  {
    id: "thunderUpdraft",
    name: "雷暴上升",
    description: "生产者公共乘区获得 +3 orders/级。",
    costSequence: [2, 3, 5],
  },
  {
    id: "frontScar",
    name: "前线压痕",
    description: "季风目标指数 -4/级。",
    costSequence: [3, 5, 8],
  },
  {
    id: "stormBatch",
    name: "暴雨批处理",
    description: "自动凝雨可在 tick 内跨越多个雨阶。",
    costSequence: [4],
  },
  {
    id: "windEyeRelic",
    name: "风眼遗迹",
    description: "雨阶 reset 后保留风眼牵引 Lv.1。",
    costSequence: [5],
  },
  {
    id: "stormPrism",
    name: "风暴棱镜",
    description: "风暴胞指数奖励提高。",
    costSequence: [8, 12],
  },
];

export const CLIMATE_LAWS: LayerUpgradeDefinition<ClimateLawId>[] = [
  {
    id: "condensationLaw",
    name: "凝雨法则",
    description: "雨阶倍率获得更强平方项，最大雨阶提高。",
    costSequence: [2, 4, 6],
  },
  {
    id: "deepRootLaw",
    name: "深根法则",
    description: "生产者 log 系数提高。",
    costSequence: [2, 4, 6],
  },
  {
    id: "returningMonsoon",
    name: "回环季风",
    description: "每次季风后保留 1 级季风牵引，并额外获得气压。",
    costSequence: [3, 5],
  },
  {
    id: "stormWeaving",
    name: "风暴编织",
    description: "风暴胞收益与风暴指数上限提高。",
    costSequence: [3, 5],
  },
  {
    id: "cloudCoreRefraction",
    name: "云核折射",
    description: "云核转入指数奖励。",
    costSequence: [4],
  },
  {
    id: "skyHeartOmen",
    name: "天空心脏预兆",
    description: "解锁天空心脏脉冲，并降低脉冲成本。",
    costSequence: [5],
  },
  {
    id: "climateCodex",
    name: "气候法典",
    description: "激活第二法则槽。",
    costSequence: [8],
  },
];

/**
 * Mirrors IMR-style per-upgrade unlock gates without exposing future rows too early.
 */
export function isUpgradeVisible(state: WeatherReactorState, upgradeId: UpgradeId) {
  switch (upgradeId) {
    case "cloudTouch":
      return state.cloudLevel >= 1 || state.upgrades.cloudTouch > 0;
    case "dropletSeed":
      return (state.cloudLevel >= 1 && state.upgrades.cloudTouch > 0) || state.upgrades.dropletSeed > 0;
    case "weatherAmplifier":
      return state.cloudLevel >= 2 || state.upgrades.weatherAmplifier > 0;
    case "cooldownDraft":
      return false;
    case "rootWake":
      return state.upgrades.rootWake > 0 || state.rainRanks >= 1 || state.cloudLevel >= 6;
    case "cloudBloom":
      return state.upgrades.cloudBloom > 0 || (state.upgrades.rootWake > 0 && (state.rainRanks >= 3 || state.cloudLevel >= 8));
    case "windEye":
      return state.upgrades.windEye > 0 || (state.upgrades.cloudBloom > 0 && (state.rainRanks >= 6 || state.cloudLevel >= 9));
    case "heavyRain":
      return state.upgrades.heavyRain > 0 || (state.upgrades.windEye > 0 && (state.rainRanks >= 8 || state.cloudLevel >= 10));
    case "monsoonPull":
      return state.upgrades.monsoonPull > 0 || (state.rainRanks >= 10 && state.upgrades.windEye > 0);
    case "autoDrizzle":
      return state.upgrades.autoDrizzle > 0 || state.monsoonCycles > 0 || state.cloudCores > 0;
    case "autoRank":
      return state.upgrades.autoRank > 0 || state.monsoonCycles >= 2;
    case "rankCompression":
      return state.upgrades.rankCompression > 0 || state.monsoonCycles > 0 || state.cloudCores > 0;
    case "monsoonFocus":
      return state.upgrades.monsoonFocus > 0 || state.monsoonCycles > 0 || state.cloudCores > 0;
    case "stormMemory":
      return state.upgrades.stormMemory > 0 || state.monsoonCycles >= 2;
    case "pressureGaugeRun":
    case "frontRain":
    case "thunderReturn":
    case "overloadedRain":
      return state.totalMonsoonCycles >= 2 || state.totalStormFronts > 0;
    case "climateEcho":
    case "deepVapor":
    case "highCirculation":
    case "skyWarmup":
      return state.totalClimateRewrites > 0;
    default:
      return false;
  }
}

/**
 * Returns one upgrade definition by id.
 */
export function getUpgrade(upgradeId: UpgradeId) {
  return UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === upgradeId) ?? UPGRADE_DEFINITIONS[0];
}

/**
 * Returns whether a run upgrade has reached its designed cap.
 */
export function isRunUpgradeMaxed(state: WeatherReactorState, upgrade: UpgradeDefinition | UpgradeId) {
  const resolvedUpgrade = typeof upgrade === "string" ? getUpgrade(upgrade) : upgrade;
  return typeof resolvedUpgrade.maxLevel === "number"
    && state.upgrades[resolvedUpgrade.id] >= resolvedUpgrade.maxLevel;
}

/**
 * Returns one permanent upgrade definition by id.
 */
export function getPermanentUpgrade(upgradeId: string) {
  return PERMANENT_UPGRADES.find((upgrade) => upgrade.id === upgradeId) ?? PERMANENT_UPGRADES[0];
}

/**
 * Calculates the current price for a run upgrade.
 */
export function getUpgradeCost(state: WeatherReactorState, upgrade: UpgradeDefinition | UpgradeId) {
  const resolvedUpgrade = typeof upgrade === "string" ? getUpgrade(upgrade) : upgrade;
  const level = state.upgrades[resolvedUpgrade.id];
  const costGrowth = getEffectiveCostGrowth(state, resolvedUpgrade);
  const cost: ResourceCost = {};

  for (const resourceKey of RESOURCE_KEYS) {
    const sequencedCost = getSequencedCost(resolvedUpgrade, resourceKey, level, costGrowth);
    if (sequencedCost > 0) {
      cost[resourceKey] = sequencedCost;
      continue;
    }

    const baseValue = resolvedUpgrade.baseCost[resourceKey] ?? 0;
    if (baseValue > 0) {
      const costLevel = resolvedUpgrade.costExponent ? Math.pow(level, resolvedUpgrade.costExponent) : level;
      const costMultiplier = Math.pow(costGrowth, costLevel);
      cost[resourceKey] = baseValue * costMultiplier;
    }
  }

  return cost;
}

/**
 * Picks the upgrade group that currently has the clearest next action.
 */
export function getRecommendedUpgradeGroupId(
  state: WeatherReactorState,
  unlockedGroups: UpgradeGroupDefinition[],
): UpgradeGroupId {
  const affordableGroup = unlockedGroups.find((group) => group.upgradeIds.some((upgradeId) => {
    if (!isUpgradeVisible(state, upgradeId)) {
      return false;
    }

    if (isRunUpgradeMaxed(state, upgradeId)) {
      return false;
    }

    return canAfford(state.resources, getUpgradeCost(state, getUpgrade(upgradeId)));
  }));

  return affordableGroup?.id ?? unlockedGroups[unlockedGroups.length - 1]?.id ?? "rainRank";
}

/**
 * Describes the next purchase as a direct rule change.
 */
export function getUpgradeActionDescription(state: WeatherReactorState, upgrade: UpgradeDefinition, exact = false) {
  switch (upgrade.id) {
    case "cloudTouch":
      return `点击注入的天气活力变为原来的 ${formatMultiplier(CLOUD_TOUCH_WEATHER_MULTIPLIER, exact)} 倍。`;
    case "dropletSeed":
      return `天气活力基础增长增加 ${formatRate(getDropletSeedWeatherRate(state.upgrades.dropletSeed + 1) - getDropletSeedWeatherRate(state.upgrades.dropletSeed), exact)}/秒。`;
    case "weatherAmplifier":
      return `天气活力外部乘区变为原来的 ${formatMultiplier(WEATHER_AMPLIFIER_MULTIPLIER, exact)} 倍。`;
    case "cooldownDraft":
      return "已从当前路线移除。";
    case "rootWake":
      if (state.upgrades.rootWake === 0) {
        return `根系开始每秒生成 ${formatRate(ROOT_WAKE_BASE_RATE, exact)} 雨滴。`;
      }
      return `根系基础雨滴生成器变为原来的 ${formatMultiplier(ROOT_WAKE_RATE_MULTIPLIER, exact)} 倍。`;
    case "cloudBloom":
      if (state.upgrades.cloudBloom === 0) {
        return `云团开始每秒生成 ${formatRate(CLOUD_BLOOM_BASE_RATE, exact)} 根系。`;
      }
      return `云团基础根系生成器变为原来的 ${formatMultiplier(CLOUD_BLOOM_RATE_MULTIPLIER, exact)} 倍。`;
    case "windEye":
      if (state.upgrades.windEye === 0) {
        return `风眼开始每秒生成 ${formatRate(WIND_EYE_BASE_RATE, exact)} 云团。`;
      }
      return `风眼基础云团生成变为原来的 ${formatMultiplier(WIND_EYE_RATE_MULTIPLIER, exact)} 倍。`;
    case "heavyRain":
      return `天气活力和点击注入变为原来的 ${formatMultiplier(HEAVY_RAIN_WEATHER_MULTIPLIER, exact)} 倍。`;
    case "monsoonPull":
      return `天气活力被动增长变为原来的 ${formatMultiplier(getMonsoonPullMultiplier(state), exact)} 倍。`;
    case "autoDrizzle":
      return `增加 ${formatPercentValue(AUTO_DRIZZLE_CLICK_CONVERSION, exact)} 点击收益作为每秒自动天气活力。`;
    case "autoRank":
      return "天气活力足够时自动凝结雨阶。";
    case "rankCompression":
      return "后续雨阶需求除以 10，最低不会低于第一次雨阶需求。";
    case "monsoonFocus":
      return `生产者链速度增加 ${formatPercentValue(MONSOON_FOCUS_PRODUCER_BONUS, exact)}。`;
    case "stormMemory":
      return "季风次数对天气活力的加成提高。";
    case "pressureGaugeRun":
      return "后续季风获得的气压增加。";
    case "frontRain":
      return "当前前线的气压指数奖励增加。";
    case "thunderReturn":
      return "生产者公共乘区获得 +4 orders。";
    case "overloadedRain":
      return "最大雨阶提高，并降低雨阶需求指数。";
    case "climateEcho":
      return "气候指数奖励增加 +6 orders。";
    case "deepVapor":
      return "雨滴 log 系数提高。";
    case "highCirculation":
      return "后续季风目标指数降低。";
    case "skyWarmup":
      return "天空心脏脉冲成本降低。";
    default:
      return upgrade.description;
  }
}

/**
 * Returns one pressure upgrade definition by id.
 */
export function getPressureUpgrade(upgradeId: PressureUpgradeId) {
  return PRESSURE_UPGRADES.find((upgrade) => upgrade.id === upgradeId) ?? PRESSURE_UPGRADES[0];
}

/**
 * Returns one storm atlas upgrade definition by id.
 */
export function getStormUpgrade(upgradeId: StormUpgradeId) {
  return STORM_UPGRADES.find((upgrade) => upgrade.id === upgradeId) ?? STORM_UPGRADES[0];
}

/**
 * Returns one climate law definition by id.
 */
export function getClimateLaw(lawId: ClimateLawId) {
  return CLIMATE_LAWS.find((law) => law.id === lawId) ?? CLIMATE_LAWS[0];
}

/**
 * Calculates a layer upgrade cost from its sequence.
 */
export function getLayerUpgradeCost<Id extends string>(definition: LayerUpgradeDefinition<Id>, level: number) {
  if (level >= definition.costSequence.length) {
    return 0;
  }

  return definition.costSequence[level] ?? 0;
}

function canAfford(resources: WeatherReactorState["resources"], cost: ResourceCost) {
  return RESOURCE_KEYS.every((resourceKey) => resources[resourceKey] >= (cost[resourceKey] ?? 0));
}

function getSequencedCost(upgrade: UpgradeDefinition, resourceKey: ResourceKey, level: number, costGrowth: number) {
  const sequence = upgrade.costSequence?.[resourceKey];
  if (!sequence?.length) {
    return 0;
  }

  if (level < sequence.length) {
    return sequence[level] ?? 0;
  }

  return sequence[sequence.length - 1] * Math.pow(costGrowth, level - sequence.length + 1);
}

function getEffectiveCostGrowth(state: WeatherReactorState, upgrade: UpgradeDefinition) {
  if (upgrade.id === "weatherAmplifier" && state.totalStormFronts > 0) {
    return 500;
  }

  if (upgrade.id === "monsoonPull" && state.totalStormFronts > 0) {
    return 400000;
  }

  if (upgrade.id === "heavyRain" && state.totalStormFronts > 0) {
    return 500;
  }

  return upgrade.costGrowth;
}
