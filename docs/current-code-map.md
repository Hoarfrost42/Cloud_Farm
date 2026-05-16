# Current Code Map

更新时间：2026-05-16

本文用于在初始化 git 前说明当前代码边界，避免旧实验文件干扰 v12 / v13 判断。

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

`scripts/simulate-ten-minute.mjs` 属于旧 v0 农场路线参考，不应作为天气反应堆平衡依据。

## 2. 当前编译边界

`tsconfig.app.json` 当前只检查：

```text
src/main.tsx
src/App.tsx
src/game/economy/**/*.ts
```

原因：

- 当前主线不使用旧 `src/ui/*`、`src/game/state/*`、`src/game/systems/*`、`src/phaser/*`。
- 旧路线仍可保留为参考，但不应继续影响 v12 / v13 的 typecheck 和构建判断。
- 后续物理归档旧文件时，应分批移动，并在每批后运行验证命令。

## 3. 旧路线残留

以下目录或文件当前视为旧路线残留或历史参考：

```text
src/ui/
src/data/
src/game/state/
src/game/systems/
src/game/entities/
src/game/GameCanvas.tsx
src/game/createPixiApp.ts
src/game/gameLoop.ts
src/game/sceneLayout.ts
src/game/assets/
src/phaser/
cloud_island_harness_development_manual (1).md
```

这些文件暂时不删除，避免在无 git 历史的情况下丢失上下文。进入 git 后再做物理归档，建议移动到：

```text
archive/legacy-v0-pixi-phaser/
```

## 4. v13 前推荐顺序

1. 初始化 git，并建立当前 v12 baseline。
2. 物理归档旧路线残留。
3. 改进模拟器策略与日志。
4. 修正第一次季风完整试玩中的真实问题。
5. 开始 v13 的 log-safe 数值层与主线里程碑表。

