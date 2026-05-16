# Weekend Launch Gameplay Adjustment Plan v2

更新时间：2026-05-16  
适用版本：`v13 / Post-Monsoon Complete Slice`  
参考来源：`E:\Downloads_FromWeb\weekend-launch-action-plan-v2.md`、当前仓库模拟输出、用户试玩反馈  
当前焦点：第一风暴前线，以及第一风暴到第二风暴之间的节奏和决策

本文是项目执行版，不是外部 v2 计划的全文复刻。它只保留当前最适合 Cloud Island 的部分，并把后续工作收束为小批次调游戏性。

## 0. 当前判断

第一季风前已经基本可保留。人工试玩约 33 分钟到 10 雨阶，预估 35-37 分钟第一次季风；模拟中的 `patient-multiplier-human` 约 36 分钟第一次季风。这个阶段仍可微调，但不是当前最大风险。

当前最大风险集中在第一风暴之后：

```text
第一次风暴给 4 风暴胞。
frontMemory Lv.1 + thunderUpdraft Lv.1 + rainOverload Lv.1 正好消耗 4。
这个组合既是最优路线，也像必选主线。
玩家如果不知道，可能被惩罚几十分钟。
玩家如果知道，后半段又可能被压得太快。
```

所以当前优先级是：

1. 把第一风暴后的隐藏最优解显式化。
2. 让第一风暴到第二风暴之间成为一个可感知阶段，而不是 5-8 分钟跳过。
3. 先用模拟器观察 Storm1 -> Storm2 的阶段时长，再动更后面的气候和天空心脏。

## 1. Game-design audit

### Current feature state

已经存在：

- 季风循环。
- 风暴前线 reset。
- 风暴胞资源。
- 风暴图谱升级。
- 第二风暴前线、第三风暴前线、气候改写和终局。

当前可玩但有问题：

- 第一风暴后，风暴图谱看似自由分配，实际存在隐藏主干。
- `thunderUpdraft` 同时给生产者 orders 和风暴指数 orders，职责太重。
- 部分策略在第一风暴后到第二风暴只用约 5-8 分钟，阶段存在感不足。

### Player experience problem

玩家完成第一风暴后，理应感到：

```text
我打开了新天气层。
旧循环被风暴压缩了。
我需要跑两轮季风，把风暴推向第二前线。
```

现在的问题是：

- 不知道主干组合的玩家像是在做研究树答案题。
- 知道主干组合的玩家很快跳过第二风暴准备期。
- 风暴图谱目前更像通关钥匙，不像有趣分支。

### Intended experience

第一风暴后的 20-35 分钟内，玩家应该经历：

```text
风暴主干被点亮
-> 旧季风流程明显压缩
-> 重新冲到 14-16 雨阶
-> 完成第 5 / 第 6 次季风
-> 累积气压和少量可选风暴分支
-> 第二风暴前线
```

这个阶段不需要变成复杂研究树。玩家主要决策应该是：

- 要不要补气压升级。
- 要不要继续买本轮关键倍率。
- 风暴分支是偏压缩、偏自动化、偏生产者，还是偏终局指数。

第一版不追求分支完全平衡，只先避免“买错被坑”和“买对秒跳”。

## 2. 当前模拟基线

当前统一风暴主干顺序后的基线：

| 策略 | 第一风暴 | 第二风暴 | Storm1 -> Storm2 | 评价 |
|---|---:|---:|---:|---|
| `guided-human` | 46:05 | 51:37 | 5:32 | 过快，像引导路线爆穿 |
| `patient-multiplier-human` | 1:19:05 | 1:48:50 | 29:45 | 接近目标，可作为硬基准 |
| `comfort-first` | 1:05:04 | 1:12:20 | 7:16 | 过快，说明自动化/保留路线压缩太强 |
| `bad-but-plausible` | 1:22:20 | 1:27:13 | 4:53 | 过快，说明“低效但合理”也会跳过阶段 |
| `new-player-visible` | 1:01:29 | 1:08:08 | 6:39 | 过快，说明显眼按钮路线压缩太强 |
| `roi-greedy` | 未达成 | 未达成 | 未达成 | 漏洞探针，不作为正常路线 |

