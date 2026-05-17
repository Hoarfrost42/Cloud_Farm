type UiRegionId =
  | "shell"
  | "pulseBar"
  | "systemTabs"
  | "mainDeck"
  | "revivalStage"
  | "recoveryNotebook"
  | "resourceMargin"
  | "recoveryRoute";

interface UiRegionDefinition {
  className: string;
  label: string;
  material: "sky" | "paper" | "margin" | "route";
  region: string;
}

const UI_REGIONS: Record<UiRegionId, UiRegionDefinition> = {
  shell: {
    className: "ui-region ui-region--shell",
    label: "云屿回晴游戏界面",
    material: "sky",
    region: "shell",
  },
  pulseBar: {
    className: "ui-region ui-region--pulse-bar",
    label: "晴雨脉象",
    material: "paper",
    region: "pulse-bar",
  },
  systemTabs: {
    className: "ui-region ui-region--system-tabs",
    label: "复苏手账页签",
    material: "paper",
    region: "system-tabs",
  },
  mainDeck: {
    className: "ui-region ui-region--main-deck",
    label: "空岛复苏主界面",
    material: "sky",
    region: "main-deck",
  },
  revivalStage: {
    className: "ui-region ui-region--revival-stage",
    label: "空岛复苏现场",
    material: "sky",
    region: "revival-stage",
  },
  recoveryNotebook: {
    className: "ui-region ui-region--recovery-notebook",
    label: "复苏手账主页面",
    material: "paper",
    region: "recovery-notebook",
  },
  resourceMargin: {
    className: "ui-region ui-region--resource-margin",
    label: "天气手账边注",
    material: "margin",
    region: "resource-margin",
  },
  recoveryRoute: {
    className: "ui-region ui-region--recovery-route",
    label: "回晴航迹",
    material: "route",
    region: "recovery-route",
  },
};

/**
 * Returns stable semantic attributes for the game's persistent UI regions.
 */
export function getUiRegionProps(regionId: UiRegionId, className?: string) {
  const region = UI_REGIONS[regionId];

  return {
    "aria-label": region.label,
    className: [className, region.className].filter(Boolean).join(" "),
    "data-ui-material": region.material,
    "data-ui-region": region.region,
  };
}
