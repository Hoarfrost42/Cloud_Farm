# Weekend Launch Execution Notes

更新时间：2026-05-16  
适用版本：`v13 / Post-Monsoon Complete Slice`  
参考来源：`E:\Downloads_FromWeb\weekend-launch-action-plan.md`

本文是仓库执行版，不是外部 Pro 文档的完整复刻。目标是把周末上线工作收束成可执行、可验证、可回滚的任务顺序。

## 0. 当前结论

周末版目标不是最终商业平衡，而是一个可以公开试玩的完整天气增量小品。

目标终局时长：

```text
熟练/引导路线：2-3 小时到 1e308
低效但合理路线：不应卡死，最好 4-5 小时内通关或至少到第一次气候改写
ROI 压力路线：用于找漏洞，不直接作为硬性平衡标准
```

当前最重要的问题：

1. 第一季风前基本可保留，不要大动 Formula C 的早期公式。
2. 季风后指数层级压缩过强，风暴、气候、天空心脏阶段太短。
3. 当前模拟器缺少“过快失败”“阶段快照”和真实玩家策略。
4. UI 首屏信息密度太高，需要重新分层，而不是简单把所有东西折叠。
5. 空岛 Mood 系统应作为纯表现层，增强进度反馈和成就感，不影响经济。

## 1. 推荐执行顺序

### P0-A：模拟器先行

先改：

```text
scripts/simulate-weather-strategies.mjs
```

目标：

- 增加 milestone 时间记录。
- 增加 layer bonus snapshots。
- 增加 balance gates。
- 增加你的真实策略：`patient-multiplier-human`。
- 将 `roi-greedy` 暂时作为压力测试，不直接 hard fail。

原因：

```text
没有 gates 和 snapshots，后续调参只能靠感觉。
```

第一版 gates 建议：

| 策略 | 硬要求 | 软目标 |
|---|---|---|
| `patient-multiplier-human` | 通关 1e308，终局不早于 120 分钟，不晚于 210 分钟 | 135-180 分钟 |
| `guided-human` | 通关 1e308，终局不早于 100 分钟 | 120-180 分钟 |
| `comfort-first` | 4 小时内通关，静默不超过 10 分钟 | 150-240 分钟 |
| `bad-but-plausible` | 4 小时内到第一次气候改写，静默不超过 12 分钟 | 5 小时内通关 |
| `roi-greedy` | 只报告，不 hard fail | 用来暴露漏洞 |

阶段目标：

| 里程碑 | 目标 |
|---|---:|
| 第 1 雨阶 | 6-10 分钟 |
| 第 3 雨阶 | 12-20 分钟 |
| 第 6 雨阶 | 20-30 分钟 |
| 第 8 雨阶 | 26-38 分钟 |
| 第 10 雨阶 | 32-45 分钟 |
| 第一次季风 | 38-60 分钟 |
| 第一风暴前线 | 65-105 分钟 |
| 第一次气候改写 | 95-155 分钟 |
| 1e308 终局 | 120-210 分钟 |

### P0-B：先调最明显的爆点

先改：

```text
src/game/economy/upgrades.ts
src/game/economy/formulas.ts
src/game/economy/constants.ts
```

第一轮只动以下项：

```text
monsoonPull.costGrowth: 10 -> 100
getMonsoonPullMultiplier(): eyeWall 后 1000 -> 300
SKY_HEART_PULSE_BONUS_EXPONENTS: [32, 32, 16] -> [24, 20, 10]
```

然后跑：

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

理由：

- `monsoonPull` 是中后期无限堆叠的明显漏洞。
- sky pulse 当前像终局跳过按钮。
- 这两项风险低，改动范围小，容易回滚。

### P0-C：再调 pressure / storm / climate

如果 P0-B 后仍明显过快，再逐层削：

```text
MAX_PRESSURE_EXPONENT_BONUS: 30 -> 18 或 22
MAX_STORM_EXPONENT_BONUS: 85 -> 55
MAX_CLIMATE_EXPONENT_BONUS: 130 -> 85
```

