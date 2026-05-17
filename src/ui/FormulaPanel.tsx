import {
  calculateWeatherPerSecondLog,
  DROPLET_LOG_DIVISOR,
  DROPLET_LOG_MULTIPLIER_STEP,
  formatMultiplier,
  formatNumber,
  formatRate,
  getAutoDrizzleGain,
  getDirectMultiplierSoftCappedLevel,
  getDropletWeatherMultiplier,
  getHeavyRainEffectiveLevel,
  getLayerBonusBreakdown,
  getMonsoonPullMultiplier,
  getProducerMultiplier,
  getProducerStockMultiplier,
  getRainRankWeatherMultiplier,
  HEAVY_RAIN_LATE_SOFT_CAP_SCALE,
  HEAVY_RAIN_LATE_SOFT_CAP_START,
  HEAVY_RAIN_SOFT_CAP_SCALE,
  HEAVY_RAIN_SOFT_CAP_START,
  HEAVY_RAIN_WEATHER_MULTIPLIER,
  MONSOON_PULL_LATE_SOFT_CAP_SCALE,
  MONSOON_PULL_LATE_SOFT_CAP_START,
  MONSOON_PULL_SOFT_CAP_SCALE,
  MONSOON_PULL_SOFT_CAP_START,
  PRODUCER_STOCK_LOG_DIVISOR,
  PRODUCER_STOCK_LOG_MULTIPLIER_STEP,
  RAIN_RANK_BASE_BONUS,
  ROOT_WAKE_BASE_RATE,
  ROOT_WAKE_RATE_MULTIPLIER,
  WEATHER_AMPLIFIER_LATE_SOFT_CAP_SCALE,
  WEATHER_AMPLIFIER_LATE_SOFT_CAP_START,
  WEATHER_AMPLIFIER_MULTIPLIER,
  WEATHER_AMPLIFIER_SOFT_CAP_SCALE,
  WEATHER_AMPLIFIER_SOFT_CAP_START,
  CLOUD_BLOOM_BASE_RATE,
  CLOUD_BLOOM_RATE_MULTIPLIER,
  WIND_EYE_BASE_RATE,
  WIND_EYE_RATE_MULTIPLIER,
  pow10Clamped,
  type WeatherReactorState,
} from "../game/economy";

interface FormulaPanelProps {
  state: WeatherReactorState;
  exact: boolean;
}

interface FormulaRule {
  label: string;
  text: string;
  visible: boolean;
}

interface LayerCard {
  label: string;
  value: number;
  visible: boolean;
}

/**
 * Renders formula and layer-bonus details in a normal workbench tab.
 */
