import {
  MONSOON_RAIN_RANK_REQUIREMENT,
  RESOURCE_LABELS,
} from "./constants.ts";
import {
  canAwakenSkyHeart,
  canBuySkyHeartPulse,
  canClaimRainRank,
  canRunClimateRewrite,
  canRunFrontEchoReset,
  canRunMonsoon,
  canRunStormFront,
  getClimateThreadGain,
  getCloudCoreGain,
  getCurrentMainlineMilestone,
  getCurrentMilestoneTargetExp,
  getFrontEchoGain,
  getFrontEchoMaxCount,
  getFrontEchoRequirementExp,
  getMonsoonWeatherTarget,
  getRainRankRequirement,
  getSkyHeartProgress,
  getStormCellGain,
} from "./resets.ts";
import {
  formatNumber,
} from "./format.ts";
import { log10Safe } from "./logNumbers.ts";
import {
  UPGRADE_GROUPS,
  getUpgrade,
  getUpgradeCost,
  isRunUpgradeMaxed,
  isUpgradeVisible,
} from "./upgrades.ts";
import type {
  ResourceKey,
  UpgradeId,
  WeatherReactorState,
} from "./types.ts";

export type IslandMoodId =
  | "dryStart"
  | "firstRain"
  | "rootedRain"
  | "windEye"
  | "monsoon"
  | "stormFront"
  | "climateRewrite"
  | "skyHeart";

export type VisibleHudResourceId =
  | ResourceKey
  | "rainRanks"
  | "monsoonCycles"
  | "cloudCores"
  | "pressure"
  | "stormCells"
  | "climateThreads"
  | "skyHeart";

export type OverlayId = "none" | "resources" | "upgrades" | "formula" | "menu";

export type MainTabId =
  | "reactor"
  | "runUpgrades"
  | "resets"
  | "resources"
  | "atlas"
  | "formula"
  | "settings";

export interface MainTabDefinition {
  id: MainTabId;
  label: string;
}

export type PrimaryActionId =
  | "touchCloud"
  | "claimRainRank"
  | "runMonsoon"
  | "runStormFront"
  | "runFrontEcho"
  | "runClimateRewrite"
  | "buySkyHeartPulse"
  | "awakenSkyHeart";

export interface IslandMood {
  id: IslandMoodId;
  title: string;
  subtitle: string;
  shellClassName: string;
  stageClassName: string;
  weatherEffect: "none" | "rain" | "wind" | "storm" | "aurora";
}

export interface GoalViewModel {
  title: string;
  description: string;
  progress: number;
}

export interface PrimaryActionViewModel {
  id: PrimaryActionId;
  label: string;
  title: string;
  description: string;
  enabled: boolean;
  progress: number;
  rewardText?: string;
}

export interface HudResourceViewModel {
  id: VisibleHudResourceId;
  label: string;
  value: string;
  detail?: string;
}

const MOODS: Record<IslandMoodId, IslandMood> = {
  dryStart: {
    id: "dryStart",
    title: "薄云初醒",
    subtitle: "空岛还很安静，第一场雨正在云层里聚集。",
    shellClassName: "mood-dry-start",
    stageClassName: "stage-dry-start",
    weatherEffect: "none",
  },
  firstRain: {
    id: "firstRain",
    title: "细雨落岛",
    subtitle: "雨阶开始凝结，天气活力第一次形成循环。",
    shellClassName: "mood-first-rain",
    stageClassName: "stage-first-rain",
    weatherEffect: "rain",
  },
  rootedRain: {
    id: "rootedRain",
    title: "根系复苏",
    subtitle: "雨滴唤醒了土壤，生态开始把天气留在岛上。",
    shellClassName: "mood-rooted-rain",
    stageClassName: "stage-rooted-rain",
    weatherEffect: "rain",
  },
  windEye: {
    id: "windEye",
    title: "风眼成环",
    subtitle: "云团与根系互相牵引，第一条天气生产链闭合。",
    shellClassName: "mood-wind-eye",
    stageClassName: "stage-wind-eye",
    weatherEffect: "wind",
  },
  monsoon: {
    id: "monsoon",
    title: "季风记忆",
    subtitle: "云核留下旧循环的痕迹，空岛开始带着记忆重启。",
    shellClassName: "mood-monsoon",
    stageClassName: "stage-monsoon",
    weatherEffect: "wind",
  },
  stormFront: {
    id: "stormFront",
    title: "风暴前线",
    subtitle: "多次季风叠成锋面，天气正在向更高层压缩。",
    shellClassName: "mood-storm-front",
    stageClassName: "stage-storm-front",
    weatherEffect: "storm",
  },
  climateRewrite: {
    id: "climateRewrite",
    title: "气候改写",
    subtitle: "规则开始沉淀，空岛不再只是重复旧天气。",
    shellClassName: "mood-climate-rewrite",
    stageClassName: "stage-climate-rewrite",
    weatherEffect: "aurora",
  },
  skyHeart: {
    id: "skyHeart",
    title: "天空心脏",
    subtitle: "高空的脉冲正在回应，终局天气逐渐成形。",
    shellClassName: "mood-sky-heart",
    stageClassName: "stage-sky-heart",
    weatherEffect: "aurora",
  },
};

