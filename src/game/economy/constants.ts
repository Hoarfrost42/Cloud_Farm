import type { ResourceKey } from "./types.ts";

export const SAVE_KEY = "cloud-island-weather-reactor-v12-lab-formula-c";
export const ECONOMY_VERSION_LABEL = "Batch 1 / economy v12 lab formula C";

export const BASE_CLICK_WEATHER = 1;
export const CLOUD_TOUCH_WEATHER_MULTIPLIER = 5;
export const DROPLET_SEED_BASE_RATE = 1;
export const DROPLET_LOG_MULTIPLIER_STEP = 8;
export const DROPLET_LOG_DIVISOR = 1000;
export const PRODUCER_STOCK_LOG_MULTIPLIER_STEP = 6;
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
  1000000000000000,
  100000000000000000,
  10000000000000000000,
  100000000000000000000,
  1000000000000000000000,
  10000000000000000000000,
  100000000000000000000000,
];
