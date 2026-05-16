# 给 GPT Pro 的外部讨论简报

更新时间：2026-05-16  
项目：Cloud Island / 云上小岛  
仓库：https://github.com/Hoarfrost42/Cloud_Farm
当前方向：天气主题增量游戏  
当前版本：`v13 / Post-Monsoon Complete Slice`

## 0. 可直接复制给 GPT Pro 的提示词

请深度分析这个 GitHub 仓库：

```text
https://github.com/Hoarfrost42/Cloud_Farm
```

这是一个周末内希望推进上线的天气主题增量游戏原型，当前核心目标不是继续扩写玩法，而是判断现有 v13 全流程到 `1e308` 的数值曲线、风暴前线设计和 UI 信息结构是否足够健康。

请优先阅读：

```text
README.md
docs/README.md
docs/current-code-map.md
docs/weather-reactor-v13-implementation-summary.md
docs/weather-reactor-simulation-strategy-notes.md
docs/weather-reactor-test-strategy.md
scripts/simulate-weather-strategies.mjs
src/game/economy/constants.ts
src/game/economy/formulas.ts
src/game/economy/upgrades.ts
src/game/economy/resets.ts
src/game/economy/tick.ts
src/App.tsx
src/styles/app.css
```

请不要把旧 v11、旧 v12、formula A/B 或归档 Pixi/Phaser 路线当成当前现状。当前事实源以 `docs/weather-reactor-v13-implementation-summary.md` 为准。

我希望你输出一份可执行开发文档，要求精确到代码层：

1. 第一风暴前线之后是否应该 redesign，尤其是 `frontMemory / thunderUpdraft / rainOverload` 这组是否已经变成隐藏最优解。
2. 如果 redesign，给出推荐结构：哪些应改成主干、哪些应保留为可选分支、第二风暴前线应该要求什么条件。
3. 按代码文件和函数指出该改哪里，例如 `constants.ts` 的主线目标、`formulas.ts` 的指数项、`upgrades.ts` 的升级定义、`resets.ts` 的 reset 条件与收益、`simulate-weather-strategies.mjs` 的策略和 gate。
4. 给出 2-3 小时终局目标下的数值建议，不要只说“降低一点”，请给出候选数值区间、理由和预期模拟结果。
5. 给出模拟器应新增的策略、指标和输出字段，帮助在缺少人工试玩的情况下判断曲线。
6. 给出 UI 重构建议，重点解决信息密度过高、首屏压力大、哪些内容应该放进切换页/弹窗/详情，而不是简单折叠。
7. 给出能缓解“只是点和等”的玩法/表现建议，例如空岛天气生态随阶段变化、Mood 系统、风暴/气候视觉反馈，但要说明如何不破坏当前上线范围。

请最终输出一份按 P0/P1/P2 排序的周末上线行动计划，每个行动项包含：

```text
问题
证据
建议改法
涉及文件/函数
验收方式
风险
```

## 1. 当前主线

```text
点击云层注入天气活力
-> 买本轮升级
-> 凝结雨阶
-> 第一次季风
-> 云核天赋
-> 气压升级
-> 风暴前线
-> 风暴图谱
-> 气候改写
-> 气候法则
-> 天空心脏脉冲
-> 1e308 终局
```

当前是 React + TypeScript + CSS 的文本化增量原型。当前主线不使用 PixiJS/Phaser 渲染；旧路线已归档。

## 2. 当前核心公式

天气活力/s：

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

关键实现口径：

- 雨滴乘区：`1 + log10(1 + droplets / 1000) * 8`，`deepVapor` 每级额外提高系数。
- 生产者存量乘区：`1 + log10(1 + amount / 1000) * 5`，`deepRootLaw` 提高系数。
- 雨阶基础倍率：`1 + rainRanks`。
- `weatherAmplifier`: `4^level`。
- `heavyRain`: `3^level`。
- `monsoonPull`: 默认 `100^level`，有 `eyeWall` 后 `300^level`。
- `cloudTouch` 当前上限 6。
- `autoDrizzle` 当前上限 100。
- 第一季风目标：`1e20`。
- 终局目标：`1e308`。