/**
 * Returns the current visual mood for the island stage.
 */
export function getIslandMood(state: WeatherReactorState): IslandMood {
  if (state.skyHeartAwakened || state.skyHeartPulseLevel > 0 || state.bestWeatherExp >= 292) {
    return MOODS.skyHeart;
  }

  if (state.totalClimateRewrites > 0) {
    return MOODS.climateRewrite;
  }

  if (state.totalStormFronts > 0) {
    return MOODS.stormFront;
  }

  if (state.totalMonsoonCycles > 0 || state.cloudCores > 0) {
    return MOODS.monsoon;
  }

  if (state.rainRanks >= 6 || state.upgrades.windEye > 0) {
    return MOODS.windEye;
  }

  if (state.rainRanks >= 3 || state.upgrades.rootWake > 0 || state.upgrades.cloudBloom > 0) {
    return MOODS.rootedRain;
  }

  if (state.rainRanks >= 1 || state.resources.droplets > 0) {
    return MOODS.firstRain;
  }

  return MOODS.dryStart;
}

/**
 * Picks the small resource set that belongs in the top HUD.
 */
export function getVisibleHudResources(state: WeatherReactorState): VisibleHudResourceId[] {
  const mood = getIslandMood(state);

  switch (mood.id) {
    case "dryStart":
      return ["weather", "rainRanks"];
    case "firstRain":
      return ["weather", "rainRanks", "droplets"];
    case "rootedRain":
      return ["weather", "rainRanks", "droplets", "roots"];
    case "windEye":
      return ["weather", "rainRanks", "droplets", "roots", "clouds"];
    case "monsoon":
      return ["weather", "rainRanks", "monsoonCycles", "cloudCores", "pressure"];
    case "stormFront":
      return ["weather", "monsoonCycles", "pressure", "stormCells"];
    case "climateRewrite":
      return ["weather", "stormCells", "climateThreads", "skyHeart"];
    case "skyHeart":
      return ["weather", "climateThreads", "skyHeart"];
  }
}

/**
 * Converts the current HUD resources into display-ready chips.
 */
export function getHudResourceViewModels(
  state: WeatherReactorState,
  exact = false,
): HudResourceViewModel[] {
  return getVisibleHudResources(state).map((resourceId) => {
    if (resourceId in RESOURCE_LABELS) {
      const key = resourceId as ResourceKey;
      return {
        id: key,
        label: RESOURCE_LABELS[key].name,
        value: formatNumber(state.resources[key], exact),
      };
    }

    switch (resourceId) {
      case "rainRanks":
        return { id: resourceId, label: "雨阶", value: formatNumber(state.rainRanks, exact) };
      case "monsoonCycles":
        return { id: resourceId, label: "季风", value: formatNumber(state.totalMonsoonCycles, exact), detail: `前线 ${state.monsoonCyclesInFront}` };
      case "cloudCores":
        return { id: resourceId, label: "云核", value: formatNumber(state.cloudCores, exact), detail: `总 ${formatNumber(state.totalCloudCores, exact)}` };
      case "pressure":
        return { id: resourceId, label: "气压", value: formatNumber(state.pressure, exact) };
      case "stormCells":
        return { id: resourceId, label: "风暴胞", value: formatNumber(state.stormCells, exact), detail: `总 ${formatNumber(state.totalStormCells, exact)}` };
      case "climateThreads":
        return { id: resourceId, label: "气候织线", value: formatNumber(state.climateThreads, exact), detail: `总 ${formatNumber(state.totalClimateThreads, exact)}` };
      case "skyHeart":
        return { id: resourceId, label: "天空心脏", value: `${state.skyHeartPulseLevel}/3`, detail: state.skyHeartAwakened ? "已苏醒" : "脉冲" };
      default:
        return { id: "weather", label: "天气活力", value: formatNumber(state.resources.weather, exact) };
    }
  });
}

/**
 * Returns the compact stat set used by the classic top status bar.
 */
export function getVisibleHudStats(state: WeatherReactorState, exact = false) {
  return getHudResourceViewModels(state, exact).slice(0, 4);
}

