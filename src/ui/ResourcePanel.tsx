import {
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  calculateRates,
  formatNumber,
  formatRate,
  getVisibleHudResources,
  type VisibleHudResourceId,
  type ResourceKey,
  type WeatherReactorState,
} from "../game/economy";

interface ResourcePanelProps {
  state: WeatherReactorState;
  exact: boolean;
}

/**
 * Renders stage-visible resources inside the resources tab.
 */
export function ResourcePanel({ state, exact }: ResourcePanelProps) {
  const rates = calculateRates(state);
  const visibleIds = getVisibleHudResources(state);
  const visibleRunResources = RESOURCE_KEYS.filter((key) => visibleIds.includes(key));
  const layerResources = [
    { id: "rainRanks", label: "雨阶", value: formatNumber(state.rainRanks, exact), detail: "小 reset 乘区" },
    { id: "monsoon", label: "季风", value: formatNumber(state.totalMonsoonCycles, exact), detail: `当前前线 ${state.monsoonCyclesInFront}` },
    { id: "cloudCores", label: "云核", value: `${formatNumber(state.cloudCores, exact)} / ${formatNumber(state.totalCloudCores, exact)}`, detail: "季风后的永久资源" },
    { id: "pressure", label: "气压", value: formatNumber(state.pressure, exact), detail: "当前前线资源" },
    { id: "stormCells", label: "风暴胞", value: `${formatNumber(state.stormCells, exact)} / ${formatNumber(state.totalStormCells, exact)}`, detail: "风暴图谱资源" },
    { id: "climateThreads", label: "气候织线", value: `${formatNumber(state.climateThreads, exact)} / ${formatNumber(state.totalClimateThreads, exact)}`, detail: "气候法则资源" },
    { id: "skyHeart", label: "天空心脏", value: state.skyHeartAwakened ? "已苏醒" : `${state.skyHeartPulseLevel}/3`, detail: "终局进度" },
  ].filter((resource) => isLayerResourceVisible(resource.id, visibleIds));

  return (
    <div className="resource-panel">
      <section className="workbench-section">
        <span className="section-kicker">本轮资源</span>
        <div className="classic-resource-grid">
          {visibleRunResources.map((resourceKey: ResourceKey) => (
            <div key={resourceKey} className="classic-resource-card">
              <span>{RESOURCE_LABELS[resourceKey].name}</span>
              <strong>{formatNumber(state.resources[resourceKey], exact)}</strong>
              <small>+{formatRate(rates[resourceKey], exact)}/秒</small>
              <em>{RESOURCE_LABELS[resourceKey].description}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="workbench-section">
        <span className="section-kicker">层级资源</span>
        <div className="classic-resource-grid">
          {layerResources.map((resource) => (
            <div key={resource.id} className="classic-resource-card">
              <span>{resource.label}</span>
              <strong>{resource.value}</strong>
              <em>{resource.detail}</em>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function isLayerResourceVisible(resourceId: string, visibleIds: VisibleHudResourceId[]) {
  switch (resourceId) {
    case "rainRanks":
      return true;
    case "monsoon":
      return visibleIds.includes("monsoonCycles");
    case "cloudCores":
    case "pressure":
    case "stormCells":
    case "climateThreads":
    case "skyHeart":
      return visibleIds.includes(resourceId);
    default:
      return false;
  }
}