export function FormulaPanel({ state, exact }: FormulaPanelProps) {
  const layerBonuses = getLayerBonusBreakdown(state);
  const rainRankMultiplier = getRainRankWeatherMultiplier(state);
  const dropletStockStep = DROPLET_LOG_MULTIPLIER_STEP + state.upgrades.deepVapor * 2;
  const dropletStockMultiplier = getDropletWeatherMultiplier(state.resources.droplets, state);
  const producerStockStep = PRODUCER_STOCK_LOG_MULTIPLIER_STEP + state.climateLaws.deepRootLaw * 1.2;
  const rootStockMultiplier = getProducerStockMultiplier(state.resources.roots, state);
  const cloudStockMultiplier = getProducerStockMultiplier(state.resources.clouds, state);
  const producerMultiplier = getProducerMultiplier(state);
  const producerExponent = Math.log10(Math.max(1, producerMultiplier));
  const autoDrizzleGain = getAutoDrizzleGain(state);
  const weatherAmplifierLevel = getDirectMultiplierSoftCappedLevel(
    state,
    state.upgrades.weatherAmplifier,
    WEATHER_AMPLIFIER_SOFT_CAP_START,
    WEATHER_AMPLIFIER_SOFT_CAP_SCALE,
    WEATHER_AMPLIFIER_LATE_SOFT_CAP_START,
    WEATHER_AMPLIFIER_LATE_SOFT_CAP_SCALE,
  );
  const heavyRainLevel = getHeavyRainEffectiveLevel(state);
  const monsoonPullLevel = getDirectMultiplierSoftCappedLevel(
    state,
    state.upgrades.monsoonPull,
    MONSOON_PULL_SOFT_CAP_START,
    MONSOON_PULL_SOFT_CAP_SCALE,
    MONSOON_PULL_LATE_SOFT_CAP_START,
    MONSOON_PULL_LATE_SOFT_CAP_SCALE,
  );
  const monsoonPullMultiplier = getMonsoonPullMultiplier(state);
  const stormMemoryMultiplier = 1 + state.upgrades.stormMemory * Math.max(1, state.totalMonsoonCycles) * 0.12;
  const weatherRateLog = calculateWeatherPerSecondLog(state);
  const baseFormulaLog = Number.isFinite(weatherRateLog) ? weatherRateLog - layerBonuses.total : Number.NEGATIVE_INFINITY;
  const formatLogRate = (logValue: number) => Number.isFinite(logValue)
    ? formatRate(pow10Clamped(logValue), exact)
    : "0";
  const formulaRules: FormulaRule[] = [
    {
      label: "基础天气",
      text: `基础天气/s = 被动天气 + 自动细雨；被动天气会吃水汽回响、雨阶和本轮培育，自动细雨当前 ${formatRate(autoDrizzleGain, exact)}/s。`,
      visible: true,
    },
    {
      label: "雨阶",
      text: `天气活力 ×[(1+${RAIN_RANK_BASE_BONUS}×雨阶)+0.04×雨阶过载Lv×雨阶²+0.12×凝雨法则Lv×雨阶²]，静雨法则启用时再 ×3，当前 ×${formatMultiplier(rainRankMultiplier, exact)}。`,
      visible: state.rainRanks > 0,
    },
    {
      label: "水汽回响",
      text: `天气活力 ×[1+log10(1+雨滴/${formatNumber(DROPLET_LOG_DIVISOR)})×${formatMultiplier(dropletStockStep, exact)}]，当前雨滴 ${formatNumber(state.resources.droplets, exact)}，当前 ×${formatMultiplier(dropletStockMultiplier, exact)}。深层水汽每级让系数 +2。`,
      visible: state.resources.droplets > 0 || state.upgrades.rootWake > 0 || state.upgrades.deepVapor > 0,
    },
    {
      label: "生产链",
      text: `雨滴/s=${ROOT_WAKE_BASE_RATE}×${ROOT_WAKE_RATE_MULTIPLIER}^(根系苏醒Lv-1)×根系库存回响×共振；根系/s=${CLOUD_BLOOM_BASE_RATE}×${CLOUD_BLOOM_RATE_MULTIPLIER}^(云团孕育Lv-1)×云团库存回响×共振；云团/s=${WIND_EYE_BASE_RATE}×${WIND_EYE_RATE_MULTIPLIER}^(风眼牵引Lv-1)×共振。库存回响=1+log10(1+库存/${formatNumber(PRODUCER_STOCK_LOG_DIVISOR)})×${formatMultiplier(producerStockStep, exact)}；当前共振 ×10^${producerExponent.toFixed(exact ? 2 : 1)}。`,
      visible: state.upgrades.rootWake > 0 || state.upgrades.cloudBloom > 0 || state.upgrades.windEye > 0,
    },
    {
      label: "本轮培育",
      text: `被动天气 ×${WEATHER_AMPLIFIER_MULTIPLIER}^天气增幅有效Lv(${formatMultiplier(weatherAmplifierLevel, exact)}) ×${HEAVY_RAIN_WEATHER_MULTIPLIER}^厚云降雨有效Lv(${formatMultiplier(heavyRainLevel, exact)}) ×${formatMultiplier(monsoonPullMultiplier, exact)}^季风牵引有效Lv(${formatMultiplier(monsoonPullLevel, exact)}) ×风暴记忆(${formatMultiplier(stormMemoryMultiplier, exact)})。`,
      visible: state.upgrades.weatherAmplifier > 0 || state.upgrades.heavyRain > 0 || state.upgrades.monsoonPull > 0 || state.upgrades.stormMemory > 0,
    },
    {
      label: "高空回响",
      text: `天气活力 ×10^(云核+气压+风暴+气候+心脏)，当前指数 +${layerBonuses.total.toFixed(exact ? 2 : 1)}。这些是跨层级的指数型推动。`,
      visible: state.totalCloudCores > 0 || state.totalMonsoonCycles > 0 || state.totalStormFronts > 0 || state.totalClimateRewrites > 0 || state.skyHeartPulseLevel > 0,
    },
    {
      label: "云核",
      text: "云核棱镜、季风透镜和回流季风会提供云核回响，作为高空回响的一项。",
      visible: state.totalCloudCores > 0 || state.cloudCores > 0,
    },
    {
      label: "气压",
      text: "当前前线的气压培育与前线积雨提供气压回响，作为高空回响的一项。",
      visible: state.totalMonsoonCycles > 0 || state.pressure > 0 || state.totalPressureSpentThisFront > 0,
    },
    {
      label: "前线回响",
      text: "前线尚未收束时可以激起回响；它会转成风暴侧高空回响，后期可突破部分上限。",
      visible: state.frontEchoesThisFront > 0,
    },
    {
      label: "风暴",
      text: "风暴胞、雷暴上升、雨阶过载和风暴棱镜提供风暴回响，作为高空回响的一项。",
      visible: state.totalStormFronts > 0 || state.totalStormCells > 0,
    },
    {
      label: "气候",
      text: "气候织线、气候回声和气候法则提供气候回响，作为高空回响的一项。",
      visible: state.totalClimateRewrites > 0 || state.totalClimateThreads > 0,
    },
    {
      label: "天空心脏",
      text: "天空心脏脉冲提供心脏回响，作为终局前最后一段高空推动。",
      visible: state.skyHeartPulseLevel > 0 || state.skyHeartAwakened,
    },
  ];
  const visibleFormulaRules = formulaRules.filter((rule) => rule.visible);
  const layerCards: LayerCard[] = [
    { label: "云核", value: layerBonuses.cloudCore, visible: state.totalCloudCores > 0 || state.cloudCores > 0 },
    { label: "气压", value: layerBonuses.pressure, visible: state.totalMonsoonCycles > 0 || state.pressure > 0 || state.totalPressureSpentThisFront > 0 },
    { label: "风暴", value: layerBonuses.storm, visible: state.totalStormFronts > 0 || state.totalStormCells > 0 },
    { label: "气候", value: layerBonuses.climate, visible: state.totalClimateRewrites > 0 || state.totalClimateThreads > 0 },
    { label: "心脏", value: layerBonuses.skyHeart, visible: state.skyHeartPulseLevel > 0 || state.skyHeartAwakened },
  ].filter((card) => card.visible);

  return (
    <div className="formula-panel-classic">
      <section className="workbench-section formula-summary-card">
        <span className="section-kicker">回晴批注</span>
        <strong>天气活力/s = {formatLogRate(baseFormulaLog)} × 10^{layerBonuses.total.toFixed(exact ? 2 : 1)}</strong>
        <p>这里按当前进度记录已经显露的公式。主界面只保留必要资源，细节都收在本页。</p>
        <div className="formula-rule-list">
          {visibleFormulaRules.map((rule) => (
            <span key={rule.label}><b>{rule.label}</b><em>{rule.text}</em></span>
          ))}
        </div>
      </section>

      {layerCards.length > 0 ? <section className="workbench-section">
        <span className="section-kicker">高空回响</span>
        <div className="classic-resource-grid classic-resource-grid--compact">
          {layerCards.map((card) => (
            <div key={card.label} className="classic-resource-card"><span>{card.label}</span><strong>+{card.value.toFixed(1)}</strong></div>
          ))}
        </div>
      </section> : null}
    </div>
  );
}