/**
 * Returns main workbench tabs available at the current stage.
 */
export function getUnlockedMainTabs(state: WeatherReactorState): MainTabDefinition[] {
  const tabs: MainTabDefinition[] = [
    { id: "reactor", label: "概览" },
    { id: "runUpgrades", label: "本轮升级" },
    { id: "resets", label: "重置" },
    { id: "resources", label: "资源" },
  ];

  if (state.totalMonsoonCycles > 0 || state.cloudCores > 0 || state.totalStormFronts > 0) {
    tabs.push({ id: "atlas", label: "图谱" });
  }

  tabs.push({ id: "formula", label: "公式" });
  tabs.push({ id: "settings", label: "设置" });
  return tabs;
}

/**
 * Returns overlay tabs that have meaningful content at the current stage.
 */
export function getVisibleOverlayTabs(state: WeatherReactorState): OverlayId[] {
  const tabs: OverlayId[] = ["resources", "upgrades", "formula", "menu"];
  return tabs.filter((tab) => tab !== "none" && (tab !== "formula" || state.cloudLevel >= 1 || state.rainRanks > 0));
}

/**
 * Returns the next visible goal for the player.
 */
export function getPrimaryGoalViewModel(state: WeatherReactorState, exact = false): GoalViewModel {
  if (state.skyHeartAwakened) {
    return {
      title: "天空心脏已苏醒",
      description: "空岛天气完成当前终局，可以继续刷更高天气活力。",
      progress: 1,
    };
  }

  if (state.rainRanks === 0 && state.upgrades.dropletSeed === 0) {
    return {
      title: "让天气自己流动",
      description: "点击云层，购买云层注入与活力基流，打开第一段自动增长。",
      progress: Math.min(1, state.bestWeather / 100),
    };
  }

  if (state.rainRanks < 10 && state.totalMonsoonCycles === 0) {
    const requirement = getRainRankRequirement(state);
    return {
      title: state.rainRanks === 0 ? "凝结第一次雨阶" : "冲向 10 雨阶",
      description: `天气活力达到 ${formatNumber(requirement, exact)} 后凝结雨阶，逐步开启生产者链。`,
      progress: Math.min(1, state.resources.weather / requirement),
    };
  }

  const milestone = getCurrentMainlineMilestone(state);
  const targetExp = getCurrentMilestoneTargetExp(state);
  const currentExp = log10Safe(state.resources.weather);
  const requiredRainRanks = milestone.requiredRainRanks ?? MONSOON_RAIN_RANK_REQUIREMENT;

  if (state.rainRanks < requiredRainRanks) {
    return {
      title: `补足 ${requiredRainRanks} 雨阶`,
      description: `${requiredRainRanks} 雨阶后推进 ${milestone.title}。`,
      progress: Math.min(1, state.rainRanks / requiredRainRanks),
    };
  }

  if (currentExp < targetExp) {
    return {
      title: `冲向${milestone.title}`,
      description: `当前目标为 1e${targetExp.toFixed(exact ? 2 : 0)} 天气活力。`,
      progress: Math.min(1, Math.max(0, currentExp) / Math.max(1, targetExp)),
    };
  }

  return {
    title: `执行${milestone.title}`,
    description: getMilestoneActionText(milestone.kind),
    progress: 1,
  };
}

/**
 * Chooses the single strongest action to expose in the bottom action bar.
 */
