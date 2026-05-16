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

`simulate-weather-strategies.mjs` 是当前 v12 调优主脚本，覆盖：

- `guided-human`：按当前 UI 目标理解购买；
- `roi-greedy-45s`：短线 ROI 熟练玩家；
- `roi-greedy-180s`：更长期 ROI 玩家；
- `comfort-first`：优先舒适和明确自动增长；
- `bad-but-plausible`：过度强化早期按钮、较晚补生产者链的低效路线。

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

## 4. v13 前推荐顺序

1. 改进模拟器策略与日志。
2. 修正第一次季风完整试玩中的真实问题。
3. 对 v12 第一季风前做小步调优。
4. 接入 v13 的 log-safe tick 与 `bestWeatherExp`。
5. 添加 v13 主线里程碑表。

## 5. v13 开发状态

已添加 `src/game/economy/logNumbers.ts`，提供 `log10Safe`、`pow10Clamped`、`logSumExp10` 等工具。

当前状态：

- 工具已导出；
- 尚未接入 `runTick()`；
- 尚未添加 `bestWeatherExp`；
- 尚未改变 v12 实际数值行为。