公式方向：

```text
pressure: 降低 totalPressureSpentThisFront 返还
storm: 大幅降低 totalStormCells * totalCloudCores 复合项
climate: totalClimateThreads 每点从 +6 orders 降到 +4 orders
```

执行原则：

- 一次只改一层，跑模拟看 snapshot。
- 优先看哪个 layer 在第一风暴、第一次气候、终局处爆炸。
- 不要同时改 milestone 表，避免不知道是哪项生效。

### P0-D：milestone targetExp 只作为 fallback

只有满足以下条件才改：

```text
monsoonPull / sky pulse / pressure / storm / climate 都削过后，
patient-multiplier-human 仍早于 120 分钟通关。
```

可改文件：

```text
src/game/economy/constants.ts
MAINLINE_MILESTONES
```

优先抬：

```text
storm_front_1: 70 -> 82
climate_rewrite_1: 160 -> 192
climate_rewrite_2: 230 -> 252
sky_pulse_1/2/3: 270 / 292 / 302
```

不要动：

```text
monsoon_1 targetExp = 20
前 10 雨阶需求
第一次季风前核心公式
```

### P0-E：UI 信息架构降噪

这不是简单折叠，而是重排信息层级。

首屏必须保留：

```text
当前天气活力
当前被动/s
本轮计时
当前雨阶 / 当前 reset 层
下一目标
当前可执行动作
空岛 Mood 状态
当前升级组
```

移入二级入口：

```text
资源详情
公式摘要
layer breakdown
后期未解锁资源
历史最高 orders
全部升级组
```

推荐结构：

```text
首屏：当前目标 + 当前动作 + 空岛状态
Tabs：升级 / 资源 / 公式 / 记录
弹窗：reset 说明、阶段解锁说明
调试页：orders breakdown、完整公式、debug export
```

P0 最小实现：

- 资源详情用 `<details>` 或页签。
- 公式摘要默认进入调试/公式页。
- 风暴、气候、天空心脏 reset 卡只在相关阶段显示。
- 右侧升级面板只突出当前推荐组；其他组可通过 tab 切换。

注意：

```text
不要把重要按钮藏没。
不要用 currentMilestone.kind === "monsoon" 作为显示季风卡的唯一条件，
因为新存档当前 milestone 也是第一次季风，会导致开局就显示季风卡。
```

推荐显示条件：

```ts
const shouldShowMonsoonCard =
  state.rainRanks >= 8
  || state.upgrades.windEye > 0
  || state.totalMonsoonCycles > 0
  || canRunMonsoon;

const shouldShowStormFrontCard =
  currentMilestone.kind === "stormFront"
  || state.totalStormFronts > 0
  || canRunCurrentStormFront;

const shouldShowClimateCard =
  currentMilestone.kind === "climateRewrite"
  || state.totalClimateRewrites > 0
  || canRunCurrentClimateRewrite;

const shouldShowSkyPulseCard =
  currentMilestone.kind === "skyPulse"
  || state.skyHeartPulseLevel > 0
  || canBuySkyHeartPulse;
```

### P0-F：Island Mood 纯表现层

新增：

```text
src/game/economy/progression.ts
```

导出：

```text
src/game/economy/index.ts
```

修改：

```text
src/App.tsx
src/styles/app.css
```

原则：

- 不写入存档。
- 不进入公式。
- 不影响模拟结果。
- 只从 `WeatherReactorState` 派生。
- 只改变背景、云层状态、雨线/风线/辉光、短文案。

建议阶段：

| Mood | 触发 |
|---|---|
| `dryStart` | `rainRanks === 0 && totalMonsoonCycles === 0` |
| `firstRain` | `rainRanks >= 1 && rainRanks < 3 && totalMonsoonCycles === 0` |
| `rootedRain` | `rainRanks >= 3 || upgrades.rootWake > 0 || upgrades.cloudBloom > 0`，且未季风 |
| `windEye` | `rainRanks >= 6 || upgrades.windEye > 0`，且未季风 |
| `monsoon` | `totalMonsoonCycles >= 1 && totalStormFronts === 0` |
| `stormFront` | `totalStormFronts >= 1 || currentMilestone.kind === "stormFront"` |
| `climateRewrite` | `totalClimateRewrites >= 1 || currentMilestone.kind === "climateRewrite"` |
| `skyHeart` | `skyHeartPulseLevel > 0 || bestWeatherExp >= 250 || skyHeartAwakened` |

