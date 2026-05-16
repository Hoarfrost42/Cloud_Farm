# Cloud Island / 天气反应堆 v13 lab

这里是 `Cloud Island / 云上小岛` 的天气反应堆实验仓库。当前主线已经从 v12 Formula C 推进到：

```text
v13 / Post-Monsoon Complete Slice
```

当前存档 key：

```text
cloud-island-weather-reactor-v13-complete-slice
```

当前 GitHub 仓库：

```text
https://github.com/Hoarfrost42/Cloud_Farm
```

## 当前事实源

优先阅读：

```text
docs/weather-reactor-v13-implementation-summary.md
docs/current-code-map.md
docs/README.md
```

旧 v12 文档仍保留为第一季风前公式、调参和决策历史。若旧文档与 v13 实现总表冲突，以 v13 实现总表为准。

## 当前游戏主线

当前是 React 文本化天气增量原型，主线结构为：

```text
点击云层注入天气活力
-> 购买本轮升级
-> 凝结雨阶
-> 第一次季风
-> 云核天赋压缩旧流程
-> 气压与风暴前线
-> 气候改写
-> 天空心脏脉冲
-> 1e308 终局
```

当前已接入：

- log-safe 天气活力结算。
- 雨阶、季风、风暴前线、气候改写、天空心脏 reset 链。
- 云核天赋、气压升级、风暴图谱、气候法则。
- 主线目标卡、公式摘要、买前/买后速率预览。
- 多策略模拟器，用于查看不同玩家路线是否卡死或过快。

暂未完成：

- 最终平衡曲线。
- 主动气候法则槽。
- 结局动画和统计面板。
- 视觉大改或 Pixi/Phaser 路线恢复。

## 技术栈

```text
Vite
React
TypeScript
CSS
localStorage
```

当前主线不使用后端、账号系统、3D 引擎、Redux、PixiJS 或 Phaser。旧 v0 农场路线、Pixi 画布路线、Phaser 伪 2.5D 实验已归档到：

```text
archive/legacy-v0-pixi-phaser/
```

这些内容只作历史参考，不属于当前 v13 主线。

## 目录结构

当前有效入口：

```text
src/main.tsx
src/App.tsx
src/styles/global.css
src/styles/app.css
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

当前主要模拟脚本：

```text
scripts/simulate-weather-strategies.mjs
```

旧脚本 `scripts/simulate-weather-reactor.mjs` 仍在仓库中，但不作为 v13 平衡验收口径。

## 本地运行

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

本地端口通常是：

```text
http://127.0.0.1:5190
```

如果端口被占用，Vite 会自动使用后续端口。

## 验收命令

每次改动后运行：

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

当前最新模拟基线记录在：

```text
docs/weather-reactor-v13-implementation-summary.md
```

## 当前调参状态

最新模拟显示 v13 全流程可以跑到 `1e308`，但曲线仍偏快，尤其季风后压缩较强。下一轮优先处理：

1. 中后期本轮升级无限堆叠成本。
2. 气压收益过高的问题。
3. 风暴胞、气候法则和天空心脏脉冲的指数贡献。
4. 第一季风后 5 分钟内旧流程是否被明显压缩。
5. 第一风暴前线前是否有明确进入新循环的体感。

## 开发原则

- 只在当前 lab 仓库内继续，不默认修改 `F:\Cloud_Farm`。
- 以 `docs/weather-reactor-v13-implementation-summary.md` 为当前实现事实源。
- 小步修改，避免一次性重构整套经济系统。
- 数值改动后必须跑模拟器。
- UI 显示口径、公式口径和文档口径要同步更新。