阶段目标第一版：

| 指标 | 目标 |
|---|---:|
| `patient-multiplier-human` Storm1 -> Storm2 | 25-40 分钟 |
| 常规可见路线 Storm1 -> Storm2 | 18-35 分钟 |
| 强引导/高效路线 Storm1 -> Storm2 | 不早于 15 分钟 |
| 低效但合理路线 Storm1 -> Storm2 | 20-50 分钟 |
| 任意正常路线 | 不应因风暴图谱买错而卡死 |

当前 `patient` 已经接近目标，所以调参时不能只为了压住 `guided` 和 `new-player-visible` 就大幅提高 `storm_front_2.targetExp`。更优先削弱“显眼路线爆发源”。

## 3. 设计/profile assumptions

本轮假设：

- 0 -> 第一次季风不大改。
- 第一风暴后不做复杂研究树。
- 风暴主干是主线教学，不是自由构筑。
- 风暴分支可以保留，但第一版只要求不决定能不能过关。
- 周末上线目标是 2-3 小时完成主线，不追求终局数值完全精密。
- UI 改造重要，但本轮先调游戏性和曲线。

明确不做：

- 不新增天气层级。
- 不重写第一季风前公式。
- 不恢复 Pixi/Phaser 路线。
- 不把风暴图谱扩成复杂科技树。
- 不让 `thunderUpdraft` 继续同时承担必选主干、巨大生产者 orders、巨大风暴 orders 三个职责。

## 4. Proposed creative improvements

### 4.1 风暴主干显式化

第一次风暴前线完成后，自动点亮：

```text
frontMemory Lv.1
thunderUpdraft Lv.1
rainOverload Lv.1
```

并消耗第一次风暴获得的 4 风暴胞。

玩家反馈：

```text
风暴主干已点亮 3/3
前线记忆、雷暴上升、雨阶过载已成为新的天气骨架。
```

设计目的：

- 移除隐藏最优解。
- 保证所有玩家从同一个风暴基础进入第二阶段。
- 让后续调参以共同主干为基线。

### 4.2 第二风暴前线保险门槛

第二风暴前线要求主干完成：

```text
frontMemory >= 1
thunderUpdraft >= 1
rainOverload >= 1
```

这主要是旧存档和异常状态保险。正常新流程里，第一次风暴后会自动完成主干。

### 4.3 风暴图谱分层

第一版只在逻辑和 UI 说明上拆分：

```text
风暴主干：
- frontMemory Lv.1
- thunderUpdraft Lv.1
- rainOverload Lv.1

风暴分支：
- stormBatch
- windEyeRelic
- frontScar
- stormPrism
- thunderUpdraft Lv.2+
- rainOverload Lv.2+
```

第一批不重做所有分支效果，只让玩家知道哪些是主线、哪些是可选。

### 4.4 Storm1 -> Storm2 曲线压缩控制

优先削以下来源：

1. `thunderUpdraft` 生产者 orders。
2. `thunderUpdraft` 风暴指数 orders。
3. `totalStormCells * totalCloudCores` 交叉项。
4. `storm_front_2.targetExp` 作为最后手段小幅上调。

不要第一步就大幅上调 `storm_front_2.targetExp`，因为 `patient` 当前 Storm1 -> Storm2 已经约 30 分钟。

## 5. Prioritized feature batches

### Batch 0：文档和共识

当前文档即 Batch 0。目标是把外部 v2 计划转成项目执行口径。

### Batch 1：第一风暴主干

代码目标：

- 增加 `STORM_TRUNK_UPGRADES`。
- 增加 `hasStormTrunk()`。
- 第一次 `performStormFrontReset()` 自动点亮主干并消耗 4 风暴胞。
- `canRunStormFront()` 对第二风暴加入主干保险。
- UI 显示“风暴主干已点亮”。
- 模拟器加入 `misled-storm-player` 验证买错不会卡死。

