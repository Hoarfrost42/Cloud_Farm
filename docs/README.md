# Weather Reactor 文档索引

更新时间：2026-05-16  
目录：`F:\Cloud_Farm_v12_lab`

本文用于判断当前应该读哪份文档，避免旧 v11/v12 资料和 v13 实现状态混用。

## 当前优先阅读顺序

1. `docs/weather-reactor-v13-implementation-summary.md`
   - 当前 v13 实现总表。
   - 记录已实现主线、关键公式口径、模拟结果和下一轮调参重点。
   - 当前最高优先级事实源。

2. `docs/current-code-map.md`
   - 当前有效代码边界。
   - 说明哪些目录属于主线，哪些旧路线已经归档。

3. `README.md`
   - 仓库入口说明。
   - 适合快速了解运行方式、目录结构和当前状态。

4. `AGENTS.md`
   - 给后续 Codex/代理的项目内工作准则。
   - 包含当前开发边界、验收命令和文档事实源。

## 历史与辅助文档

| 文档 | 当前用途 | 可信度说明 |
|---|---|---|
| `weather-reactor-v12-change-summary.md` | v12 Formula C 与第一季风前调参历史 | 只作 v12 历史；和 v13 冲突时以 v13 总表为准 |
| `weather-reactor-v12-lab-handoff.md` | v12 lab 初始交接记录 | 历史文档；不作为当前实现事实源 |
| `weather-reactor-external-discussion-brief.md` | 给外部 GPT 或数值设计讨论的简报 | 已更新到 v13 讨论口径 |
| `archive/legacy-v0-pixi-phaser/README.md` | 旧 v0/Pixi/Phaser 路线归档说明 | 只作历史参考 |

## 当前代码事实源

当前主线入口：

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

当前主模拟器：

```text
scripts/simulate-weather-strategies.mjs
```

## 当前版本口径

```text
版本：v13 / Post-Monsoon Complete Slice
存档 key：cloud-island-weather-reactor-v13-complete-slice
目标终局：1e308
主要验收：npm run typecheck / npm run build / npm run simulate:weather-strategies
```

## 文档维护规则

- 代码、公式、主线和模拟结果改变时，同步更新 `weather-reactor-v13-implementation-summary.md`。
- 文件结构或有效边界改变时，同步更新 `current-code-map.md`。
- 入口运行方式、版本口径或存档 key 改变时，同步更新根 `README.md`。
- 旧文档不要直接删除，先标注历史用途和最新替代文档。
