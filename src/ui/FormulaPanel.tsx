import {
  calculateWeatherPerSecondLog,
  formatRate,
  getLayerBonusBreakdown,
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
  const weatherRateLog = calculateWeatherPerSecondLog(state);
  const baseFormulaLog = Number.isFinite(weatherRateLog) ? weatherRateLog - layerBonuses.total : Number.NEGATIVE_INFINITY;
  const formatLogRate = (logValue: number) => Number.isFinite(logValue)
    ? formatRate(pow10Clamped(logValue), exact)
    : "0";

  return (
    <div className="formula-panel-classic">
      <section className="workbench-section formula-summary-card">
        <span className="section-kicker">公式摘要</span>
        <strong>天气活力/s = {formatLogRate(baseFormulaLog)} × 10^{layerBonuses.total.toFixed(exact ? 2 : 1)}</strong>
        <p>公式页保留给调参与深度玩家，主界面只展示必要资源与当前目标。</p>
      </section>

      <section className="workbench-section">
        <span className="section-kicker">层级指数</span>
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