修订点：

```text
不要单独用 pressure > 0 触发 stormFront mood。
第一次季风后就可能有气压，这会让视觉过早进入风暴状态。
```

## 2. 你的真实策略：patient-multiplier-human

这是后续第一季风前最重要的模拟策略。

### 策略描述

玩家会比较当前可见升级中谁带来最大结构性收益。`天气增幅 x4` 往往是最关键目标，因此玩家愿意短期等待，不会因为 `活力基流` 刚好买得起就立刻买。

### 点击口径

点击收益不计入 UI 被动/s，但玩家会把它近似理解成：

```text
点击等效被动 ≈ 点击收益 / 2 秒
```

当：

```text
被动/s >= 点击收益 / 2
```

玩家基本不再投资点击升级。点击只作为前期过渡。

### 早期升级习惯

通常：

```text
cloudTouch 买 2-3 级后停止
dropletSeed 和 weatherAmplifier 各买 2-3 级后，被动超过点击
weatherAmplifier 若 45-90 秒内可买，优先等待
dropletSeed 只有在 weatherAmplifier 太远或需要垫底座时才买
```

示例：

```text
当前点击收益 100
当前被动 20/s
weatherAmplifier 成本 1000，买后 20/s -> 80/s
dropletSeed 成本 300

玩家更倾向等到 1000 直接买 x4，而不是先花 300 买基流。
```

### 生产者链习惯

对：

```text
rootWake
cloudBloom
windEye
```

玩家不会做过细 ROI 计算，因为它们是 log 存量和链式增长。策略更接近：

```text
只要不妨碍关键 weatherAmplifier / monsoonPull 等待，就尽快买。
```

### 模拟器算法建议

新增策略：

```text
patient-multiplier-human
```

核心逻辑：

1. 优先执行可用 reset。
2. 若关键升级可买，立即买。
3. 若关键升级不可买，估算等待时间。
4. 如果等待时间小于阈值，且买后收益明显高于当前可买升级，则等待。
5. 否则买当前最有价值升级。

关键等待目标：

```text
weatherAmplifier: 可等待 45-90 秒
monsoonPull: 可等待 60-120 秒
windEye: 解锁后优先买
heavyRain: 若等待短且可显著推季风，优先等
```

点击升级停止规则：

```text
如果 rates.weather >= getCloudTouchAmount(state) / 2，则 cloudTouch 降低优先级。
如果 cloudTouch >= 3，也降低优先级。
```

注意：

```text
patient-multiplier-human 应成为第一季风前调参主参考。
roi-greedy 只作为漏洞压力测试，不应强迫游戏为它牺牲普通体验。
```

## 3. Pro 文档建议的修订点

### 3.1 不建议一次全量削弱

Pro 文档 P0-2 一次改：

```text
monsoonPull
pressure
storm
climate
sky pulse
```

这会导致无法判断哪项产生影响。执行时应分三轮：

1. `monsoonPull + sky pulse`
2. `pressure`
3. `storm + climate`

每轮跑完整模拟。

### 3.2 balance gates 不应一开始全 hard

第一版 gates：

- `patient-multiplier-human`、`guided-human` 可以 hard。
- `comfort-first` 可以 hard。
- `bad-but-plausible` 只 hard 检查静默和是否到第一次气候改写。
- `roi-greedy` 只 warning。

### 3.3 UI 降噪不是隐藏信息

目标是：

```text
信息分层
当前任务聚焦
调试信息退到二级
后期系统按阶段显露
```

不是：

```text
把所有东西塞进 details
```

### 3.4 Mood 不应触发过早

`pressure > 0` 不应直接触发 `stormFront` mood。

理由：

