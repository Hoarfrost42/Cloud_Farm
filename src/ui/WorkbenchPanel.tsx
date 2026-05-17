import {
  CLIMATE_LAWS,
  PERMANENT_UPGRADES,
  PRESSURE_UPGRADES,
  STORM_UPGRADES,
  STORM_TRUNK_UPGRADES,
  UPGRADE_GROUPS,
  canAwakenSkyHeart,
  canBuySkyHeartPulse,
  canClaimRainRank,
  canPay,
  canRunClimateRewrite,
  canRunFrontEchoReset,
  canRunMonsoon,
  canRunStormFront,
  formatCost,
  formatNumber,
  getClimateLaw,
  getClimateThreadGain,
  getCloudCoreGain,
  getCurrentMainlineMilestone,
  getCurrentMilestoneTargetExp,
  getFrontEchoGain,
  getFrontEchoMaxCount,
  getLayerUpgradeCost,
  getPermanentUpgrade,
  getPressureUpgrade,
  getRainRankRequirement,
  getResourceLedgerSections,
  getRecommendedUpgradeIds,
  getStormCellGain,
  getStormUpgrade,
  getUpgrade,
  getUpgradeActionDescription,
  getUpgradeCost,
  hasStormTrunk,
  isRunUpgradeMaxed,
  isUpgradeVisible,
  type ClimateLawId,
  type MainTabId,
  type PermanentUpgradeId,
  type PressureUpgradeId,
  type PrimaryActionId,
  type StormUpgradeId,
  type UpgradeGroupId,
  type UpgradeId,
  type WeatherReactorState,
} from "../game/economy";
import { FormulaPanel } from "./FormulaPanel";
import { MainTabs } from "./MainTabs";
import { ResourcePanel } from "./ResourcePanel";
import { ResourceLedger } from "./ResourceLedger";
import { UpgradeRow } from "./UpgradeRow";
import type { MainTabDefinition } from "./uiTypes";
import { getUiRegionProps } from "./uiRegions";

interface WorkbenchPanelProps {
  state: WeatherReactorState;
  tabs: MainTabDefinition[];
  activeTab: MainTabId;
  selectedUpgradeGroupId: UpgradeGroupId;
  exact: boolean;
  onSelectUpgradeGroup: (groupId: UpgradeGroupId) => void;
  onBuyRunUpgrade: (upgradeId: UpgradeId) => void;
  onBuyPermanentUpgrade: (upgradeId: PermanentUpgradeId) => void;
  onBuyPressureUpgrade: (upgradeId: PressureUpgradeId) => void;
  onBuyStormUpgrade: (upgradeId: StormUpgradeId) => void;
  onBuyClimateLaw: (lawId: ClimateLawId) => void;
  onRunPrimaryAction: (actionId: PrimaryActionId) => void;
  onChangeTab: (tabId: MainTabId) => void;
  onToggleExact: () => void;
  onResetAll: () => void;
}

/**
 * Renders the right-side recovery notebook workbench.
 */
export function WorkbenchPanel({
  state,
  tabs,
  activeTab,
  selectedUpgradeGroupId,
  exact,
  onSelectUpgradeGroup,
  onBuyRunUpgrade,
  onBuyPermanentUpgrade,
  onBuyPressureUpgrade,
  onBuyStormUpgrade,
  onBuyClimateLaw,
  onRunPrimaryAction,
  onChangeTab,
  onToggleExact,
  onResetAll,
}: WorkbenchPanelProps) {
  const resourceLedgerSections = getResourceLedgerSections(state, exact);

  return (
    <section {...getUiRegionProps("recoveryNotebook", "workbench-panel")}>
      <MainTabs tabs={tabs} activeTab={activeTab} onChangeTab={onChangeTab} />
      {renderWorkbenchHeader(state, activeTab)}
      <div className="workbench-body">
        <div className="workbench-content">
          <div className="workbench-page-surface" data-active-tab={activeTab}>
            <NotebookDoodles />
            {activeTab === "reactor" ? renderReactorTab(state) : null}
            {activeTab === "runUpgrades" ? (
              <RunUpgradeTab
                state={state}
                selectedUpgradeGroupId={selectedUpgradeGroupId}
                exact={exact}
                onSelectUpgradeGroup={onSelectUpgradeGroup}
                onBuyRunUpgrade={onBuyRunUpgrade}
              />
            ) : null}
            {activeTab === "resets" ? (
              <ResetTab state={state} exact={exact} onRunPrimaryAction={onRunPrimaryAction} />
            ) : null}
            {activeTab === "resources" ? <ResourcePanel state={state} exact={exact} /> : null}
            {activeTab === "atlas" ? (
              <AtlasTab
                state={state}
                onBuyPermanentUpgrade={onBuyPermanentUpgrade}
                onBuyPressureUpgrade={onBuyPressureUpgrade}
                onBuyStormUpgrade={onBuyStormUpgrade}
                onBuyClimateLaw={onBuyClimateLaw}
              />
            ) : null}
            {activeTab === "formula" ? <FormulaPanel state={state} exact={exact} /> : null}
            {activeTab === "settings" ? (
              <SettingsTab exact={exact} onToggleExact={onToggleExact} onResetAll={onResetAll} />
            ) : null}
          </div>
        </div>
        <ResourceLedger sections={resourceLedgerSections} onOpenTab={onChangeTab} />
      </div>
    </section>
  );
}

