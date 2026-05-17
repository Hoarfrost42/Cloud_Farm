import type { MainlineMilestone, ResourceKey } from "./types.ts";

export const SAVE_KEY = "cloud-island-weather-reactor-v13-complete-slice";
export const LEGACY_SAVE_KEY = "cloud-island-weather-reactor-v12-lab-formula-c";
export const ECONOMY_VERSION_LABEL = "v13 / Post-Monsoon Complete Slice";

export const BASE_CLICK_WEATHER = 1;
export const CLOUD_TOUCH_WEATHER_MULTIPLIER = 5;
export const DROPLET_SEED_BASE_RATE = 1;
export const DROPLET_LOG_MULTIPLIER_STEP = 8;
export const DROPLET_LOG_DIVISOR = 1000;
export const PRODUCER_STOCK_LOG_MULTIPLIER_STEP = 5;
export const PRODUCER_STOCK_LOG_DIVISOR = 1000;
export const ROOT_WAKE_BASE_RATE = 1;
export const ROOT_WAKE_RATE_MULTIPLIER = 3;
export const CLOUD_BLOOM_BASE_RATE = 1;
export const CLOUD_BLOOM_RATE_MULTIPLIER = 3;
export const WIND_EYE_BASE_RATE = 1;
export const WIND_EYE_RATE_MULTIPLIER = 2;
export const RAIN_RANK_BASE_BONUS = 1;
export const WEATHER_AMPLIFIER_MULTIPLIER = 4;
export const HEAVY_RAIN_WEATHER_MULTIPLIER = 3;
export const MONSOON_PULL_WEATHER_MULTIPLIER = 100;
export const WEATHER_AMPLIFIER_SOFT_CAP_START = 45;
export const WEATHER_AMPLIFIER_SOFT_CAP_SCALE = 3.2;
export const WEATHER_AMPLIFIER_LATE_SOFT_CAP_START = 75;
export const WEATHER_AMPLIFIER_LATE_SOFT_CAP_SCALE = 4.8;
export const HEAVY_RAIN_SOFT_CAP_START = 24;
export const HEAVY_RAIN_SOFT_CAP_SCALE = 3;
export const HEAVY_RAIN_LATE_SOFT_CAP_START = 50;
export const HEAVY_RAIN_LATE_SOFT_CAP_SCALE = 3.8;
export const MONSOON_PULL_SOFT_CAP_START = 14;
export const MONSOON_PULL_SOFT_CAP_SCALE = 2;
export const MONSOON_PULL_LATE_SOFT_CAP_START = 28;
export const MONSOON_PULL_LATE_SOFT_CAP_SCALE = 3.2;
export const AUTO_DRIZZLE_CLICK_CONVERSION = 0.07;
export const MONSOON_FOCUS_PRODUCER_BONUS = 0.5;
export const BASE_CLICK_COOLDOWN_SECONDS = 2;
export const COOLDOWN_DRAFT_SECONDS = 0.1;
export const MIN_CLICK_COOLDOWN_SECONDS = 0.5;
export const BASE_RAIN_RANK_REQUIREMENT = 3000000;
export const MONSOON_RAIN_RANK_REQUIREMENT = 10;
export const BASE_MONSOON_WEATHER_TARGET = 100000000000000000000;
export const MONSOON_TARGET_GROWTH = 10;
export const SKY_HEART_CYCLE_TARGET = 3;
export const SKY_HEART_CORE_TARGET = 14;
export const SKY_HEART_ENDING_EXPONENT = 308;
export const MAX_RAIN_COMPRESSION_EXPONENT = 18;
export const MAX_CLOUD_CORE_EXPONENT_BONUS = 24;
export const MAX_PRESSURE_EXPONENT_BONUS = 12;
export const MAX_STORM_EXPONENT_BONUS = 48;
export const MAX_CLIMATE_EXPONENT_BONUS = 52;
export const FRONT_ECHO_TARGET_OFFSET = 25;
export const FRONT_ECHO_REQUIREMENT_STEP = 5;
export const FRONT_ECHO_BONUS_EXPONENT = 3.8;
export const FRONT_ECHO_CLIMATE_BONUS_EXPONENT = 2.6;
export const FRONT_ECHO_SKY_BONUS_EXPONENT = 3.2;
export const MAX_FRONT_ECHOES_PER_FRONT = 5;

export const STORM_TRUNK_UPGRADES = [
  { id: "frontMemory", level: 1, cost: 1 },
  { id: "thunderUpdraft", level: 1, cost: 2 },
  { id: "rainOverload", level: 1, cost: 1 },
] as const;
export const STORM_TRUNK_COST = 4;