## 3. 当前主线目标

主线目标在 `src/game/economy/constants.ts` 的 `MAINLINE_MILESTONES`：

```text
第一次季风: 1e20, 10 雨阶
第二次季风: 1e28, 11 雨阶
第三次季风: 1e40, 12 雨阶
第四次季风: 1e55, 13 雨阶
第一风暴前线: 1e70, 14 雨阶, 当前前线 4 次季风
第五次季风: 1e90, 14 雨阶
第六次季风: 1e120, 15 雨阶
第二风暴前线: 1e145, 16 雨阶, 当前前线 2 次季风
第七次季风: 1e170, 16 雨阶
第八次季风: 1e195, 17 雨阶
第一次气候改写: 1e220, 需要 2 风暴前线
第九次季风: 1e240, 18 雨阶
第三风暴前线: 1e265, 20 雨阶
第二次气候改写: 1e276, 需要 3 风暴前线
天空心脏脉冲: 1e295 / 1e303 / 1e306
终局: 1e308
```

## 4. 当前模拟策略与最新基线

命令：

```bash
npm run simulate:weather-strategies
```

当前已做一个重要诊断实验：所有模拟策略的风暴图谱顺序临时统一为基础最优解：

```text
frontMemory -> thunderUpdraft -> rainOverload -> stormBatch -> windEyeRelic -> frontScar -> stormPrism
```

这样做的目的是验证“第一风暴后最优解是否无后效”。结果显示：它不是无后效选择，而是长期路线分叉。

最新模拟摘要：

| 策略 | 天空心脏时间 | 第一次季风 | 第一风暴前线 | 第二风暴前线 | 第三风暴前线 | 第一次气候改写 |
|---|---:|---:|---:|---:|---:|---:|
| guided-human | 1:04:27 | 33:20 | 46:05 | 51:37 | 1:01:22 | 56:39 |
| patient-multiplier-human | 2:09:09 | 36:22 | 1:19:05 | 1:48:50 | 2:07:47 | 2:01:09 |
| comfort-first | 1:33:00 | 34:29 | 1:05:04 | 1:12:20 | 1:26:14 | 1:20:09 |
| bad-but-plausible | 1:37:11 | 34:31 | 1:22:20 | 1:27:13 | 1:34:25 | 1:31:53 |
| new-player-visible | 1:25:49 | 34:26 | 1:01:29 | 1:08:08 | 1:20:01 | 1:14:45 |
| roi-greedy | 未达成 | 30:51 | 未达成 | 未达成 | 未达成 | 未达成 |

对比前一轮非统一风暴顺序：

```text
patient: 2:46:19 -> 2:09:09
comfort: 2:14:59 -> 1:33:00
bad-but-plausible: 2:18:51 -> 1:37:11
new-player-visible: 1:25:49 -> 1:25:49
```

结论：

- 第一风暴后的风暴图谱顺序会带来 30-40 分钟级别差异。
- `frontMemory + thunderUpdraft + rainOverload` 当前像隐藏必选答案。
- 如果保留为自由选择，会接近“研究树找最优解，找不到就卡”的问题。
- 用户倾向：可以考虑把第一风暴后的必需最优解做成显式主干，所有策略都默认获得或必须完成，再拉长第二风暴后的曲线到 2-3 小时。

## 5. 当前最重要风险

### 5.1 风暴图谱存在隐藏最优解

第一风暴后通常只有 4 个风暴胞。不同花法差距极大：

```text
方案 A:
frontMemory 1 + rainOverload 1 + rainOverload 2 = 4
结果：第二风暴可能 46-61 分钟后

方案 B:
frontMemory 1 + thunderUpdraft 1 + rainOverload 1 = 4
结果：第二风暴可能 6-30 分钟后
```

`thunderUpdraft` 当前同时给：

```text
生产者公共乘区 +3 orders/级
风暴指数奖励 +2.2 orders/级
```

因此它既是生产者链推进，又是直接指数层推进。

