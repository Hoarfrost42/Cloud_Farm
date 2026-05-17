import {
  calculateWeatherPerSecondLog,
  formatRate,
  getLayerBonusBreakdown,
  getRainRankWeatherMultiplier,
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
  const weatherRateLog = calculateWeatherPerSecondLog(state);
  const baseFormulaLog = Number.isFinite(weatherRateLog) ? weatherRateLog - layerBonuses.total : Number.NEGATIVE_INFINITY;
  const formatLogRate = (logValue: number) => Number.isFinite(logValue)
    ? formatRate(pow10Clamped(logValue), exact)
    : "0";
  const formulaRules: FormulaRule[] = [
    {
      label: "基础天气",
      text: "云层注入、活力基流和自动注入先汇成基础天气流速。",
      visible: true,
    },
    {
      label: "雨阶",
      text: `天气活力 ×(1+雨阶)，当前 ×${rainRankMultiplier.toFixed(exact ? 2 : 1)}。后续雨阶过载和凝雨法则会加入叠层。`,
      visible: state.rainRanks > 0,
    },
    {
      label: "水汽回响",
      text: "雨滴库存提高天气活力收益；深层水汽会增强这条库存回响。",
      visible: state.resources.droplets > 0 || state.upgrades.rootWake > 0 || state.upgrades.deepVapor > 0,
    },
    {
      label: "生产链",
      text: "云团 → 根系 → 雨滴逐层生产；雷云回流、雷暴上升和气压上升会共同放大这条链。",
      visible: state.upgrades.rootWake > 0 || state.upgrades.cloudBloom > 0 || state.upgrades.windEye > 0,
    },
    {
      label: "本轮培育",
      text: "天气增幅、厚云降雨、季风牵引和风暴记忆直接乘进基础天气收益。",
      visible: state.upgrades.weatherAmplifier > 0 || state.upgrades.heavyRain > 0 || state.upgrades.monsoonPull > 0 || state.upgrades.stormMemory > 0,
    },
    {
      label: "高空回响",
      text: "天气活力 ×10^(云核+气压+风暴+气候+心脏)。这些是跨层级的指数型推动。",
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
