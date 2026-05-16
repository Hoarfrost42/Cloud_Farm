# Weather Reactor v13 实现总表

更新时间：2026-05-16  
目录：`F:\Cloud_Farm_v12_lab`  
当前版本：`v13 / Post-Monsoon Complete Slice`  
当前存档 key：`cloud-island-weather-reactor-v13-complete-slice`

本文记录当前 v13 代码现状。若本文与旧 v12 文档冲突，以本文为准；旧 v12 文档只作为第一季风前公式和调参历史参考。

相关入口文档：

```text
README.md
AGENTS.md
docs/README.md
docs/current-code-map.md
```

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
- 模拟器：`guided-human`、`patient-multiplier-human`、`roi-greedy`、`comfort-first`、`bad-but-plausible`、`new-player-visible` 全流程输出，并带 balance gates、阶段快照和最高升级等级报告。

暂未做：

- 主动气候法则槽。
- 结局动画或统计面板。
- 最终平衡曲线。
- 视觉大改或 Pixi/Phaser 恢复。
- UI 组件拆分，当前主要仍集中在 `src/App.tsx`。

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

显示与样式：

```text
src/App.tsx
src/styles/global.css
src/styles/app.css
src/game/economy/format.ts
```

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

最新结果（P0-C 后）：

| 策略 | 天空心脏时间 | 第一次季风 | 第一风暴前线 | 第一次气候改写 | 静默告警 |
|---|---:|---:|---:|---:|---:|
| guided-human | 1:06:14 | 33:34 | 46:28 | 1:00:03 | 0 |
| patient-multiplier-human | 2:11:12 | 45:29 | 1:18:14 | 2:08:27 | 0 |
| roi-greedy | 49:13 | 30:57 | 41:57 | 47:04 | 0 |
| comfort-first | 2:18:10 | 35:04 | 1:06:05 | 2:04:21 | 0 |
| bad-but-plausible | 1:23:16 | 35:06 | 1:09:39 | 1:17:16 | 0 |
| new-player-visible | 未达成 | 35:04 | 1:02:41 | 未达成 | 36 |

结论：

- 全流程结构已经能跑通到 `1e308`。
- P0-C 后，`patient-multiplier-human` 已进入 2-3.5 小时 hard gate，且最长静默约 `3:55`。
- `comfort-first` 约 `2:18:10`，可作为慢一点但不枯燥的辅助参考。
- `patient-multiplier-human` 的第一季风前节奏较接近人工试玩：第 10 雨阶 `41:41`，第一次季风 `45:29`。
- `guided-human` 和 `roi-greedy` 仍明显偏快，保留为 warning 诊断路线，不再作为本轮 hard gate。
- `new-player-visible` 仍会在第二风暴前线附近长期静默，后续需要通过 UI 引导、升级排序或可见目标提示处理。

## 4.1 P0-B 第一轮调参

已改：

```text
monsoonPull.costGrowth: 10 -> 100
getMonsoonPullMultiplier(): eyeWall 后 1000 -> 300
SKY_HEART_PULSE_BONUS_EXPONENTS: [32, 32, 16] -> [24, 20, 10]
```

效果：

- `monsoonPull` 最高等级明显下降，例如 `guided-human` 从约 Lv.291 降到 Lv.60。
- 天空心脏脉冲总指数从 `+80 orders` 降到 `+54 orders`。
- 终局仍过快，说明单独压季风牵引和 sky pulse 不足以解决中后期压缩。

## 4.2 P0-C 后季风曲线收束

已改：

```text
MAX_PRESSURE_EXPONENT_BONUS: 30 -> 12
MAX_STORM_EXPONENT_BONUS: 85 -> 48
MAX_CLIMATE_EXPONENT_BONUS: 130 -> 70
pressure / storm / climate 指数公式系数整体下调
weatherAmplifier 风暴后有效 costGrowth: 500
heavyRain 风暴后有效 costGrowth: 500
monsoonPull 风暴后有效 costGrowth: 400000
后期本轮升级 costGrowth: 1000 -> 10000
SKY_HEART_PULSE_BONUS_EXPONENTS: [24, 20, 10] -> [15, 12, 7]
sky_pulse targetExp: 295 / 303 / 306
```

模拟 gate 口径：

- `patient-multiplier-human` 是当前 hard gate，代表用户描述的短等关键倍率策略。
- `guided-human` 当前更像“高频可见顺序购买”压力路线，过快时只作为 warning。
- `roi-greedy` 继续只作为漏洞探针，不阻断调参提交。

效果：

- patient 终局从 P0-B 的约 `1:22` 拉到 `2:11`。
- comfort 终局从约 `1:18` 拉到 `2:18`。
- 第一次季风前节奏基本未被破坏。
- guided / ROI 仍能暴露熟练路线过快的问题，这是下一轮策略与 UI 引导需要继续看的风险。

## 5. 下一轮调参重点

优先顺序：

1. 继续校准 `guided-human` 与 `roi-greedy` 的过快路线，优先判断是策略过优还是数值漏洞。
2. 处理 `new-player-visible` 在第二风暴前线前后的长静默，优先从 UI 引导和推荐目标入手。
3. 检查气压层是否需要更清楚的“当前轮直接推进”和“长期压力投资”文案。
4. 保持第一季风前小步调参，不要再重写 v12 Formula C。

## 6. 验收命令

每次改动后继续跑：

```text
npm run typecheck
npm run build
npm run simulate:weather-strategies
```