export function getPrimaryAction(state: WeatherReactorState): PrimaryActionViewModel {
  if (canAwakenSkyHeart(state)) {
    return {
      id: "awakenSkyHeart",
      label: "唤醒",
      title: "唤醒天空心脏",
      description: "终局条件已达成，点燃天空心脏。",
      enabled: true,
      progress: 1,
    };
  }

  if (canBuySkyHeartPulse(state)) {
    return {
      id: "buySkyHeartPulse",
      label: "点亮脉冲",
      title: "天空心脏脉冲",
      description: "购买下一次终局脉冲，把天气活力推向 1e308。",
      enabled: true,
      progress: getSkyHeartProgress(state),
      rewardText: `${state.skyHeartPulseLevel}/3`,
    };
  }

  if (canRunClimateRewrite(state)) {
    return {
      id: "runClimateRewrite",
      label: "改写气候",
      title: "气候改写",
      description: "重置当前天气与前线压力，获得气候织线。",
      enabled: true,
      progress: 1,
      rewardText: `+${getClimateThreadGain(state)} 织线`,
    };
  }

  if (canRunStormFront(state)) {
    return {
      id: "runStormFront",
      label: "收束前线",
      title: "风暴前线",
      description: "收束当前前线，获得风暴胞并推进更高层天气。",
      enabled: true,
      progress: 1,
      rewardText: `+${getStormCellGain(state)} 风暴胞`,
    };
  }

  if (canRunFrontEchoReset(state)) {
    return {
      id: "runFrontEcho",
      label: "激起回响",
      title: "前线回响",
      description: `未够主 reset 时的小 reset，最多 ${getFrontEchoMaxCount(state)} 层。`,
      enabled: true,
      progress: 1,
      rewardText: `+${getFrontEchoGain(state)} 回响`,
    };
  }

  if (canRunMonsoon(state)) {
    return {
      id: "runMonsoon",
      label: "执行季风",
      title: "季风循环",
      description: "重置本轮天气，凝结云核并获得当前前线的气压。",
      enabled: true,
      progress: 1,
      rewardText: `+${getCloudCoreGain(state)} 云核`,
    };
  }

  if (canClaimRainRank(state)) {
    return {
      id: "claimRainRank",
      label: "凝结雨阶",
      title: "小 reset",
      description: "当前升级会重置，获得 1 雨阶并提高天气活力收入。",
      enabled: true,
      progress: 1,
      rewardText: `雨阶 ${state.rainRanks} → ${state.rainRanks + 1}`,
    };
  }

  const milestone = getCurrentMainlineMilestone(state);
  const targetExp = getCurrentMilestoneTargetExp(state);
  const currentExp = log10Safe(state.resources.weather);
  const rainRequirement = getRainRankRequirement(state);
  const monsoonTarget = getMonsoonWeatherTarget(state);
  const frontEchoRequirementExp = getFrontEchoRequirementExp(state);
  const targetProgress = Math.min(1, Math.max(0, currentExp) / Math.max(1, targetExp));
  const rainProgress = Math.min(1, state.resources.weather / Math.max(1, rainRequirement));

  return {
    id: "touchCloud",
    label: "点击云层",
    title: "积蓄天气活力",
    description: state.totalMonsoonCycles === 0
      ? `下一雨阶需要 ${formatNumber(rainRequirement)} 天气活力。`
      : `主线 ${milestone.title} 目标 1e${targetExp.toFixed(0)}，季风目标 ${formatNumber(monsoonTarget)}。`,
    enabled: true,
    progress: state.totalMonsoonCycles === 0 ? rainProgress : targetProgress,
    rewardText: canRunFrontEchoReset(state) ? `回响门槛 1e${frontEchoRequirementExp.toFixed(0)}` : undefined,
  };
}

/**
 * Picks visible run upgrades for the bottom action bar.
 */
export function getActionBarUpgradeIds(state: WeatherReactorState): UpgradeId[] {
  const visibleUpgradeIds = UPGRADE_GROUPS
    .filter((group) => group.isUnlocked(state))
    .flatMap((group) => group.upgradeIds)
    .filter((upgradeId) => isUpgradeVisible(state, upgradeId))
    .filter((upgradeId) => !isRunUpgradeMaxed(state, upgradeId));

  return visibleUpgradeIds.slice(0, 6);
}

/**
 * Returns the run upgrades emphasized by the current stage.
 */
export function getRecommendedUpgradeIds(state: WeatherReactorState): UpgradeId[] {
  const milestone = getCurrentMainlineMilestone(state);
  const ids: UpgradeId[] = state.rainRanks < 1
    ? ["cloudTouch", "dropletSeed", "weatherAmplifier"]
    : state.rainRanks < 3
      ? ["rootWake", "weatherAmplifier", "dropletSeed"]
      : state.rainRanks < 6
        ? ["cloudBloom", "rootWake", "weatherAmplifier"]
        : state.rainRanks < (milestone.requiredRainRanks ?? MONSOON_RAIN_RANK_REQUIREMENT)
          ? ["windEye", "heavyRain", "weatherAmplifier"]
          : milestone.kind === "monsoon"
            ? ["monsoonPull", "heavyRain", "weatherAmplifier"]
            : ["monsoonPull", "pressureGaugeRun", "frontRain"];

  return ids.filter((upgradeId) => isUpgradeVisible(state, upgradeId) && !isRunUpgradeMaxed(state, upgradeId));
}

function getMilestoneActionText(kind: ReturnType<typeof getCurrentMainlineMilestone>["kind"]) {
  switch (kind) {
    case "monsoon":
      return "重置本轮天气，凝结云核，并把前线推进到下一段。";
    case "stormFront":
      return "收束当前前线，获得风暴胞。";
    case "climateRewrite":
      return "重写当前气候层，获得气候织线。";
    case "skyPulse":
      return "点亮天空心脏脉冲。";
    case "ending":
      return "点燃天空心脏。";
  }
}