const NOTEBOOK_DOODLES = [
  ["cloud-rain", "/assets/art/ui/doodle_cloud_rain.png"],
  ["raindrops", "/assets/art/ui/doodle_raindrops.png"],
  ["wind-swirl", "/assets/art/ui/doodle_wind_swirl.png"],
  ["prism", "/assets/art/ui/doodle_prism.png"],
  ["sprout", "/assets/art/ui/doodle_sprout.png"],
  ["rain-ring", "/assets/art/ui/doodle_rain_ring.png"],
  ["island-contour", "/assets/art/ui/doodle_island_contour.png"],
  ["tape-strip", "/assets/art/ui/doodle_tape_strip.png"],
  ["circle-stamp", "/assets/art/ui/doodle_circle_stamp.png"],
  ["arrow-loop", "/assets/art/ui/doodle_arrow_loop.png"],
  ["lower-cloud", "/assets/art/ui/doodle_lower_cloud.png"],
] as const;

function NotebookDoodles() {
  return (
    <div className="workbench-doodle-layer" aria-hidden="true">
      {NOTEBOOK_DOODLES.map(([id, src]) => (
        <img key={id} className="workbench-doodle" data-doodle={id} src={src} alt="" />
      ))}
    </div>
  );
}

function renderWorkbenchHeader(state: WeatherReactorState, activeTab: MainTabId) {
  const milestone = getCurrentMainlineMilestone(state);
  const title = {
    reactor: "复苏概览",
    runUpgrades: "培育页",
    resets: "循环页",
    resources: "记录页",
    atlas: "云屿图谱",
    formula: "批注页",
    settings: "书签页",
  }[activeTab];

  return (
    <header className="workbench-panel__header">
      <div>
        <span className="section-kicker">{milestone.title}</span>
        <strong>{title}</strong>
      </div>
      <small>回晴至 1e{getCurrentMilestoneTargetExp(state).toFixed(0)}</small>
    </header>
  );
}

function renderReactorTab(state: WeatherReactorState) {
  const recommended = getRecommendedUpgradeIds(state);
  return (
    <div className="workbench-section">
      <span className="section-kicker">本页摘记</span>
      <div className="reactor-brief-grid">
        <div>
          <strong>当前雨阶 {state.rainRanks}</strong>
          <small>季风 {state.totalMonsoonCycles} · 风暴 {state.totalStormFronts} · 气候 {state.totalClimateRewrites}</small>
        </div>
        <div>
          <strong>{recommended.length > 0 ? "推荐照看" : "等待生长"}</strong>
          <small>{recommended.length > 0 ? recommended.map((id) => getUpgrade(id).name).join(" / ") : "保持天气活力流动，等待下一个门槛。"}</small>
        </div>
      </div>
    </div>
  );
}

interface RunUpgradeTabProps {
  state: WeatherReactorState;
  selectedUpgradeGroupId: UpgradeGroupId;
  exact: boolean;
  onSelectUpgradeGroup: (groupId: UpgradeGroupId) => void;
  onBuyRunUpgrade: (upgradeId: UpgradeId) => void;
}