### 5.2 风暴指数层可能过强

`formulas.ts` 中：

```text
storm =
  1.6 * totalStormCells
  + 2.2 * stormUpgrades.thunderUpdraft
  + 3.5 * stormUpgrades.stormPrism
  + min(12, 0.035 * totalStormCells * totalCloudCores)
```

当前上限 `MAX_STORM_EXPONENT_BONUS = 48`。

到 18 总风暴胞和 54 总云核附近时，风暴层很容易接近：

```text
1.6 * 18 = +28.8
thunderUpdraft x3 = +6.6
交叉项封顶 = +12
合计约 +47.4 orders
```

这会把第二/第三风暴后的气候阶段明显压短。

### 5.3 气候层可能进一步压缩终局

`formulas.ts` 中：

```text
climate =
  3 * totalClimateThreads
  + 3 * climateEcho
  + 3 * condensationLaw
  + 4 * deepRootLaw
  + 4 * stormWeaving
  + ...
```

第一次气候改写通常给 5 织线，仅 `totalClimateThreads` 就是 `+15 orders`。第二次后通常到 10 织线，约 `+30 orders`。

### 5.4 天空心脏脉冲近似终局确认按钮

天空心脏脉冲奖励：

```text
+15 / +12 / +7 orders
总计 +34 orders
```

一旦第一个脉冲可买，后两个和终局通常会很快连上。需要判断这是期望的终局冲刺，还是过度压缩。

## 6. 用户当前设计倾向

用户不希望出现鲨鱼增量研究树那种“必须找到最优解，否则过不去”的玩法。

当前倾向方案：

```text
第一风暴后，把必需的最优解变成显式主干。
所有策略都默认完成这条主干。
然后以这个共同基线重新拉长第二风暴后的曲线。
```

可讨论结构：

```text
风暴主干：必经、明确、用于开启第二风暴
风暴图谱：可选分支、提供风格差异，不能决定能不能过关
```

候选第二风暴前线条件：

```text
- 完成 2 次当前前线季风
- 达到 16 雨阶
- 完成风暴主干 3/3:
  - 前线记忆
  - 雷暴上升
  - 雨阶过载
```

希望 GPT Pro 判断：

- 这是否是合理 redesign。
- 哪些应自动点亮，哪些应玩家手动购买。
- 如果改成主干，风暴胞是否还应该作为资源。
- 原风暴图谱分支如何改成“有趣但非硬门槛”的选择。

## 7. UI 与体验问题

当前 UI 功能完整但信息密度高。用户倾向不是简单折叠模块，而是：

- 当前环节不重要的信息可以放进弹窗、切换页、详情页。
- 首屏保留当前目标、核心资源、可行动作和关键反馈。
- 公式、层级资源、完整图谱、详细模拟口径可以放到非首屏。
- Mood/生态系统纯粹用于让玩家看着舒心、有互动感，不要求强经济深度。

希望 GPT Pro 输出 UI 重构方向，并具体到：

```text
哪些组件留在首屏
哪些内容移动到 tabs/modal/detail
src/App.tsx 中应如何拆组件
src/styles/app.css 中应如何重构布局
如何让空岛天气生态表达玩家阶段
```

## 8. 希望 GPT Pro 最终输出

请输出一份开发行动文档，按 P0/P1/P2 排序。每个行动项需要包含：

```text
问题
证据
建议改法
涉及文件/函数
建议数值或代码结构
验收命令/模拟指标
风险
```

优先回答：

1. 第一风暴后是否应主干化。
2. 第二风暴后曲线如何拉回 2-3 小时。
3. 风暴/气候/天空心脏哪些指数项该降，降到什么区间。
4. 模拟器如何增强，才能替代大量人工试玩。
5. UI 怎样降噪，并让玩家感到空岛生态在成长。

## 9. 当前验收命令

每次改动后跑：

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

当前主模拟器：

```text
scripts/simulate-weather-strategies.mjs
```

当前实现总表：

```text
docs/weather-reactor-v13-implementation-summary.md
```