```text
第一次季风后就可能有气压。
这时玩家应感到进入季风循环，不是已经进入风暴前线。
```

### 3.5 debug.ts 不能从 index.ts 反向导入

Pro 文档 P1-2 示例：

```ts
import { calculateRates, ... } from "./index.ts";
```

不建议这样做。`index.ts` 是 barrel export，内部文件从它反向导入容易产生循环依赖。

应改成：

```ts
import { calculateRates, calculateWeatherPerSecondLog, getLayerBonusBreakdown } from "./formulas.ts";
import { getCurrentMainlineMilestone, getCurrentMilestoneTargetExp } from "./resets.ts";
```

## 4. P0 任务清单

### P0-1：保存 Pro 原始文档或执行版文档

建议：

```text
docs/weekend-launch-action-plan.md
docs/weekend-launch-execution-notes.md
```

本文件是执行版。是否把 Pro 原文也放入仓库，由用户决定。

### P0-2：模拟器增强

文件：

```text
scripts/simulate-weather-strategies.mjs
```

必须新增：

- `milestoneAt`
- `snapshots`
- `evaluateBalanceGates()`
- `patient-multiplier-human`
- `new-player-visible` 或等价新手策略
- `maxLevels` upgrade repetition report

验收：

```bash
npm run simulate:weather-strategies
```

预期：

```text
当前版本应 fail 或 warning，因为季风后太快。
这是正确结果。
```

### P0-3：第一轮数值修正

文件：

```text
src/game/economy/upgrades.ts
src/game/economy/formulas.ts
src/game/economy/constants.ts
```

先改：

```text
monsoonPull.costGrowth
getMonsoonPullMultiplier eyeWall
SKY_HEART_PULSE_BONUS_EXPONENTS
monsoonPull 文案真实显示当前 multiplier
```

验收：

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

### P0-4：第二轮数值修正

文件：

```text
src/game/economy/constants.ts
src/game/economy/formulas.ts
```

按 snapshots 选择性调整：

- pressure
- storm
- climate

不要无脑全改。

### P0-5：UI 信息架构重排

文件：

```text
src/App.tsx
src/styles/app.css
```

最小目标：

- 左侧只保留核心状态。
- 资源详情 / 公式摘要进入二级入口。
- 中间只显示当前相关 reset。
- 右侧突出当前升级组。
- 后期层级用 tab / drawer / modal，而不是全部常驻。

### P0-6：Island Mood

文件：

```text
src/game/economy/progression.ts
src/game/economy/index.ts
src/App.tsx
src/styles/app.css
```

验收：

```text
模拟结果完全不变。
不同阶段视觉和文案变化明显。
```

## 5. P1 / P2

### P1

- 拆 `App.tsx`：
  - `StatusPanel`
  - `ReactorStage`
  - `ResetCards`
  - `UpgradePanel`
  - `FormulaDrawer`
  - `IslandMoodStage`
- Debug report export。
- Dev-only state bookmarks。

### P2

- 终局面板。
- 更细视觉 polish。
- 动画粒子。
- 主动气候法则槽。
- 更完整美术资源。

## 6. 当前待讨论问题

1. 是否把 Pro 原始文档也加入仓库？
2. `patient-multiplier-human` 的等待阈值用 60 秒还是 90 秒？
3. `roi-greedy` 是否只 warning，不参与 hard gate？
4. `bad-but-plausible` 是否要求通关，还是只要求到第一次气候改写？
5. 是否接受第一轮数值先只改 `monsoonPull + sky pulse`？
6. UI 是否优先做 tab 架构，而不是 `<details>` 折叠？
7. Mood 背景是否走轻量 CSS，不引入新图片素材？

## 7. 每轮最终验收

每轮代码改动后运行：

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

如果是纯文档改动，至少运行：

```bash
npm run typecheck
```

上线前最终 checklist：

```text
无 TypeScript 错误
build 成功
模拟器 gates 可解释
首屏有明确下一步
后期系统不会开局暴露
Mood 变化不影响经济
README / v13 summary / execution notes 同步
```
