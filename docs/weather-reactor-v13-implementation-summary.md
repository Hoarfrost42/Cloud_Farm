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

最新结果（P0-F 统一风暴主干诊断后）：

| 策略 | 天空心脏时间 | 第一次季风 | 第一风暴前线 | 第一次气候改写 | 静默告警 |
|---|---:|---:|---:|---:|---:|
| guided-human | 1:04:27 | 33:20 | 46:05 | 56:39 | 0 |
| patient-multiplier-human | 2:09:09 | 36:22 | 1:19:05 | 2:01:09 | 0 |
| roi-greedy | 未达成 | 30:51 | 未达成 | 未达成 | 61 |
| comfort-first | 1:33:00 | 34:29 | 1:05:04 | 1:20:09 | 0 |
| bad-but-plausible | 1:37:11 | 34:31 | 1:22:20 | 1:31:53 | 0 |
| new-player-visible | 1:25:49 | 34:26 | 1:01:29 | 1:14:45 | 0 |

结论：

- 全流程结构已经能跑通到 `1e308`。
- P0-F 后，`patient-multiplier-human` 仍在 2-3.5 小时 hard gate 内，但从 `2:46:19` 被压到 `2:09:09`。
- `comfort-first` 和 `bad-but-plausible` 在统一风暴主干后都被压到 1.5 小时左右，说明第一风暴后的主干顺序不是无后效的局部选择。
- `patient-multiplier-human` 的第一季风前节奏较接近人工试玩：第 10 雨阶 `34:29`，第一次季风 `36:22`。
- `bad-but-plausible` 从约 `1:23` 拉到约 `2:19`，说明点击/自动点击爆炸已被明显压住。
- `guided-human` 仍明显偏快，保留为 warning 诊断路线，不再作为本轮 hard gate。
- `roi-greedy` 当前会在第一次季风后失速，继续只作为漏洞探针，不作为正常路线。
- `new-player-visible` 的第二风暴前线卡死已被定位到风暴层购买顺序；先买 `thunderUpdraft` 后可跑通，但终局会提前到约 `1:25:49`，因此现在作为“新手引导过强 / 风暴后曲线过薄”的 warning 路线。

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

## 4.3 P0-D 点击爆炸和云核 surplus 修正

已改：

```text
cloudTouch maxLevel: 6
autoDrizzle maxLevel: 100
第一风暴前 cloud core gain: 禁用 surplus jackpot，固定为 4 / 4 / 4 / 5
getClimateThreadGain(): first/later base 5/7 -> 4/5，cap 16 -> 10，surplus interval 25 -> 35 orders
getClimateLawExponentBonus(): totalClimateThreads 与 climateEcho 每点 4 orders -> 3 orders
```

重要实验结论：

- 直接把第一风暴前云核改成 `4 / 4 / 6 / 8` 会触发永久天赋成本断点，导致 `patient-multiplier-human` 在第二风暴前线前大幅失速。
- `4 / 4 / 5 / 6` 和 `4 / 4 / 4 / 6` 也会带来类似路线分叉。
- 当前先保守采用 `4 / 4 / 4 / 5`，核心目标是禁掉 `bad-but-plausible` 通过拖超额天气活力获得 `+24 云核` 的 jackpot。

效果：

- `bad-but-plausible` 从约 `1:23:16` 拉到约 `2:18:51`。
- `patient-multiplier-human` 从约 `2:36:00` 拉到约 `2:46:19`，仍在 2-3 小时可接受区间。
- 第一次季风前曲线基本未破坏：patient 第 10 雨阶 `34:29`，第一次季风 `36:22`。
- `guided-human` 仍过快，说明后续应重点检查 guided 的购买顺序是否过于接近最优，以及 pressure/storm 层是否还有过强路线。

## 4.4 P0-E 策略诊断：guided 过快与 new-player 卡死

已改：

```text
new-player-visible:
  windEyeMemory 提前到 livingSoil 之前
  stormOrder: frontMemory -> thunderUpdraft -> rainOverload -> stormBatch ...
  resetRainRankBeforeRunUpgrades: true

simulate gate:
  new-player-visible 增加 ending too fast warning，下限 2:00:00
```

实验结论：

- `new-player-visible` 原先卡在第二风暴前线，核心原因是第一次风暴前线只拿到 4 个风暴胞，却先买 `frontMemory + rainOverload x2`，没有买到 `thunderUpdraft`。
- 将 `thunderUpdraft` 提前后，新手路线可以从卡死变为跑通，最长静默降到约 `0:39`。
- 但同一修正会让 `new-player-visible` 在约 `1:25:49` 结束，明显快于 `patient-multiplier-human` 的 `2:46:19`。
- 这说明第二风暴前线后的曲线非常依赖风暴层升级顺序；`thunderUpdraft` 一旦早买，风暴后到气候改写、天空心脏的压缩过强。
- `guided-human` 仍为 `1:07:55`，不是当前可信的人类基准，更像“强引导 / 压力路线”。后续若要让它代表推荐路线，需要重写其决策，而不是简单调小等待或 reset 顺序。

## 4.5 P0-F 统一风暴主干诊断

已改：

```text
所有模拟策略的 stormOrder 暂时统一为：
frontMemory -> thunderUpdraft -> rainOverload -> stormBatch -> windEyeRelic -> frontScar -> stormPrism

模拟输出中的 log 数值显示：
从 1e11.88/s 改为 7.6e11/s 这类普通科学计数法。
```

实验目的：

```text
验证“第一风暴后按最优解购买”是否只是无后效性的局部优化。
```

实验结果：

| 策略 | P0-E 终局 | P0-F 统一风暴主干后 | 变化 |
|---|---:|---:|---:|
| patient-multiplier-human | 2:46:19 | 2:09:09 | 快 37 分 |
| comfort-first | 2:14:59 | 1:33:00 | 快 42 分 |
| bad-but-plausible | 2:18:51 | 1:37:11 | 快 41 分 |
| new-player-visible | 1:25:49 | 1:25:49 | 基本不变 |
| guided-human | 1:07:55 | 1:04:27 | 小幅变快 |

结论：

- 第一风暴后的 `frontMemory / thunderUpdraft / rainOverload` 不是无后效选择，而是长期路线分叉。
- 当前自由风暴图谱存在隐藏最优解风险；玩家若没有优先买到 `thunderUpdraft`，会被惩罚几十分钟。
- 用户倾向把第一风暴后的必需最优解改成显式主干或第二风暴前置条件，再按所有玩家共同拥有该主干的基线重新拉长第二风暴后的曲线。
- 下一步优先讨论第一风暴后的 redesign，而不是继续在旧风暴图谱结构里微调。

## 5. 下一轮调参重点

优先顺序：

1. 设计第一风暴后的风暴主干，消除隐藏最优解。
2. 以所有策略都完成风暴主干为共同基线，重新拉长第二风暴后到终局的曲线。
3. 优先检查 `thunderUpdraft`、风暴层生产者 orders、风暴胞指数、气候织线指数和天空心脏脉冲。
4. 检查气压层是否需要更清楚的“当前轮直接推进”和“长期压力投资”文案。
5. 保持第一季风前小步调参，不要再重写 v12 Formula C。

## 6. 验收命令

每次改动后继续跑：

```text
npm run typecheck
npm run build
npm run simulate:weather-strategies
```
