# Cloud Island / 天气反应堆 v12 lab

当前目录是 `Cloud Island / 天气反应堆` 的 v12 lab 试验田。

当前版本：

```text
Batch 1 / economy v12 lab formula C
```

当前存档 key：

```text
cloud-island-weather-reactor-v12-lab-formula-c
```

最重要的交接文档：

```text
docs/weather-reactor-v12-change-summary.md
```

## 当前主线代码

当前可运行主线是 React 文本化天气增量原型：

```text
src/main.tsx
src/App.tsx
src/styles/*
src/game/economy/*
scripts/simulate-weather-strategies.mjs
```

旧 v0 农场路线、Pixi 画布路线、Phaser 伪 2.5D 实验仍在仓库中，但不属于当前 v12 / v13 主线。当前 TypeScript 检查边界已收窄到主线入口与 `src/game/economy/*`。

## 常用命令

```bash
npm run dev
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

本地开发端口通常是：

```text
http://127.0.0.1:5190
```

## 当前开发原则

- 以 `docs/weather-reactor-v12-change-summary.md` 为当前事实源。
- 不直接回到旧农场 / 伪 2.5D 路线。
- v13 前先保持 v12 Formula C 可验证、可模拟、可回滚。
- 新改动先小步落地，再跑 typecheck、build、simulate。