验收：

```text
第一次风暴后 frontMemory/thunderUpdraft/rainOverload 均为 1。
第一次风暴后 stormCells 通常为 0。
misled-storm-player 与正常路线不再因第一风暴购买顺序产生几十分钟差距。
```

### Batch 2：模拟器补 Storm1 -> Storm2 诊断

代码目标：

- 输出 stage durations。
- 输出 firstStormFront -> secondStormFront。
- 输出 largest rate jumps。
- 输出每个 milestone 的 layer bonus。

必须能回答：

```text
第二风暴前到底是谁把速率拉爆？
是 thunderUpdraft、storm bonus、pressure，还是本轮升级堆叠？
```

### Batch 3：第一轮数值削弱

首选改动：

```text
getProducerMultiplier:
  thunderUpdraft: +3 orders/级 -> +1.5 orders/级

getStormCellExponentBonus:
  thunderUpdraft: +2.2 orders/级 -> +0.8 orders/级
  totalStormCells: +1.6 orders/点 -> +1.2 orders/点
  crossTerm: 0.035 -> 0.02
  crossTerm cap: 12 -> 8
  MAX_STORM_EXPONENT_BONUS: 48 -> 42
```

暂不动：

```text
climate
sky pulse
第一季风前升级成本
```

验收：

```text
patient Storm1 -> Storm2 仍在 25-45 分钟。
new-player-visible Storm1 -> Storm2 不早于 15-18 分钟。
bad-but-plausible Storm1 -> Storm2 不早于 15-18 分钟。
所有正常路线仍能在合理时间到第二风暴。
```

### Batch 4：必要时小幅调整 storm_front_2

只有 Batch 3 后仍过快才做。

候选：

```text
storm_front_2.targetExp: 145 -> 155 或 160
```

不建议一开始改到 165。`patient` 已经接近目标，大幅抬目标可能让真人策略过慢。

## 6. First batch implementation plan

第一批建议只做 Batch 1 + Batch 2 的最小版本。

Current SPEC for next code batch:

Files to add:

```text
无，除非拆出小工具函数测试文件。
```

Files to modify:

```text
src/game/economy/constants.ts
src/game/economy/resets.ts
src/game/economy/upgrades.ts
src/App.tsx
scripts/simulate-weather-strategies.mjs
```

Explicitly not doing:

```text
不削 climate。
不削 sky pulse。
不改第一季风前曲线。
不做完整 UI 页签化。
不做推荐动作引擎。
```

Acceptance checks:

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

模拟输出必须包含：

```text
firstStormFront -> secondStormFront duration
secondStormFront time
storm trunk status
misled-storm-player result
```

## 7. Files/systems to inspect or edit

主要代码点：

```text
src/game/economy/constants.ts
  MAINLINE_MILESTONES
  MAX_STORM_EXPONENT_BONUS
  新增 STORM_TRUNK_UPGRADES

src/game/economy/resets.ts
  canRunStormFront()
  performStormFrontReset()
  getStormCellGain()

src/game/economy/formulas.ts
  getProducerMultiplier()
  getStormCellExponentBonus()

src/game/economy/upgrades.ts
  STORM_UPGRADES
  新增 STORM_TRUNK_IDS / STORM_BRANCH_IDS

src/App.tsx
  风暴图谱显示
  storm reset notice

scripts/simulate-weather-strategies.mjs
  CANONICAL_STORM_ORDER
  strategies
  printResult()
  evaluateBalanceGates()
```

辅助事实源：

```text
docs/weather-reactor-v13-implementation-summary.md
docs/weather-reactor-simulation-strategy-notes.md
docs/weather-reactor-test-strategy.md
```

## 8. Data/state changes needed

新增常量：

