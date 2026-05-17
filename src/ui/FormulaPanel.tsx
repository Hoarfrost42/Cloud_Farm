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

  return (
    <div className="formula-panel-classic">
      <section className="workbench-section formula-summary-card">
        <span className="section-kicker">回晴批注</span>
        <strong>天气活力/s = {formatLogRate(baseFormulaLog)} × 10^{layerBonuses.total.toFixed(exact ? 2 : 1)}</strong>
        <p>雨阶先把天气活力收益乘上自己的凝雨回响；云核、气压、风暴、气候和心脏再汇成高空回响。</p>
        <div className="formula-rule-list">
          <span><b>雨阶</b><em>天气活力 ×(1+雨阶)，当前 ×{rainRankMultiplier.toFixed(exact ? 2 : 1)}</em></span>
          <span><b>高空回响</b><em>天气活力 ×10^(云核+气压+风暴+气候+心脏)</em></span>
          <span><b>本轮培育</b><em>云层注入、活力基流、厚云降雨等先进入基础天气流速</em></span>
        </div>
      </section>

      <section className="workbench-section">
        <span className="section-kicker">高空回响</span>
        <div className="classic-resource-grid classic-resource-grid--compact">
          <div className="classic-resource-card"><span>云核</span><strong>+{layerBonuses.cloudCore.toFixed(1)}</strong></div>
          <div className="classic-resource-card"><span>气压</span><strong>+{layerBonuses.pressure.toFixed(1)}</strong></div>
          <div className="classic-resource-card"><span>风暴</span><strong>+{layerBonuses.storm.toFixed(1)}</strong></div>
          <div className="classic-resource-card"><span>气候</span><strong>+{layerBonuses.climate.toFixed(1)}</strong></div>
          <div className="classic-resource-card"><span>心脏</span><strong>+{layerBonuses.skyHeart.toFixed(1)}</strong></div>
        </div>
      </section>
    </div>
  );
}