export const RESOURCE_KEYS: ResourceKey[] = ["weather", "droplets", "roots", "clouds"];

export const RESOURCE_LABELS: Record<ResourceKey, { name: string; icon: string; description: string }> = {
  weather: { name: "天气活力", icon: "🌦️", description: "空岛天气复苏的主数值，所有路线都在推高它。" },
  droplets: { name: "雨滴", icon: "💧", description: "雨滴直接推动天气活力增长。" },
  roots: { name: "根系", icon: "🌱", description: "根系不断生成新的雨滴。" },
  clouds: { name: "云团", icon: "☁️", description: "云团滋养根系，是中段生产者。" },
};

export const CLOUD_LEVEL_THRESHOLDS = [
  10,
  100,
  1000,
  10000,
  100000,
  1000000,
  10000000,
  100000000,
  1000000000,
  10000000000,
  100000000000,
  1000000000000,
];

export const RAIN_RANK_REQUIREMENT_STEPS = [
  3000000,
  10000000,
  30000000,
  100000000,
  1000000000,
  100000000000,
  10000000000000,
  3000000000000000,
  1000000000000000000,
  30000000000000000000,
  100000000000000000000,
  1000000000000000000000,
  10000000000000000000000,
  100000000000000000000000,
];

export const RAIN_RANK_REQUIREMENT_EXPONENTS = [
  Math.log10(3000000),
  7,
  Math.log10(30000000),
  8,
  9,
  11,
  13,
  Math.log10(3000000000000000),
  18,
  Math.log10(30000000000000000000),
  20,
  21,
  22,
  23,
  25,
  28,
  32,
  37,
  43,
  50,
  58,
  67,
  77,
  88,
  100,
];

export const MAINLINE_MILESTONES: MainlineMilestone[] = [
  { id: "monsoon_1", kind: "monsoon", title: "第一次季风", targetExp: 20, requiredRainRanks: 10 },
  { id: "monsoon_2", kind: "monsoon", title: "第二次季风", targetExp: 28, requiredRainRanks: 11 },
  { id: "monsoon_3", kind: "monsoon", title: "第三次季风", targetExp: 40, requiredRainRanks: 12 },
  { id: "monsoon_4", kind: "monsoon", title: "第四次季风", targetExp: 55, requiredRainRanks: 13 },
  {
    id: "storm_front_1",
    kind: "stormFront",
    title: "第一风暴前线",
    targetExp: 70,
    requiredRainRanks: 14,
    requiredMonsoonsInFront: 4,
  },
  { id: "monsoon_5", kind: "monsoon", title: "第五次季风", targetExp: 90, requiredRainRanks: 14 },
  { id: "monsoon_6", kind: "monsoon", title: "第六次季风", targetExp: 120, requiredRainRanks: 15 },
  {
    id: "storm_front_2",
    kind: "stormFront",
    title: "第二风暴前线",
    targetExp: 145,
    requiredRainRanks: 16,
    requiredMonsoonsInFront: 2,
  },
  { id: "monsoon_7", kind: "monsoon", title: "第七次季风", targetExp: 170, requiredRainRanks: 16 },
  { id: "monsoon_8", kind: "monsoon", title: "第八次季风", targetExp: 195, requiredRainRanks: 17 },
  {
    id: "climate_rewrite_1",
    kind: "climateRewrite",
    title: "第一次气候改写",
    targetExp: 220,
    requiredStormFronts: 2,
  },
  { id: "monsoon_9", kind: "monsoon", title: "第九次季风", targetExp: 240, requiredRainRanks: 18 },
  { id: "monsoon_10", kind: "monsoon", title: "第十次季风", targetExp: 255, requiredRainRanks: 19 },
  {
    id: "storm_front_3",
    kind: "stormFront",
    title: "第三风暴前线",
    targetExp: 270,
    requiredRainRanks: 20,
    requiredMonsoonsInFront: 2,
  },
  {
    id: "climate_rewrite_2",
    kind: "climateRewrite",
    title: "第二次气候改写",
    targetExp: 288,
    requiredStormFronts: 3,
  },
  { id: "sky_pulse_1", kind: "skyPulse", title: "天空心脏脉冲 I", targetExp: 260 },
  { id: "sky_pulse_2", kind: "skyPulse", title: "天空心脏脉冲 II", targetExp: 280 },
  { id: "sky_pulse_3", kind: "skyPulse", title: "天空心脏脉冲 III", targetExp: 292 },
  { id: "sky_heart", kind: "ending", title: "点燃天空心脏", targetExp: 308 },
];

export const SKY_HEART_PULSE_BONUS_EXPONENTS = [6, 4, 3];