```ts
export const STORM_TRUNK_UPGRADES = [
  { id: "frontMemory", level: 1, cost: 1 },
  { id: "thunderUpdraft", level: 1, cost: 2 },
  { id: "rainOverload", level: 1, cost: 1 },
] as const;
```

不新增存档字段。

原因：

- 主干完成状态可以从 `state.stormUpgrades` 推导。
- 旧存档也可以通过已有 storm upgrade level 判断。

需要注意：

- 第一次风暴自动点亮主干时，必须复制 `stormUpgrades`，不能直接 mutate 当前 state。
- 如果异常情况下第一次风暴获得超过 4 风暴胞，剩余风暴胞保留。
- 如果旧存档已经拥有其中某些升级，只补缺失项，只扣对应成本。

## 9. Feedback/consequence plan

第一风暴后的反馈分三层：

Immediate feedback:

```text
按钮文案或 notice：
风暴主干已点亮。
```

Resolution feedback:

```text
风暴图谱区域显示：
风暴主干 3/3
前线记忆 / 雷暴上升 / 雨阶过载
```

Consequence feedback:

```text
下一目标说明：
用新的风暴主干完成第 5、第 6 次季风，推进第二风暴前线。
```

这比只弹 “+4 风暴胞” 更清楚。玩家需要知道风暴不是多了一个钱包，而是改写了旧循环。

## 10. Risks and non-goals

主要风险：

1. 自动点亮主干会减少自由分配感。
2. 削弱 `thunderUpdraft` 后，第二风暴可能对 `patient` 变慢。
3. 如果只看 `guided-human` 调参，可能把真人路线拖得过长。
4. 模拟策略仍不等于真人，尤其第一风暴后用户还没有实际试玩。

规避：

- `patient-multiplier-human` 作为 hard gate。
- `guided-human`、`new-player-visible` 作为过快 warning。
- `bad-but-plausible` 作为容错 warning。
- 每次只动一组公式，保留模拟输出。

本轮 non-goals：

- 不解决完整终局 1e308 平衡。
- 不重做气候法则。
- 不做完整风暴图谱 redesign。
- 不做移动端 UI。
- 不做 Mood 系统实现。

## 11. Verification plan

每次代码改动后运行：

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

记录：

```text
rank 1 / 3 / 6 / 8 / 10
firstMonsoon
firstStormFront
secondStormFront
firstClimateRewrite
skyHeart
firstStormFront -> secondStormFront duration
largest rate jumps
layer bonus at firstStormFront / secondStormFront
```

第一轮通过标准：

```text
patient:
  firstStormFront -> secondStormFront 在 25-45 分钟内

new-player-visible:
  firstStormFront -> secondStormFront 不早于 15-18 分钟

bad-but-plausible:
  不因风暴图谱顺序卡死
  firstStormFront -> secondStormFront 不早于 15-18 分钟

guided-human:
  可以比 patient 快，但不应 5-8 分钟跨过第二风暴
```

## 12. Harsh design critique checklist

实施后逐项检查：

1. 第一风暴后是否还像隐藏答案题？
2. 玩家是否知道 4 风暴胞去了哪里？
3. 第二风暴前是否有至少一次清楚的旧流程压缩体验？
4. 风暴图谱分支是否仍有存在感？
5. `thunderUpdraft` 是否仍是必选且巨大收益？
6. `patient` 是否仍符合用户真人策略直觉？
7. `new-player-visible` 如果过快，是 UI 显眼按钮过强，还是公式本身过强？
8. 低效玩家是否会卡死或静默等待太久？
9. 第一风暴到第二风暴是否像一个阶段，而不是一个过场？
10. 本轮改动是否引入了更多玩家读不懂的规则？

当前推荐下一步：

```text
先实现 Batch 1：第一风暴主干显式化。
同时实现 Batch 2 的最小模拟输出：Storm1 -> Storm2 duration。
跑模拟后，再决定是否进入 Batch 3 削弱 thunderUpdraft / storm bonus。
```