function RunUpgradeTab({ state, selectedUpgradeGroupId, exact, onSelectUpgradeGroup, onBuyRunUpgrade }: RunUpgradeTabProps) {
  const unlockedGroups = UPGRADE_GROUPS.filter((group) => group.isUnlocked(state));
  const selectedGroupCandidate = unlockedGroups.find((group) => group.id === selectedUpgradeGroupId) ?? unlockedGroups[0] ?? UPGRADE_GROUPS[0];
  const selectedGroupHasVisibleRows = selectedGroupCandidate.upgradeIds.some((upgradeId) => isUpgradeVisible(state, upgradeId));
  const selectedGroup = selectedGroupHasVisibleRows
    ? selectedGroupCandidate
    : (unlockedGroups.find((group) => group.upgradeIds.some((upgradeId) => isUpgradeVisible(state, upgradeId))) ?? selectedGroupCandidate);
  const recommendedIds = new Set(getRecommendedUpgradeIds(state));
  const visibleUpgrades = selectedGroup.upgradeIds
    .filter((upgradeId) => upgradeId !== "cooldownDraft")
    .map((upgradeId) => getUpgrade(upgradeId));
  const nextLockedGroup = UPGRADE_GROUPS.find((group) => !group.isUnlocked(state));

  return (
    <div className="run-upgrade-workbench">
      <aside className="run-upgrade-groups">
        {unlockedGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            className={group.id === selectedGroup.id ? "run-group-tab run-group-tab--active" : "run-group-tab"}
            onClick={() => onSelectUpgradeGroup(group.id)}
          >
            <span>{group.badge}</span>
            <strong>{group.title}</strong>
            <small>{group.description}</small>
          </button>
        ))}
        {nextLockedGroup ? (
          <div className="next-unlock-note">
            <span>下一页</span>
            <strong>{nextLockedGroup.badge} {nextLockedGroup.title}</strong>
            <small>{nextLockedGroup.lockedHint}</small>
          </div>
        ) : null}
      </aside>

      <div className="upgrade-row-stack">
        {visibleUpgrades.length === 0 ? (
          <div className="workbench-empty-state">
            <strong>先让云层苏醒</strong>
            <span>点击左侧云层，第一批本轮升级会在天气活力开始流动后显露。</span>
          </div>
        ) : visibleUpgrades.map((upgrade) => {
          const cost = getUpgradeCost(state, upgrade);
          const unlocked = isUpgradeVisible(state, upgrade.id);
          const maxed = unlocked && isRunUpgradeMaxed(state, upgrade);
          const affordable = unlocked && !maxed && canPay(state.resources, cost);
          return (
            <UpgradeRow
              key={upgrade.id}
              title={upgrade.name}
              levelText={`Lv.${state.upgrades[upgrade.id]}`}
              effectText={getUpgradeActionDescription(state, upgrade, exact)}
              detailText={upgrade.description}
              costText={maxed ? "MAX" : formatCost(cost, exact)}
              ready={affordable}
              disabled={!affordable}
              recommended={recommendedIds.has(upgrade.id)}
              onClick={() => onBuyRunUpgrade(upgrade.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ResetTabProps {
  state: WeatherReactorState;
  exact: boolean;
  onRunPrimaryAction: (actionId: PrimaryActionId) => void;
}

function ResetTab({ state, exact, onRunPrimaryAction }: ResetTabProps) {
  const milestone = getCurrentMainlineMilestone(state);
  const resetRows: Array<{
    id: PrimaryActionId;
    title: string;
    effect: string;
    cost: string;
    ready: boolean;
    visible: boolean;
  }> = [
    {
      id: "claimRainRank",
      title: "凝结雨阶",
      effect: `获得 1 雨阶，当前 ${state.rainRanks} → ${state.rainRanks + 1}`,
      cost: `需要 ${formatNumber(getRainRankRequirement(state), exact)} 天气活力`,
      ready: canClaimRainRank(state),
      visible: true,
    },
    {
      id: "runMonsoon",
      title: "季风循环",
      effect: `获得 +${getCloudCoreGain(state)} 云核，并推进前线气压`,
      cost: `需要 ${milestone.requiredRainRanks ?? 10} 雨阶与当前主线目标`,
      ready: canRunMonsoon(state),
      visible: state.rainRanks >= 8 || state.totalMonsoonCycles > 0 || canRunMonsoon(state),
    },
    {
      id: "runFrontEcho",
      title: "前线回响",
      effect: `获得 +${getFrontEchoGain(state)} 回响，最多 ${getFrontEchoMaxCount(state)} 层`,
      cost: "低于风暴前线的补偿小 reset",
      ready: canRunFrontEchoReset(state),
      visible: state.totalMonsoonCycles > 0 || canRunFrontEchoReset(state),
    },
    {
      id: "runStormFront",
      title: "风暴前线",
      effect: `获得 +${getStormCellGain(state)} 风暴胞`,
      cost: "需要当前前线完成主线目标",
      ready: canRunStormFront(state),
      visible: state.totalMonsoonCycles > 0 || state.totalStormFronts > 0 || canRunStormFront(state),
    },
    {
      id: "runClimateRewrite",
      title: "气候改写",
      effect: `获得 +${getClimateThreadGain(state)} 气候织线`,
      cost: "需要足够风暴前线与天气活力",
      ready: canRunClimateRewrite(state),
      visible: state.totalStormFronts > 0 || state.totalClimateRewrites > 0 || canRunClimateRewrite(state),
    },
    {
      id: "buySkyHeartPulse",
      title: "天空心脏脉冲",
      effect: `点亮下一次脉冲，当前 ${state.skyHeartPulseLevel}/3`,
      cost: "需要抵达当前天空心脏目标",
      ready: canBuySkyHeartPulse(state),
      visible: state.totalClimateRewrites > 0 || state.skyHeartPulseLevel > 0 || canBuySkyHeartPulse(state),
    },
    {
      id: "awakenSkyHeart",
      title: "点燃天空心脏",
      effect: "完成当前终局",
      cost: "需要天气活力抵达 1e308",
      ready: canAwakenSkyHeart(state),
      visible: state.skyHeartPulseLevel > 0 || state.skyHeartAwakened || canAwakenSkyHeart(state),
    },
  ];

  return (
    <div className="upgrade-row-stack">
      {resetRows.filter((row) => row.visible).map((row) => (
        <UpgradeRow
          key={row.id}
          title={row.title}
          effectText={row.effect}
          detailText={row.cost}
          costText={row.ready ? "可执行" : "未达成"}
          actionText="执行"
          ready={row.ready}
          disabled={!row.ready}
          onClick={() => onRunPrimaryAction(row.id)}
        />
      ))}
    </div>
  );
}

interface AtlasTabProps {
  state: WeatherReactorState;
  onBuyPermanentUpgrade: (upgradeId: PermanentUpgradeId) => void;
  onBuyPressureUpgrade: (upgradeId: PressureUpgradeId) => void;
  onBuyStormUpgrade: (upgradeId: StormUpgradeId) => void;
  onBuyClimateLaw: (lawId: ClimateLawId) => void;
}

function AtlasTab({
  state,
  onBuyPermanentUpgrade,
  onBuyPressureUpgrade,
  onBuyStormUpgrade,
  onBuyClimateLaw,
}: AtlasTabProps) {
  const stormTrunkProgress = STORM_TRUNK_UPGRADES.filter((upgrade) => state.stormUpgrades[upgrade.id] >= upgrade.level).length;
  return (
    <div className="atlas-panel">
      <section className="workbench-section">
        <span className="section-kicker">云核天赋</span>
        <div className="upgrade-row-stack">
          {PERMANENT_UPGRADES.filter((upgrade) => {
            const definition = getPermanentUpgrade(upgrade.id);
            return state.permanentUpgrades.includes(upgrade.id) || !definition.isUnlocked || definition.isUnlocked(state);
          }).map((upgrade) => {
            const definition = getPermanentUpgrade(upgrade.id);
            const owned = state.permanentUpgrades.includes(upgrade.id);
            const affordable = state.cloudCores >= definition.cost;
            return (
              <UpgradeRow
                key={definition.id}
                title={definition.name}
                levelText={owned ? "已拥有" : "天赋"}
                effectText={definition.description}
                costText={owned ? "已拥有" : `${definition.cost} 云核`}
                ready={!owned && affordable}
                owned={owned}
                disabled={owned || !affordable}
                onClick={() => onBuyPermanentUpgrade(definition.id)}
              />
            );
          })}
        </div>
      </section>

      {(state.totalMonsoonCycles >= 2 || state.pressure > 0) ? (
        <LayerSection
          title="气压升级"
          unit="气压"
          resource={state.pressure}
          upgrades={PRESSURE_UPGRADES}
          getLevel={(id) => state.pressureUpgrades[id]}
          getDefinition={getPressureUpgrade}
          onBuy={onBuyPressureUpgrade}
        />
      ) : null}

      {(state.totalStormFronts > 0 || state.stormCells > 0) ? (
        <section className="workbench-section">
          <span className="section-kicker">风暴图谱</span>
          <div className={hasStormTrunk(state) ? "storm-trunk-summary storm-trunk-summary--complete" : "storm-trunk-summary"}>
            <strong>风暴主干 {stormTrunkProgress}/{STORM_TRUNK_UPGRADES.length}</strong>
            <span>{hasStormTrunk(state) ? "基础主干已经点亮。" : "第一次风暴会优先点亮基础主干。"}</span>
          </div>
          <LayerUpgradeRows
            unit="风暴胞"
            resource={state.stormCells}
            upgrades={STORM_UPGRADES}
            getLevel={(id) => state.stormUpgrades[id]}
            getDefinition={getStormUpgrade}
            onBuy={onBuyStormUpgrade}
          />
        </section>
      ) : null}

      {(state.totalClimateRewrites > 0 || state.climateThreads > 0) ? (
        <LayerSection
          title="气候法则"
          unit="织线"
          resource={state.climateThreads}
          upgrades={CLIMATE_LAWS}
          getLevel={(id) => state.climateLaws[id]}
          getDefinition={getClimateLaw}
          onBuy={onBuyClimateLaw}
        />
      ) : null}
    </div>
  );
}

interface LayerSectionProps<Id extends string> {
  title: string;
  unit: string;
  resource: number;
  upgrades: Array<{ id: Id; name: string; description: string; costSequence: number[] }>;
  getLevel: (id: Id) => number;
  getDefinition: (id: Id) => { id: Id; name: string; description: string; costSequence: number[] };
  onBuy: (id: Id) => void;
}

function LayerSection<Id extends string>(props: LayerSectionProps<Id>) {
  return (
    <section className="workbench-section">
      <span className="section-kicker">{props.title}</span>
      <LayerUpgradeRows {...props} />
    </section>
  );
}

function LayerUpgradeRows<Id extends string>({
  unit,
  resource,
  upgrades,
  getLevel,
  getDefinition,
  onBuy,
}: Omit<LayerSectionProps<Id>, "title">) {
  return (
    <div className="upgrade-row-stack">
      {upgrades.map((upgrade) => {
        const definition = getDefinition(upgrade.id);
        const level = getLevel(upgrade.id);
        const cost = getLayerUpgradeCost(definition, level);
        const affordable = cost > 0 && resource >= cost;
        return (
          <UpgradeRow
            key={definition.id}
            title={definition.name}
            levelText={`Lv.${level}`}
            effectText={definition.description}
            costText={cost > 0 ? `${cost} ${unit}` : "已满级"}
            ready={affordable}
            disabled={!affordable}
            onClick={() => onBuy(definition.id)}
          />
        );
      })}
    </div>
  );
}

interface SettingsTabProps {
  exact: boolean;
  onToggleExact: () => void;
  onResetAll: () => void;
}

function SettingsTab({ exact, onToggleExact, onResetAll }: SettingsTabProps) {
  return (
    <div className="settings-panel">
      <section className="workbench-section">
        <span className="section-kicker">显示书签</span>
        <button type="button" className="classic-command-button" onClick={onToggleExact}>
          {exact ? "切换为简洁显示" : "切换为小数显示"}
        </button>
      </section>
      <section className="workbench-section">
        <span className="section-kicker">存档书签</span>
        <button type="button" className="classic-command-button classic-command-button--danger" onClick={onResetAll}>
          重置存档
        </button>
      </section>
    </div>
  );
}
