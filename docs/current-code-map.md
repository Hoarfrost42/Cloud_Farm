# Current Code Map

更新时间：2026-05-16

本文说明当前代码边界，避免旧实验文件干扰 v12 / v13 判断。

## 1. 当前有效主线

当前可运行主线入口：

```text
src/main.tsx
src/App.tsx
```

当前经济内核：

```text
src/game/economy/
  constants.ts
  types.ts
  state.ts
  formulas.ts
  logNumbers.ts
  upgrades.ts
  resets.ts
  tick.ts
  format.ts
  index.ts
```

当前样式：

```text
src/styles/global.css
src/styles/app.css
```

当前模拟脚本：

```text
scripts/simulate-weather-strategies.mjs
scripts/simulate-weather-reactor.mjs
```

`simulate-weather-strategies.mjs` 是当前 v13 调优主脚本，覆盖：

- `guided-human`：按 UI 主线推进；
- `roi-greedy`：本轮升级按立即收益/成本挑选；
- `comfort-first`：优先自动化和保留升级；
- `bad-but-plausible`：偏爱显眼按钮、较晚补中层图谱。

`simulate-weather-reactor.mjs` 是旧的单路线脚本，尚未更新为 v13 验收口径；后续判断曲线时优先使用 `simulate-weather-strategies.mjs`。

旧 `simulate-ten-minute.mjs` 已归档到 `archive/legacy-v0-pixi-phaser/scripts/`，不应作为天气反应堆平衡依据。

## 2. 当前编译边界

`tsconfig.app.json` 当前只检查：

```text
src/main.tsx
src/App.tsx
src/game/economy/**/*.ts
```

原因：

- 当前主线不使用旧 `src/ui/*`、`src/game/state/*`、`src/game/systems/*`、`src/phaser/*`。
- 旧路线已移入 `archive/legacy-v0-pixi-phaser/`，不再影响 v12 / v13 的 typecheck 和构建判断。
- 后续如需恢复旧路线，应从归档目录显式恢复，不要默认接回主线。

## 3. 旧路线归档

以下目录或文件已从主线移入归档：

```text
archive/legacy-v0-pixi-phaser/src/ui/
archive/legacy-v0-pixi-phaser/src/data/
archive/legacy-v0-pixi-phaser/src/game/state/
archive/legacy-v0-pixi-phaser/src/game/systems/
archive/legacy-v0-pixi-phaser/src/game/entities/
archive/legacy-v0-pixi-phaser/src/game/GameCanvas.tsx
archive/legacy-v0-pixi-phaser/src/game/createPixiApp.ts
archive/legacy-v0-pixi-phaser/src/game/gameLoop.ts
archive/legacy-v0-pixi-phaser/src/game/sceneLayout.ts
archive/legacy-v0-pixi-phaser/src/game/assets/
archive/legacy-v0-pixi-phaser/src/phaser/
archive/legacy-v0-pixi-phaser/scripts/simulate-ten-minute.mjs
archive/legacy-v0-pixi-phaser/root/cloud_island_harness_development_manual (1).md
```

旧 art pass、layout debug、v0 交接、伪 2.5D 路线和旧技术说明也已归档到：

```text
archive/legacy-v0-pixi-phaser/docs/
```

## 4. v13 当前状态

当前主线已实现 v13 完整切片：

```text
雨阶 -> 季风 -> 风暴前线 -> 气候改写 -> 天空心脏
```

关键新增：

- `logNumbers.ts` 已接入 `runTick()`。
- `bestWeatherExp` 已加入状态，用于历史最高展示和终局进度。
- `MAINLINE_MILESTONES` 已取代旧的单季风目标增长。
- `resets.ts` 已包含雨阶、季风、风暴前线、气候改写、天空心脏脉冲。
- `upgrades.ts` 已包含云核天赋、气压升级、风暴图谱、气候法则。
- `App.tsx` 已接入 v13 UI、公式摘要和买前/买后速率预览。

最新交接文档：

```text
docs/weather-reactor-v13-implementation-summary.md
```

下一轮重点是调参，不是继续补大结构。
