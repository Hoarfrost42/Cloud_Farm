# Weather Reactor v12 Lab Handoff

更新时间：2026-05-16  
目录：`F:\Cloud_Farm_v12_lab`

## 当前状态

本文是历史交接记录。当前主线已经进入：

```text
v13 / Post-Monsoon Complete Slice
```

最新实现状态请阅读：

```text
docs/weather-reactor-v13-implementation-summary.md
```

文档索引请阅读：

```text
docs/README.md
```

## v12 Lab 原目标

v12 lab 最初用于独立验证天气主题增量循环，不污染主项目 `F:\Cloud_Farm`。

当时目标循环：

```text
点击云层
-> 天气活力
-> 本轮升级
-> 凝结雨阶
-> 生产者链
-> 10 雨阶
-> 第一次季风
-> 云核天赋压缩旧流程
```

v12 最终稳定参考版本为：

```text
Batch 1 / economy v12 lab formula C
cloud-island-weather-reactor-v12-lab-formula-c
```

v12 详细历史记录保留在：

```text
docs/weather-reactor-v12-change-summary.md
```

## 已被 v13 取代的内容

以下信息不再作为当前事实源：

- v12 存档 key。
- v12 只到第一次季风或小品天空心脏的目标。
- v12 模拟结果。
- formula A/B/C 的中间公式试验。
- v11、旧雨滴公式、旧云核收益公式。
- Pixi/Phaser/v0 农场路线。

## 当前 v13 接续内容

v13 在 v12 基础上继续实现：

```text
第一次季风
-> 多次季风
-> 风暴前线
-> 气候改写
-> 天空心脏脉冲
-> 1e308 终局
```

当前重要新增：

- `src/game/economy/logNumbers.ts` 接入 log-safe 结算。
- `MAINLINE_MILESTONES` 管理 `1e20` 到 `1e308` 的主线目标。
- `resets.ts` 包含雨阶、季风、风暴前线、气候改写和天空心脏脉冲。
- `upgrades.ts` 包含云核天赋、气压升级、风暴图谱、气候法则。
- `simulate-weather-strategies.mjs` 覆盖四类策略并输出全流程时间。

## 继续开发提醒

- 若问题发生在第一次季风前，可参考 `weather-reactor-v12-change-summary.md` 的 Formula C 历史。
- 若问题涉及季风后、风暴、气候或天空心脏，以 v13 实现总表和当前代码为准。
- 不要再用旧 v12 handoff 中的模拟结果判断当前曲线。
