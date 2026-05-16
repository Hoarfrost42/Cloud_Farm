# Weather Reactor v13 实现总表

更新时间：2026-05-16  
目录：`F:\Cloud_Farm_v12_lab`  
当前版本：`v13 / Post-Monsoon Complete Slice`  
当前存档 key：`cloud-island-weather-reactor-v13-complete-slice`

本文记录当前 v13 代码现状。若本文与旧 v12 文档冲突，以本文为准；旧 v12 文档只作为第一季风前公式和调参历史参考。

## 1. 当前实现范围

已按 v13 完整设计接入主线结构：

```text
天气活力
-> 雨阶
-> 季风
-> 风暴前线
-> 气候改写
-> 天空心脏脉冲
-> 1e308 终局
```

当前完成项：

- log-safe 天气活力结算：`log10Safe`、`pow10Clamped`、`logSumExp10`。
- 主线里程碑表：从第一次季风 `1e20` 到天空心脏 `1e308`。
- 雨阶上限扩展：第一季风前 10，季风后 14，风暴后 20，气候后 25。
- 季风 reset：云核、气压、本前线季风计数。
- 云核天赋：初雨记忆、自动凝雨、批量凝雨、风眼记忆、云核棱镜、回环季风等。
- 气压系统：当前前线临时资源与临时升级。
- 风暴前线：风暴胞、风暴图谱、前线 reset。
- 气候改写：气候织线、气候法则、两次气候改写。
- 天空心脏：三档脉冲与 `1e308` 完成判断。
- UI：主线目标、层级资源、公式摘要、买前/买后速率预览。
- 模拟器：`guided-human`、`roi-greedy`、`comfort-first`、`bad-but-plausible` 全流程输出。

暂未做：

- 主动气候法则槽。
- 结局动画或统计面板。
- 最终平衡曲线。
- 视觉大改或 Pixi/Phaser 恢复。

## 2. 当前代码边界

主入口：

```text
src/main.tsx
src/App.tsx
```

经济内核：

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

当前主模拟脚本：

```text
scripts/simulate-weather-strategies.mjs
```

旧 `scripts/simulate-weather-reactor.mjs` 仍在仓库中，但没有更新为 v13 验收口径；后续判断曲线时优先使用 `simulate-weather-strategies.mjs`。

## 3. 关键实现口径

天气活力每秒收入：

```text
weather/s = baseFormula * 10 ^ layerBonus
```

其中：

```text
baseFormula =
  活力基流
  * 雨滴 log 乘区
  * 雨阶乘区
  * 天气增幅
  * 厚云降雨
  * 季风牵引
  * 风暴记忆
  + 自动细雨
```

```text
layerBonus =
  云核指数奖励
  + 气压指数奖励
  + 风暴胞指数奖励
  + 气候法则指数奖励
  + 天空心脏脉冲指数奖励
```

重要修正：

- reset 条件读取当前 `resources.weather` 的 log，不再用跨 reset 保留的 `bestWeatherExp` 透支后续目标。
- `bestWeatherExp` 当前用于历史最高展示和天空心脏进度。
- 手动雨阶按钮仍然一次只凝结 1 阶。
- 自动凝雨在拥有批量凝雨或暴雨批处理后，可在 tick 内跨越多个已解锁雨阶。
- 第一风暴前线后最大雨阶直接提升到 20，符合 v13 文档。
- UI 的“实测/s”只跟随公式被动速率，不再用天气活力差值采样，因此不会被手动点击或云层自触的 2 秒脉冲抬高。
- 云核本身不再提供隐藏线性倍率或隐藏指数倍率；季风后的早期速率只由基流、雨滴、雨阶和显式升级决定。

## 4. 当前模拟结果

命令：

```text
npm run simulate:weather-strategies
```

最新结果：

| 策略 | 天空心脏时间 | 第一次季风 | 第一风暴前线 | 第一次气候改写 | 静默告警 |
|---|---:|---:|---:|---:|---:|
| guided-human | 50:07 | 33:34 | 45:17 | 48:21 | 0 |
| roi-greedy | 45:47 | 30:57 | 41:41 | 44:12 | 0 |
| comfort-first | 1:18:30 | 35:06 | 1:04:20 | 1:13:40 | 0 |
| bad-but-plausible | 1:18:45 | 35:06 | 1:08:34 | 1:13:44 | 0 |

结论：

- 全流程结构已经能跑通到 `1e308`。
- 当前曲线明显偏快，尤其季风后层级压缩过强。
- 这不是阻塞实现的问题，但下一轮调参应优先处理。

## 5. 下一轮调参重点

优先顺序：

1. 限制或抬高中后期本轮升级的无限堆叠成本，尤其 `monsoonPull`、`weatherAmplifier`、`dropletSeed`。
2. 检查气压收益，当前第一风暴前线后个别季风可获得过高气压。
3. 降低风暴胞与气候法则的指数贡献，或提高 `1e115 -> 1e230` 阶段目标的实际阻力。
4. 天空心脏三档脉冲可以保留，但应避免第二次气候改写后 1 分钟内直接完成。
5. 保持第一季风前小步调参，不要再重写 v12 Formula C。

## 6. 验收命令

每次改动后继续跑：

```text
npm run typecheck
npm run build
npm run simulate:weather-strategies
```
