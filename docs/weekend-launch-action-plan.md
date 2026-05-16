# Weekend Launch Action Plan

目标文件建议路径：`docs/weekend-launch-action-plan.md`

适用范围：`v13 / Post-Monsoon Complete Slice` 当前主线。本文只针对以下当前实现文件：

```text
src/App.tsx
src/game/economy/constants.ts
src/game/economy/formulas.ts
src/game/economy/upgrades.ts
src/game/economy/resets.ts
src/game/economy/tick.ts
src/game/economy/format.ts
src/game/economy/state.ts
src/game/economy/types.ts
src/game/economy/logNumbers.ts
src/styles/app.css
scripts/simulate-weather-strategies.mjs
```

明确不处理：

```text
archive/legacy-v0-pixi-phaser/*
旧 v11 / 旧 v12 文档中的过期公式
scripts/simulate-weather-reactor.mjs 作为平衡验收依据
Pixi / Phaser / 伪 2.5D 恢复
后端、账号、排行榜、多人、复杂资产管线
```

---

## 0. Executive Summary

### 最小上线目标

周末上线版不是最终商业平衡版。目标是：

```text
玩家可以从新存档完整玩到 1e308 终局；
第一次季风前节奏基本保持当前可用状态；
季风后不再 15-20 分钟内直接打穿风暴、气候、天空心脏；
UI 能让玩家知道当前该做什么；
模拟器能自动暴露“太快、卡死、静默过久、低效路线不通关”等问题。
```

建议上线节奏目标：

| 里程碑 | 推荐熟练/引导路线目标 | 可接受上线范围 | 说明 |
|---|---:|---:|---|
| 第 1 雨阶 | 6-9 分钟 | 4-12 分钟 | 不要过早削弱第一轮爽感。 |
| 第 3 雨阶 | 12-18 分钟 | 10-24 分钟 | 应开始理解根系与生产者链。 |
| 第 6 雨阶 | 20-28 分钟 | 18-35 分钟 | 应出现风眼/云团路线压力。 |
| 第 8 雨阶 | 26-34 分钟 | 24-42 分钟 | 进入季风准备阶段。 |
| 第 10 雨阶 | 32-42 分钟 | 30-52 分钟 | 当前首季风前体感可保留。 |
| 第一次季风 | 38-50 分钟 | 35-60 分钟 | 第一层大 reset。 |
| 第一风暴前线 | 65-85 分钟 | 55-105 分钟 | 必须感觉进入新循环，而不是季风的继续。 |
| 第一次气候改写 | 95-125 分钟 | 80-150 分钟 | 必须有明显公式改写。 |
| 1e308 终局 | 135-180 分钟 | 100-240 分钟 | 周末版宁可略短，不要卡死。 |

当前文档基线显示：

```text
guided-human: 50:07 到天空心脏，33:34 第一次季风，45:17 第一风暴前线，48:21 第一次气候改写
roi-greedy: 45:47 到天空心脏
comfort-first: 1:18:30 到天空心脏
bad-but-plausible: 1:18:45 到天空心脏
```

判断：**当前全流程已经能跑通，但季风后压缩过强。** 周末上线最关键不是再加系统，而是降低指数爆穿风险、加模拟 gates、降低 UI 噪音、补最小阶段反馈。

### 最大风险

1. **指数层叠过强**  
   `formulas.ts` 中 `getLayerBonusBreakdown()` 把云核、气压、风暴胞、气候法则、天空心脏脉冲全部加到 `layerBonus`，而 `calculateWeatherPerSecondLog()` 又把这个总指数直接叠到天气活力/s 上。高风险源头是：

   ```text
   getPressureExponentBonus()
   getStormCellExponentBonus()
   getClimateLawExponentBonus()
   SKY_HEART_PULSE_BONUS_EXPONENTS
   getMonsoonPullMultiplier()
   monsoonPull.costGrowth
   ```

2. **模拟器只有“是否通关”的硬失败，不阻止过快通关**  
   现在 `scripts/simulate-weather-strategies.mjs` 只在 required strategies 没有 skyHeartAt 时设置 `process.exitCode = 1`。它不会因为 `roi-greedy` 45 分钟打穿、第一次气候改写后 2 分钟终局而失败。

3. **UI 同屏信息过多**  
   `App.tsx` 当前同时常驻：计时、最高 orders、层级 orders、7 个资源摘要、资源详情、公式摘要、5 张 reset 卡、终局卡、升级组、云核、气压、风暴、气候法则。对周末版玩家来说，最大问题不是功能缺失，而是不知道哪个信息现在重要。

4. **视觉阶段感不足**  
   中间区虽然有云层和生产者链，但背景/文案没有跟随“开局、雨阶、季风、风暴、气候、天空心脏”明显变化。玩家会感觉自己只是一直点按钮和等数字，而不是在复苏空岛天气系统。

### 推荐开发顺序

```text
P0-1: 给模拟器加硬 gates 和阶段时间输出。
P0-2: 削弱季风后指数爆穿源，先不要动第一季风前核心公式。
P0-3: 把右侧和左侧 UI 噪音折叠；中间只突出当前 reset。
P0-4: 加最小 Island Mood 阶段反馈，不影响数值。
P0-5: 跑 typecheck / build / simulate，按 gates 小步回调。
P1: 拆 App.tsx 组件、补调试导出、补更细 UI 预览。
P2: 动画、结局演出、主动气候法则槽、最终美术化。
```

---

## 1. Balance Plan

### 1.1 当前全流程时间过短，尤其季风后阶段被压缩

#### Issue

当前模拟中，`guided-human` 约 50 分钟完成 1e308，`roi-greedy` 约 46 分钟完成。第一次季风约 31-35 分钟是可接受的，但第一风暴前线、第一次气候改写、天空心脏几乎连续发生，后续层级没有形成独立玩法节奏。

#### Evidence

代码/文档证据：

```text
docs/weather-reactor-v13-implementation-summary.md
scripts/simulate-weather-strategies.mjs
src/game/economy/constants.ts MAINLINE_MILESTONES
src/game/economy/formulas.ts getLayerBonusBreakdown()
```

当前 v13 实现总表记录：

```text
guided-human: skyHeart 50:07, monsoon 33:34, stormFront 45:17, climateRewrite 48:21
roi-greedy: skyHeart 45:47
comfort-first: skyHeart 1:18:30
bad-but-plausible: skyHeart 1:18:45
```

#### Code Locations

```text
src/game/economy/constants.ts
  MAINLINE_MILESTONES
  MAX_PRESSURE_EXPONENT_BONUS
  MAX_STORM_EXPONENT_BONUS
  MAX_CLIMATE_EXPONENT_BONUS
  SKY_HEART_PULSE_BONUS_EXPONENTS

src/game/economy/formulas.ts
  calculateWeatherPerSecondLog()
  getLayerBonusBreakdown()
  getPressureExponentBonus()
  getStormCellExponentBonus()
  getClimateLawExponentBonus()
  getSkyHeartExponentBonus()

scripts/simulate-weather-strategies.mjs
  strategies
  simulateStrategy()
  printResult()
```

#### Proposed Change

先不动第一季风前核心公式，不动：

```text
DROPLET_LOG_MULTIPLIER_STEP
DROPLET_LOG_DIVISOR
PRODUCER_STOCK_LOG_DIVISOR
RAIN_RANK_REQUIREMENT_EXPONENTS 前 10 项
BASE_MONSOON_WEATHER_TARGET / monsoon_1 targetExp = 20
```

优先削弱季风后的指数层：

```text
pressure layer: 降低 totalPressureSpentThisFront 的指数返还。
storm layer: 降低 totalStormCells 和 totalStormCells * totalCloudCores 的复合项。
climate layer: 降低 totalClimateThreads 的每点指数贡献。
sky pulse: 降低三档脉冲，避免第二次气候改写后 1-2 分钟内终局。
monsoonPull: 抬高后续等级成本，降低 eyeWall 后乘区。
```

#### Acceptance Checks

`npm run simulate:weather-strategies` 输出应满足硬 gates：

```text
guided-human 必须通关 1e308。
roi-greedy 必须通关 1e308，但不能早于 75 分钟。
comfort-first 必须在 4 小时内通关。
bad-but-plausible 必须在 5 小时内通关，或至少到第一次气候改写。
所有策略 maxQuietSeconds <= 10 分钟。
guided-human 第一次季风 35-60 分钟。
guided-human 第一风暴前线不能早于 55 分钟。
guided-human 第一次气候改写不能早于 80 分钟。
guided-human 终局不能早于 100 分钟。
```

软目标：

```text
guided-human 终局 135-180 分钟。
comfort-first 终局 150-240 分钟。
bad-but-plausible 不应超过 comfort-first 太多；若超过 5 小时，说明低效路线保护不足。
```

#### Rollback

所有数值改动只发生在：

```text
constants.ts
formulas.ts
upgrades.ts
```

回滚方式：恢复旧常量和公式；不影响状态结构、存档字段或 UI 结构。

---

### 1.2 `monsoonPull` 后续等级数学上过于划算

#### Issue

`monsoonPull` 每级天气活力被动增长 `x100`，即 `+2 orders`。但 `upgrades.ts` 中 `monsoonPull.costGrowth = 10`，序列后成本只增加 `+1 order`。并且 `formulas.ts getMonsoonPullMultiplier()` 在拥有 `eyeWall` 后把每级乘区从 `100` 提高到 `1000`，即每级 `+3 orders`。这会让中后期玩家重复购买 `monsoonPull`，并绕过风暴/气候层的设计。

#### Evidence

```text
src/game/economy/constants.ts
  MONSOON_PULL_WEATHER_MULTIPLIER = 100

src/game/economy/upgrades.ts
  UPGRADE_DEFINITIONS id: "monsoonPull"
  costSequence: [1e16, 3e17, 1e19]
  costGrowth: 10

src/game/economy/formulas.ts
  getMonsoonPullMultiplier(state) returns hasEyeWall ? 1000 : MONSOON_PULL_WEATHER_MULTIPLIER
```

#### Code Locations

```text
src/game/economy/upgrades.ts
  UPGRADE_DEFINITIONS: monsoonPull
  getUpgradeActionDescription(): case "monsoonPull"
  PRESSURE_UPGRADES: eyeWall description

src/game/economy/formulas.ts
  getMonsoonPullMultiplier()
```

#### Proposed Change

低风险版本：只改常量效果和成本，不改类型系统。

```ts
// src/game/economy/upgrades.ts
{
  id: "monsoonPull",
  name: "季风牵引",
  description: "把第 10 雨阶后的被动增长牵引到季风爆发。",
  baseCost: { weather: 10000000000000000 },
  costGrowth: 100, // was 10
  costSequence: { weather: [10000000000000000, 300000000000000000, 10000000000000000000] },
}
```

```ts
// src/game/economy/formulas.ts
export function getMonsoonPullMultiplier(state: WeatherReactorState) {
  const hasEyeWall = state.pressureUpgrades.eyeWall > 0;
  return hasEyeWall ? 300 : MONSOON_PULL_WEATHER_MULTIPLIER; // was 1000
}
```

同步文案：

```ts
// src/game/economy/upgrades.ts
// PRESSURE_UPGRADES eyeWall
{
  id: "eyeWall",
  name: "眼墙牵引",
  description: "当前前线内季风牵引更强，但不再无限爆穿。",
  costSequence: [2, 4, 8],
}
```

`getUpgradeActionDescription()` 现在对 `monsoonPull` 写死显示 `MONSOON_PULL_WEATHER_MULTIPLIER`。建议改为真实当前值：

```ts
// src/game/economy/upgrades.ts
import { getDropletSeedWeatherRate, getMonsoonPullMultiplier } from "./formulas.ts";

case "monsoonPull":
  return `天气活力被动增长变为原来的 ${formatMultiplier(getMonsoonPullMultiplier(state), exact)} 倍。`;
```

#### Acceptance Checks

模拟器 purchase summary 中：

```text
monsoonPull 不应成为所有阶段最高重复购买项。
guided-human 到第一风暴前线前 monsoonPull 最高等级 <= 8。
guided-human 到终局 monsoonPull 最高等级 <= 25。
roi-greedy 不应只靠 monsoonPull 打穿 1e308。
```

命令：

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

#### Rollback

恢复：

```text
monsoonPull.costGrowth = 10
getMonsoonPullMultiplier() eyeWall value = 1000
```

---

### 1.3 气压指数奖励同时奖励“拥有升级”和“花费气压”，容易双重放大

#### Issue

`getPressureExponentBonus()` 目前包括：

```ts
1.5 * updraft
+ 2 * eyeWall
+ 2 * frontRain
+ 0.25 * totalPressureSpentThisFront
```

`totalPressureSpentThisFront` 让玩家花气压购买任意气压升级时，额外获得指数奖励。这样气压升级既给自身效果，又通过“已花费气压”给通用指数，形成双重奖励。当前 `MAX_PRESSURE_EXPONENT_BONUS = 30`，对 1e70、1e115、1e160 阶段会明显压缩。

#### Evidence

```text
src/game/economy/constants.ts
  MAX_PRESSURE_EXPONENT_BONUS = 30

src/game/economy/formulas.ts
  getPressureExponentBonus()

src/App.tsx
  buyPressureUpgrade() 每次购买会增加 totalPressureSpentThisFront
```

#### Code Locations

```text
src/game/economy/constants.ts
  MAX_PRESSURE_EXPONENT_BONUS

src/game/economy/formulas.ts
  getPressureExponentBonus()

src/App.tsx
  buyPressureUpgrade()
```

#### Proposed Change

```ts
// src/game/economy/constants.ts
export const MAX_PRESSURE_EXPONENT_BONUS = 18; // was 30
```

```ts
// src/game/economy/formulas.ts
export function getPressureExponentBonus(state: WeatherReactorState) {
  return Math.min(
    MAX_PRESSURE_EXPONENT_BONUS,
    1.0 * state.pressureUpgrades.updraft
      + 1.25 * state.pressureUpgrades.eyeWall
      + 1.0 * state.upgrades.frontRain
      + 0.12 * state.totalPressureSpentThisFront,
  );
}
```

#### Acceptance Checks

模拟器在 `printResult()` 或新增 snapshot 中输出：

```text
firstStormFrontAt 时 layer pressure <= +10 orders
firstClimateRewriteAt 时 layer pressure <= +18 orders
```

阶段时间：

```text
guided-human 第一风暴前线不能早于 55 分钟。
guided-human 第一次气候改写不能早于 80 分钟。
```

#### Rollback

恢复 `MAX_PRESSURE_EXPONENT_BONUS` 和四个系数即可。此改动不改变存档结构。

---

### 1.4 风暴胞指数奖励过强，尤其 `totalStormCells * totalCloudCores` 复合项

#### Issue

`getStormCellExponentBonus()` 当前公式：

```ts
2.2 * totalStormCells
+ 3 * thunderUpdraft
+ 5 * stormPrism
+ Math.min(25, 0.08 * totalStormCells * totalCloudCores)
```

第一风暴前线获得风暴胞后，风暴胞会立刻给大量指数；后续总云核继续积累，`stormCells * cloudCores` 复合项会让两个永久层互相放大。对周末版而言，这个复合项是最危险的“无感爆穿”来源之一。

#### Evidence

```text
src/game/economy/constants.ts
  MAX_STORM_EXPONENT_BONUS = 85

src/game/economy/formulas.ts
  getStormCellExponentBonus()

src/game/economy/resets.ts
  getStormCellGain() first storm minimum 4
```

#### Code Locations

```text
src/game/economy/constants.ts
  MAX_STORM_EXPONENT_BONUS

src/game/economy/formulas.ts
  getStormCellExponentBonus()
```

#### Proposed Change

```ts
// src/game/economy/constants.ts
export const MAX_STORM_EXPONENT_BONUS = 55; // was 85
```

```ts
// src/game/economy/formulas.ts
export function getStormCellExponentBonus(state: WeatherReactorState) {
  const stormWeavingCapBonus = state.climateLaws.stormWeaving > 0 ? 12 : 0; // was 25
  return Math.min(
    MAX_STORM_EXPONENT_BONUS + stormWeavingCapBonus,
    1.2 * state.totalStormCells
      + 2.2 * state.stormUpgrades.thunderUpdraft
      + 3 * state.stormUpgrades.stormPrism
      + Math.min(14, 0.025 * state.totalStormCells * state.totalCloudCores),
  );
}
```

#### Acceptance Checks

```text
guided-human 第一风暴前线后 10 分钟内不应直接到第一次气候改写。
firstClimateRewrite snapshot: storm layer <= +28 orders。
ending snapshot: storm layer <= +55 或 <= +67 若有 stormWeaving。
```

#### Rollback

恢复 `MAX_STORM_EXPONENT_BONUS` 和公式系数。

---

### 1.5 气候织线每点 `+6 orders` 过强，第一次气候改写后容易直接爆穿

#### Issue

`getClimateLawExponentBonus()` 当前公式中：

```ts
6 * totalClimateThreads
+ 6 * climateEcho
+ 4/5/6 orders from laws
```

`getClimateThreadGain()` 第一次气候改写最低给 5 织线，所以第一次气候改写后立刻有 `+30 orders`。如果玩家马上购买气候法则或 `climateEcho`，会进一步快速冲到天空心脏阶段。当前文档基线中，`guided-human` 48:21 第一次气候改写，50:07 就完成天空心脏，说明这一层没有形成足够独立阶段。

#### Evidence

```text
src/game/economy/formulas.ts
  getClimateLawExponentBonus()

src/game/economy/resets.ts
  getClimateThreadGain(): first rewrite base = 5

src/game/economy/constants.ts
  MAX_CLIMATE_EXPONENT_BONUS = 130
```

#### Code Locations

```text
src/game/economy/constants.ts
  MAX_CLIMATE_EXPONENT_BONUS

src/game/economy/formulas.ts
  getClimateLawExponentBonus()
```

#### Proposed Change

```ts
// src/game/economy/constants.ts
export const MAX_CLIMATE_EXPONENT_BONUS = 85; // was 130
```

```ts
// src/game/economy/formulas.ts
export function getClimateLawExponentBonus(state: WeatherReactorState) {
  const activeBonus = state.activeClimateLaws.includes("backflow") ? 1 : 0;
  return Math.min(
    MAX_CLIMATE_EXPONENT_BONUS,
    4 * state.totalClimateThreads
      + 4 * state.upgrades.climateEcho
      + 3 * state.climateLaws.condensationLaw
      + 3 * state.climateLaws.deepRootLaw
      + 4 * state.climateLaws.stormWeaving
      + (state.climateLaws.cloudCoreRefraction > 0 ? Math.min(12, 0.04 * state.totalCloudCores) : 0)
      + activeBonus,
  );
}
```

#### Acceptance Checks

```text
guided-human 第一次气候改写后到终局至少 20 分钟。
roi-greedy 第一次气候改写后到终局至少 10 分钟。
第一次气候改写后，climate layer 从 0 增到约 +20 orders，而不是 +30~50 orders。
```

#### Rollback

恢复 `MAX_CLIMATE_EXPONENT_BONUS = 130` 与旧公式。

---

### 1.6 天空心脏脉冲太像“终局跳过按钮”

#### Issue

`SKY_HEART_PULSE_BONUS_EXPONENTS = [32, 32, 16]`，而天空脉冲 milestone 是：

```text
sky_pulse_1 targetExp 250
sky_pulse_2 targetExp 275
sky_pulse_3 targetExp 300
ending targetExp 308
```

第一档脉冲给 `+32 orders`，比 250 -> 275 的目标差距还大。若玩家进入天空脉冲阶段时已经有较强气候/风暴 bonus，三档脉冲会连续触发，终局只剩确认按钮。

#### Evidence

```text
src/game/economy/constants.ts
  SKY_HEART_PULSE_BONUS_EXPONENTS = [32, 32, 16]
  MAINLINE_MILESTONES sky_pulse_1 / 2 / 3 / sky_heart

src/game/economy/formulas.ts
  getSkyHeartExponentBonus()
```

#### Code Locations

```text
src/game/economy/constants.ts
  SKY_HEART_PULSE_BONUS_EXPONENTS
```

#### Proposed Change

```ts
// src/game/economy/constants.ts
export const SKY_HEART_PULSE_BONUS_EXPONENTS = [24, 20, 10]; // was [32, 32, 16]
```

暂时不改 `sky_pulse_*` targetExp。先看削弱后的模拟。如果仍过快，再进入 1.7 的 fallback target 调整。

#### Acceptance Checks

```text
guided-human 第二次气候改写后到终局 15-35 分钟。
roi-greedy 第二次气候改写后到终局 >= 8 分钟。
三档 skyPulse 不能在同一分钟内全部触发。
```

#### Rollback

恢复 `[32, 32, 16]`。

---

### 1.7 Fallback：如果削弱指数后仍过快，再小幅提高中后期 milestone targetExp

#### Issue

如果执行 1.2-1.6 后，`guided-human` 仍早于 100 分钟通关，说明仅削弱 bonus 不够，需要拉长中后期 milestone target。

#### Evidence

```text
src/game/economy/constants.ts
  MAINLINE_MILESTONES 当前从 1e20 到 1e308 的 targetExp 表
```

#### Code Locations

```text
src/game/economy/constants.ts
  MAINLINE_MILESTONES
```

#### Proposed Change

仅作为 fallback，先不要一上来改。若仍过快，按以下最小表改：

```ts
export const MAINLINE_MILESTONES: MainlineMilestone[] = [
  { id: "monsoon_1", kind: "monsoon", title: "第一次季风", targetExp: 20, requiredRainRanks: 10 },
  { id: "monsoon_2", kind: "monsoon", title: "第二次季风", targetExp: 30, requiredRainRanks: 11 },
  { id: "monsoon_3", kind: "monsoon", title: "第三次季风", targetExp: 44, requiredRainRanks: 12 },
  { id: "monsoon_4", kind: "monsoon", title: "第四次季风", targetExp: 60, requiredRainRanks: 13 },
  {
    id: "storm_front_1",
    kind: "stormFront",
    title: "第一风暴前线",
    targetExp: 82,
    requiredRainRanks: 14,
    requiredMonsoonsInFront: 4,
  },
  { id: "monsoon_5", kind: "monsoon", title: "第五次季风", targetExp: 98, requiredRainRanks: 14 },
  { id: "monsoon_6", kind: "monsoon", title: "第六次季风", targetExp: 118, requiredRainRanks: 15 },
  {
    id: "storm_front_2",
    kind: "stormFront",
    title: "第二风暴前线",
    targetExp: 142,
    requiredRainRanks: 16,
    requiredMonsoonsInFront: 2,
  },
  { id: "monsoon_7", kind: "monsoon", title: "第七次季风", targetExp: 158, requiredRainRanks: 16 },
  { id: "monsoon_8", kind: "monsoon", title: "第八次季风", targetExp: 176, requiredRainRanks: 17 },
  {
    id: "climate_rewrite_1",
    kind: "climateRewrite",
    title: "第一次气候改写",
    targetExp: 192,
    requiredStormFronts: 2,
  },
  { id: "monsoon_9", kind: "monsoon", title: "第九次季风", targetExp: 212, requiredRainRanks: 18 },
  {
    id: "storm_front_3",
    kind: "stormFront",
    title: "第三风暴前线",
    targetExp: 232,
    requiredRainRanks: 20,
    requiredMonsoonsInFront: 1,
  },
  {
    id: "climate_rewrite_2",
    kind: "climateRewrite",
    title: "第二次气候改写",
    targetExp: 252,
    requiredStormFronts: 3,
  },
  { id: "sky_pulse_1", kind: "skyPulse", title: "天空心脏脉冲 I", targetExp: 270 },
  { id: "sky_pulse_2", kind: "skyPulse", title: "天空心脏脉冲 II", targetExp: 292 },
  { id: "sky_pulse_3", kind: "skyPulse", title: "天空心脏脉冲 III", targetExp: 302 },
  { id: "sky_heart", kind: "ending", title: "点燃天空心脏", targetExp: 308 },
];
```

#### Acceptance Checks

```text
monsoon_1 不能被影响，仍在 35-60 分钟。
first stormFront 在 55-105 分钟。
first climateRewrite 在 80-150 分钟。
guided-human 终局在 100-240 分钟内。
```

#### Rollback

恢复旧 `MAINLINE_MILESTONES` 表。该改动不影响存档字段，但会影响当前玩家下一目标；上线前应清楚记录 `ECONOMY_VERSION_LABEL` 或 `BALANCE_VERSION`。

---

### 1.8 雨阶压缩可能让季风后旧流程过度秒过

#### Issue

`getRainCompressionExp()` 当前压缩项：

```ts
0.5 * rankCompression
+ 1 * overloadedRain
+ 2 * condensationLaw
+ 0.8 * lowPressure
+ 0.3 permanentCompression
+ 1.5 bulkBonus
```

并且 `MAX_RAIN_COMPRESSION_EXPONENT = 18`。如果后期雨阶几乎瞬间完成，玩家会失去“旧流程被压缩但仍有结构”的体验。

#### Evidence

```text
src/game/economy/constants.ts
  MAX_RAIN_COMPRESSION_EXPONENT = 18

src/game/economy/resets.ts
  getRainCompressionExp()
  getRainRankBulk()
```

#### Code Locations

```text
src/game/economy/constants.ts
  MAX_RAIN_COMPRESSION_EXPONENT

src/game/economy/resets.ts
  getRainCompressionExp()
```

#### Proposed Change

此项为 P1，只有在模拟显示第 14/20/25 雨阶几乎同时触发时再改：

```ts
// src/game/economy/constants.ts
export const MAX_RAIN_COMPRESSION_EXPONENT = 12; // was 18
```

```ts
// src/game/economy/resets.ts
const permanentCompression = state.permanentUpgrades.includes("rankCompressionCore") ? 0.3 : 0;
const bulkBonus = state.permanentUpgrades.includes("bulkRainRank") ? 1.0 : 0; // was 1.5
const value = 0.45 * state.upgrades.rankCompression
  + 0.8 * state.upgrades.overloadedRain
  + 1.5 * state.climateLaws.condensationLaw
  + 0.6 * state.pressureUpgrades.lowPressure
  + permanentCompression
  + bulkBonus;
```

#### Acceptance Checks

```text
季风后回到雨阶 10 应明显快于第一轮，但不应在 5 秒内直接跨完全部可用雨阶。
getRainRankBulk() 每 tick 最多跨 5 阶的限制保留。
```

#### Rollback

恢复旧 cap 与系数。

---

## 2. Simulation Plan

### 2.1 Add hard and soft balance gates

#### Strategy / Gate

新增 `BALANCE_GATES`，让模拟器不仅检查是否通关，也检查是否太快、太慢、静默过久、阶段压缩过强。

#### Code Locations

```text
scripts/simulate-weather-strategies.mjs
  top-level constants after RANK_MILESTONES
  simulateStrategy()
  runStrategyAction()
  printResult()
  final result checks near process.exitCode
```

#### Algorithm

新增 gate 配置：

```js
const BALANCE_GATES = {
  hard: {
    maxQuietSeconds: 10 * 60,
    guided: {
      mustReachEnding: true,
      minSkyHeartAt: 100 * 60,
      maxSkyHeartAt: 240 * 60,
      minFirstMonsoonAt: 35 * 60,
      maxFirstMonsoonAt: 60 * 60,
      minFirstStormAt: 55 * 60,
      minFirstClimateAt: 80 * 60,
    },
    roi: {
      mustReachEnding: true,
      minSkyHeartAt: 75 * 60,
      maxSkyHeartAt: 210 * 60,
    },
    comfort: {
      mustReachEnding: true,
      maxSkyHeartAt: 4 * 60 * 60,
    },
    bad: {
      mustReachEnding: true,
      maxSkyHeartAt: 5 * 60 * 60,
    },
  },
  softTargets: {
    rain1: [4 * 60, 12 * 60],
    rain3: [10 * 60, 24 * 60],
    rain6: [18 * 60, 35 * 60],
    rain8: [24 * 60, 42 * 60],
    rain10: [30 * 60, 52 * 60],
    firstMonsoon: [35 * 60, 60 * 60],
    firstStormFront: [55 * 60, 105 * 60],
    firstClimateRewrite: [80 * 60, 150 * 60],
    skyHeart: [100 * 60, 240 * 60],
  },
};
```

给 `simulateStrategy()` 增加 `milestoneAt` 记录：

```js
function createMilestoneAt() {
  return {
    firstMonsoon: null,
    firstStormFront: null,
    firstClimateRewrite: null,
    skyPulse1: null,
    skyPulse2: null,
    skyPulse3: null,
    skyHeart: null,
  };
}
```

在 `runStrategyAction()` 执行 reset 或 sky pulse 时记录：

```js
if (canRunMonsoon(state)) {
  const beforeTotalMonsoons = state.totalMonsoonCycles;
  // existing reset...
  if (beforeTotalMonsoons === 0) milestoneAt.firstMonsoon ??= second;
}

if (canRunStormFront(state)) {
  const beforeFronts = state.totalStormFronts;
  // existing reset...
  if (beforeFronts === 0) milestoneAt.firstStormFront ??= second;
}

if (canRunClimateRewrite(state)) {
  const beforeRewrites = state.totalClimateRewrites;
  // existing reset...
  if (beforeRewrites === 0) milestoneAt.firstClimateRewrite ??= second;
}
```

Because `runStrategyAction()` currently does not receive `milestoneAt`, update signature:

```js
function runStrategyAction(state, strategy, second, purchases, events, milestoneAt) { ... }
```

Then update caller inside `simulateStrategy()`.

Add gate evaluation:

```js
function evaluateBalanceGates(results) {
  const failures = [];

  for (const result of results) {
    if (result.maxQuietSeconds > BALANCE_GATES.hard.maxQuietSeconds) {
      failures.push(`${result.name}: max quiet ${formatTime(result.maxQuietSeconds)} > ${formatTime(BALANCE_GATES.hard.maxQuietSeconds)}`);
    }
  }

  const byName = Object.fromEntries(results.map((result) => [result.name, result]));
  checkStrategyGate(failures, byName["guided-human"], BALANCE_GATES.hard.guided);
  checkStrategyGate(failures, byName["roi-greedy"], BALANCE_GATES.hard.roi);
  checkStrategyGate(failures, byName["comfort-first"], BALANCE_GATES.hard.comfort);
  checkStrategyGate(failures, byName["bad-but-plausible"], BALANCE_GATES.hard.bad);

  return failures;
}

function checkStrategyGate(failures, result, gate) {
  if (!result) return;
  if (gate.mustReachEnding && !result.skyHeartAt) {
    failures.push(`${result.name}: did not reach sky heart`);
  }
  if (gate.minSkyHeartAt && result.skyHeartAt && result.skyHeartAt < gate.minSkyHeartAt) {
    failures.push(`${result.name}: sky heart too fast ${formatTime(result.skyHeartAt)} < ${formatTime(gate.minSkyHeartAt)}`);
  }
  if (gate.maxSkyHeartAt && (!result.skyHeartAt || result.skyHeartAt > gate.maxSkyHeartAt)) {
    failures.push(`${result.name}: sky heart too slow ${formatTime(result.skyHeartAt)} > ${formatTime(gate.maxSkyHeartAt)}`);
  }
  if (gate.minFirstMonsoonAt && result.milestoneAt.firstMonsoon && result.milestoneAt.firstMonsoon < gate.minFirstMonsoonAt) {
    failures.push(`${result.name}: first monsoon too fast ${formatTime(result.milestoneAt.firstMonsoon)}`);
  }
  if (gate.maxFirstMonsoonAt && (!result.milestoneAt.firstMonsoon || result.milestoneAt.firstMonsoon > gate.maxFirstMonsoonAt)) {
    failures.push(`${result.name}: first monsoon too slow ${formatTime(result.milestoneAt.firstMonsoon)}`);
  }
  if (gate.minFirstStormAt && result.milestoneAt.firstStormFront && result.milestoneAt.firstStormFront < gate.minFirstStormAt) {
    failures.push(`${result.name}: first storm front too fast ${formatTime(result.milestoneAt.firstStormFront)}`);
  }
  if (gate.minFirstClimateAt && result.milestoneAt.firstClimateRewrite && result.milestoneAt.firstClimateRewrite < gate.minFirstClimateAt) {
    failures.push(`${result.name}: first climate rewrite too fast ${formatTime(result.milestoneAt.firstClimateRewrite)}`);
  }
}
```

At end:

```js
const failures = evaluateBalanceGates(results);
if (failures.length > 0) {
  console.log("Balance gate failures:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
```

#### Output Metrics

Add to each result:

```text
firstMonsoonAt
firstStormFrontAt
firstClimateRewriteAt
skyPulse1/2/3At
skyHeartAt
maxQuietSeconds
rankAt[1/3/6/8/10/14/16/20/25]
layer bonus snapshot at each major reset
max upgrade levels by id
```

#### Acceptance Checks

```bash
npm run simulate:weather-strategies
```

Should print `Balance gates: PASS` or a readable failure list.

---

### 2.2 Add `new-player-visible` strategy

#### Strategy / Gate

新增策略：`new-player-visible`。它代表“不看攻略、只买当前看起来最显眼按钮”的玩家。当前 `bad-but-plausible` 已有类似方向，但它仍有手写路线。`new-player-visible` 应尽量贴近 UI 当前展示顺序。

#### Code Locations

```text
scripts/simulate-weather-strategies.mjs
  strategies array
  new function getVisibleButtonRunOrder()
```

#### Algorithm

```js
{
  name: "new-player-visible",
  description: "按 UI 显示组顺序购买当前可买卡片，不做 ROI，不主动优化中层资源。",
  runOrder: getVisibleButtonRunOrder,
  permanentOrder: [
    "drizzleMemory",
    "dropletEcho",
    "cloudAutoTouch",
    "rainRankMastery",
    "autoRainRank",
    "bulkRainRank",
    "livingSoil",
    "rankCompressionCore",
    "monsoonLens",
    "windEyeMemory",
    "cloudCorePrism",
    "returningMonsoonCore",
  ],
  pressureOrder: ["lowPressure", "updraft", "pressureGauge", "eyeWall", "frontCompression"],
  stormOrder: ["frontMemory", "rainOverload", "stormBatch", "thunderUpdraft", "frontScar", "windEyeRelic", "stormPrism"],
  climateOrder: ["condensationLaw", "deepRootLaw", "returningMonsoon", "cloudCoreRefraction", "stormWeaving", "skyHeartOmen", "climateCodex"],
  resetFirst: false,
}
```

```js
function getVisibleButtonRunOrder(state) {
  const visibleByGroup = [
    ["cloudTouch", "dropletSeed", "weatherAmplifier"],
    ["rootWake", "cloudBloom", "windEye", "heavyRain"],
    ["monsoonPull"],
    ["autoDrizzle", "autoRank", "rankCompression", "monsoonFocus", "stormMemory"],
    ["pressureGaugeRun", "frontRain", "thunderReturn", "overloadedRain"],
    ["climateEcho", "deepVapor", "highCirculation", "skyWarmup"],
  ];

  return visibleByGroup.flat().filter((upgradeId) => isUpgradeVisible(state, upgradeId));
}
```

#### Output Metrics

```text
Does it finish?
Where does it lag compared with guided-human?
Max quiet period.
Which upgrade reaches abnormal max level?
```

#### Acceptance Checks

```text
new-player-visible should reach first monsoon within 75 minutes.
new-player-visible should reach 1e308 within 5 hours, or at minimum reach first climate rewrite within 3 hours.
new-player-visible max quiet <= 10 minutes.
```

---

### 2.3 Add `delayed-human` strategy with imperfect clicking and reaction delay

#### Strategy / Gate

当前模拟器 `tickState()` 每当点击冷却结束就自动点击，这相当于完美 2 秒点击节奏。真实玩家不会这样。新增 `delayed-human` 测试周末上线的低操作容错。

#### Code Locations

```text
scripts/simulate-weather-strategies.mjs
  strategies array
  tickState()
  simulateStrategy()
```

#### Algorithm

给 strategy 增加字段：

```js
manualClickIntervalSeconds: 3,
actionCooldownSeconds: 2,
```

在 `simulateStrategy()` 中维护：

```js
let nextManualClickAt = 0;
let nextActionAt = 0;
```

修改 `tickState()`：

```js
function tickState(state, seconds, strategy, second, runtime) {
  if (second >= runtime.nextManualClickAt && state.clickCooldownRemaining <= 0) {
    Object.assign(state, applyCloudTouch(state));
    runtime.nextManualClickAt = second + (strategy.manualClickIntervalSeconds ?? 2);
  }

  Object.assign(state, runTick(state, seconds));
}
```

修改 action loop：

```js
if (second < runtime.nextActionAt) {
  continue;
}

const action = runStrategyAction(...);
if (action) {
  runtime.nextActionAt = second + (strategy.actionCooldownSeconds ?? 0);
}
```

新增策略：

```js
{
  name: "delayed-human",
  description: "每 3 秒点击一次，行动间隔 2 秒，模拟不专注玩家。",
  runOrder: getGuidedRunOrder,
  permanentOrder: strategies[0].permanentOrder,
  pressureOrder: strategies[0].pressureOrder,
  stormOrder: strategies[0].stormOrder,
  climateOrder: strategies[0].climateOrder,
  resetFirst: false,
  manualClickIntervalSeconds: 3,
  actionCooldownSeconds: 2,
}
```

#### Output Metrics

```text
first monsoon time
first stormFront time
first climateRewrite time
ending time
max quiet
```

#### Acceptance Checks

```text
delayed-human first monsoon <= 75 minutes。
delayed-human skyHeart <= 5 hours 或至少 climateRewrite1 <= 3 hours。
```

---

### 2.4 Add layer bonus snapshots at major events

#### Strategy / Gate

现在 `printResult()` 只输出最终 layer orders。需要知道“到底是哪一层在某个阶段爆穿”。

#### Code Locations

```text
scripts/simulate-weather-strategies.mjs
  simulateStrategy()
  runStrategyAction()
  printResult()
```

#### Algorithm

新增 snapshot：

```js
function createLayerSnapshot(state, second, label) {
  const layer = getLayerBonusBreakdown(state);
  return {
    second,
    label,
    weatherExp: log10Safe(state.resources.weather),
    rateLog: calculateWeatherPerSecondLog(state),
    cloudCore: layer.cloudCore,
    pressure: layer.pressure,
    storm: layer.storm,
    climate: layer.climate,
    skyHeart: layer.skyHeart,
    total: layer.total,
    rainRanks: state.rainRanks,
    monsoonCycles: state.totalMonsoonCycles,
    stormFronts: state.totalStormFronts,
    climateRewrites: state.totalClimateRewrites,
  };
}
```

When event occurs:

```js
snapshots.push(createLayerSnapshot(state, second, milestone.title));
```

Print:

```js
console.log("  layer snapshots:");
for (const snap of result.snapshots) {
  console.log(
    `    - ${formatTime(snap.second)} ${snap.label}: weather 1e${snap.weatherExp.toFixed(1)}, rate 1e${snap.rateLog.toFixed(1)}, `
    + `layers c${snap.cloudCore.toFixed(1)} p${snap.pressure.toFixed(1)} s${snap.storm.toFixed(1)} cl${snap.climate.toFixed(1)} sky${snap.skyHeart.toFixed(1)}`
  );
}
```

#### Output Metrics

```text
每个 reset / sky pulse 的 layer breakdown
当前天气指数
当前速率指数
当前 rainRanks / monsoon / storm / climate counts
```

#### Acceptance Checks

每次调参后，能够看出：

```text
第一风暴前线过快是否由 pressure 导致。
第一次气候改写过快是否由 storm 导致。
终局过快是否由 climate 或 skyHeart 导致。
```

---

### 2.5 Add upgrade repetition gate

#### Strategy / Gate

如果某个本轮升级被买到极高等级，说明经济被一个按钮统治。当前最可疑的是：

```text
monsoonPull
weatherAmplifier
dropletSeed
frontRain
thunderReturn
climateEcho
```

#### Code Locations

```text
scripts/simulate-weather-strategies.mjs
  createPurchaseLog()
  formatPurchaseSummary()
  evaluateBalanceGates()
```

#### Algorithm

```js
const MAX_REASONABLE_LEVELS = {
  monsoonPull: 25,
  weatherAmplifier: 80,
  dropletSeed: 120,
  frontRain: 8,
  thunderReturn: 8,
  climateEcho: 8,
};

function getMaxLevels(purchases) {
  const levels = {};
  for (const purchase of purchases) {
    levels[purchase.id] = Math.max(levels[purchase.id] ?? 0, purchase.level);
  }
  return levels;
}
```

Gate:

```js
for (const [upgradeId, maxLevel] of Object.entries(MAX_REASONABLE_LEVELS)) {
  if ((result.maxLevels[upgradeId] ?? 0) > maxLevel) {
    failures.push(`${result.name}: ${upgradeId} Lv.${result.maxLevels[upgradeId]} exceeds ${maxLevel}`);
  }
}
```

#### Output Metrics

```text
max levels for all upgrades
failure if suspicious upgrade dominates
```

#### Acceptance Checks

```text
No single run upgrade should be required at hundreds of levels for weekend balance.
monsoonPull should not be the dominant path to 1e308.
```

---

## 3. UI Refactor Plan

### 3.1 Left panel has too many always-on numbers and debug details

#### Issue

Left panel currently always shows:

```text
version
run timer
passive/measured rate
bestWeather orders
layer orders
7 resource summary cards
next goal card
4 resource detail rows
formula summary with 5 layer breakdown entries
pause/exact/reset controls
```

This is too dense for launch. Most players need: current weather, current rate, next goal, current reset layer, and one recommendation. Debug details should be collapsible.

#### Evidence

```text
src/App.tsx
  left aside .weather-panel--left renders run-timer, weather-summary, goal-card, resource-stack, formula-summary, panel-controls

src/styles/app.css
  .weather-summary grid repeats 3 columns
  .resource-stack always visible
  .formula-summary always visible
```

#### Code Locations

```text
src/App.tsx
  <aside className="weather-panel weather-panel--left">
    .run-timer
    .weather-summary
    .goal-card
    .resource-stack
    .formula-summary
    .panel-controls

src/styles/app.css
  .run-timer
  .weather-summary
  .resource-stack
  .formula-summary
```

#### Proposed Change

P0 minimal change without full component split:

1. Keep always visible:

```text
weather vitality
weather/s
rainRanks
current mainline title + progress
run timer
pause/exact/reset
```

2. Hide by default in `<details>`:

```text
resource-stack
formula-summary
bestWeatherExp / layer orders debug line
```

3. Only show meta resources when nonzero or relevant:

```tsx
const visibleSummaryItems = [
  { label: "天气活力", value: displayNumber(state.resources.weather), always: true },
  { label: "雨阶", value: displayNumber(state.rainRanks), always: true },
  { label: "季风", value: displayNumber(state.totalMonsoonCycles), always: state.totalMonsoonCycles > 0 },
  { label: "云核", value: `${displayNumber(state.cloudCores)}/${displayNumber(state.totalCloudCores)}`, always: state.totalCloudCores > 0 },
  { label: "气压", value: displayNumber(state.pressure), always: state.pressure > 0 || state.totalMonsoonCycles >= 2 },
  { label: "风暴胞", value: `${displayNumber(state.stormCells)}/${displayNumber(state.totalStormCells)}`, always: state.totalStormCells > 0 },
  { label: "气候织线", value: `${displayNumber(state.climateThreads)}/${displayNumber(state.totalClimateThreads)}`, always: state.totalClimateThreads > 0 },
].filter((item) => item.always);
```

Replace static `weather-summary` JSX with mapping.

Formula details:

```tsx
<details className="formula-drawer">
  <summary>公式与层级 breakdown</summary>
  <section className="formula-summary">
    ...existing formula summary...
  </section>
</details>
```

Resource details:

```tsx
<details className="resource-drawer">
  <summary>资源详情</summary>
  <section className="resource-stack">...</section>
</details>
```

Move `最高 orders` line into formula drawer:

```tsx
<small>
  最高 {state.bestWeatherExp.toFixed(2)} orders · 层级 +{layerBonuses.total.toFixed(1)} orders
</small>
```

#### Component Split

P1 split into:

```text
src/ui/StatusPanel.tsx
```

Migrated JSX:

```text
weather-brand
run-timer
weather-summary
goal-card
resource-drawer
formula-drawer trigger
panel-controls
```

Props:

```ts
interface StatusPanelProps {
  state: WeatherReactorState & { notice: NoticeState | null };
  rates: Record<ResourceKey, number>;
  layerBonuses: LayerBonusBreakdown;
  nextGoal: ReturnType<typeof getNextGoal>;
  currentMilestone: MainlineMilestone;
  currentMilestoneTargetExp: number;
  measuredWeatherRate: number;
  isPaused: boolean;
  showExactDecimals: boolean;
  onTogglePause: () => void;
  onToggleExact: () => void;
  onResetAll: () => void;
}
```

#### CSS Changes

Add:

```css
.formula-drawer,
.resource-drawer {
  border: 2px solid rgba(53, 85, 106, 0.12);
  border-radius: 8px;
  background: rgba(247, 251, 255, 0.62);
  box-shadow: 0 3px 0 rgba(53, 85, 106, 0.08);
}

.formula-drawer > summary,
.resource-drawer > summary {
  padding: 10px 12px;
  color: var(--ink);
  font-weight: 900;
  cursor: pointer;
}

.formula-drawer .formula-summary,
.resource-drawer .resource-stack {
  margin: 0;
  padding: 10px;
  border: 0;
  box-shadow: none;
}

.weather-summary--compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

Keep existing classes:

```text
.weather-shell
.weather-panel
.weather-summary
.goal-card
.run-timer
.formula-summary
.reactor-resource
```

Do not rename them in P0.

#### Acceptance Checks

```text
New player sees next goal without scrolling.
Left panel no longer shows formula breakdown unless opened.
Zero-value pressure/storm/climate resources do not appear before relevant stages.
Exact debug still accessible.
```

---

### 3.2 Middle column shows all reset layers at once

#### Issue

`App.tsx` currently renders rain rank, monsoon, storm front, climate rewrite, sky pulse, and sky heart cards all in the center column. Even disabled cards are visible. This tells the player too much too early and makes the current action visually compete with future systems.

#### Evidence

```text
src/App.tsx
  .monsoon-card for rain rank
  .monsoon-card for monsoon
  .monsoon-card for storm front
  .monsoon-card for climate rewrite
  .monsoon-card for sky pulse
  .endgame-card for sky heart
```

#### Code Locations

```text
src/App.tsx
  center <section className="island-reactor">
    reset card JSX after .reactor-column

src/styles/app.css
  .monsoon-card
  .endgame-card
  .monsoon-card--ready
  .endgame-card--ready
```

#### Proposed Change

P0: conditionally render only relevant reset cards.

Add helpers in `App.tsx` before return:

```ts
const shouldShowRainRankCard = !state.skyHeartAwakened && state.rainRanks < 25;
const shouldShowMonsoonCard = currentMilestone.kind === "monsoon" || state.totalMonsoonCycles > 0;
const shouldShowStormFrontCard = currentMilestone.kind === "stormFront" || state.totalStormFronts > 0;
const shouldShowClimateCard = currentMilestone.kind === "climateRewrite" || state.totalClimateRewrites > 0;
const shouldShowSkyPulseCard = currentMilestone.kind === "skyPulse" || state.skyHeartPulseLevel > 0;
const shouldShowEndgameCard = currentMilestone.kind === "ending" || state.bestWeatherExp >= 250 || state.skyHeartAwakened;
```

Wrap each card:

```tsx
{shouldShowRainRankCard ? <Rain rank card JSX> : null}
{shouldShowMonsoonCard ? <Monsoon card JSX> : null}
{shouldShowStormFrontCard ? <Storm front card JSX> : null}
...
```

P1 component split:

```text
src/ui/ResetCards.tsx
```

Responsibilities:

```text
Render current reset layer cards.
Hide irrelevant future reset cards.
Keep all reset handlers from App as props.
```

Props:

```ts
interface ResetCardsProps {
  state: ReactorState;
  currentMilestone: MainlineMilestone;
  currentMilestoneTargetExp: number;
  nextRainRankRequirement: number;
  canClaimRainRank: boolean;
  canRunMonsoon: boolean;
  canRunStormFront: boolean;
  canRunClimateRewrite: boolean;
  canBuySkyHeartPulse: boolean;
  canAwakenSkyHeart: boolean;
  cloudCoreGain: number;
  stormCellGain: number;
  climateThreadGain: number;
  skyHeartProgress: number;
  displayNumber: (value: number) => string;
  onClaimRainRank: () => void;
  onRunMonsoon: () => void;
  onRunStormFront: () => void;
  onRunClimateRewrite: () => void;
  onBuySkyHeartPulse: () => void;
  onAwakenSkyHeart: () => void;
}
```

#### CSS Changes

Add card stack class:

```css
.reset-card-stack {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
}

.monsoon-card--future {
  opacity: 0.5;
}
```

Use:

```tsx
<div className="reset-card-stack">...</div>
```

#### Acceptance Checks

```text
At new game, only rain rank card and maybe monsoon card after relevant unlock are visible.
Storm front card appears only when current milestone is stormFront or after first stormFront.
Climate card appears only when current milestone is climateRewrite or after first climateRewrite.
Sky pulse card appears only when current milestone is skyPulse or after pulse progress.
No reset action is removed; only hidden before relevance.
```

---

### 3.3 Right upgrade panel gets noisy after meta layers unlock

#### Issue

Right panel currently displays:

```text
run upgrades
cloud core permanent upgrades
pressure upgrades if totalMonsoonCycles >= 2 or pressure > 0
storm upgrades if totalStormFronts > 0 or stormCells > 0
climate laws if totalClimateRewrites > 0 or climateThreads > 0
```

Once layers unlock, this produces many cards. Because each card includes title, description, preview rate, and cost, the panel becomes scroll-heavy. The current group recommendation also picks the first unlocked group with an affordable upgrade, so cheap old upgrades can steal attention from the current milestone group.

#### Evidence

```text
src/App.tsx
  right aside .weather-panel--right renders multiple full sections
  activeUpgradeGroup selected by selectedUpgradeGroupId and getRecommendedUpgradeGroupId()

src/game/economy/upgrades.ts
  getRecommendedUpgradeGroupId() returns first affordable group in unlockedGroups order

src/styles/app.css
  .upgrade-card min-height 122px
  .upgrade-list always full grid
```

#### Code Locations

```text
src/App.tsx
  weather-panel--right
  upgrade-group-tabs
  upgrade-list sections

src/game/economy/upgrades.ts
  getRecommendedUpgradeGroupId()

src/styles/app.css
  .upgrade-card
  .upgrade-group-tabs
  .upgrade-list
```

#### Proposed Change

##### A. Prioritize current milestone group in recommendation

Modify `getRecommendedUpgradeGroupId()` in `src/game/economy/upgrades.ts`.

Add current-stage priority before affordable fallback:

```ts
export function getRecommendedUpgradeGroupId(
  state: WeatherReactorState,
  unlockedGroups: UpgradeGroupDefinition[],
): UpgradeGroupId {
  const priority = getUpgradeGroupPriorityForState(state);
  const priorityGroup = priority.find((groupId) => unlockedGroups.some((group) => group.id === groupId));
  if (priorityGroup) {
    const hasVisibleAction = getGroup(priorityGroup)?.upgradeIds.some((upgradeId) => {
      if (!isUpgradeVisible(state, upgradeId)) return false;
      return canAfford(state.resources, getUpgradeCost(state, getUpgrade(upgradeId)));
    });
    if (hasVisibleAction) return priorityGroup;
  }

  const affordableGroup = unlockedGroups.find((group) => group.upgradeIds.some((upgradeId) => {
    if (!isUpgradeVisible(state, upgradeId)) {
      return false;
    }

    return canAfford(state.resources, getUpgradeCost(state, getUpgrade(upgradeId)));
  }));

  return affordableGroup?.id ?? priorityGroup ?? unlockedGroups[unlockedGroups.length - 1]?.id ?? "rainRank";
}

function getUpgradeGroupPriorityForState(state: WeatherReactorState): UpgradeGroupId[] {
  if (state.totalClimateRewrites > 0) {
    return ["climateRun", "stormFrontRun", "automation", "monsoonSprint", "producerChain", "rainRank"];
  }
  if (state.totalStormFronts > 0 || state.totalMonsoonCycles >= 2) {
    return ["stormFrontRun", "automation", "monsoonSprint", "producerChain", "rainRank"];
  }
  if (state.rainRanks >= 10 || state.totalMonsoonCycles > 0) {
    return ["monsoonSprint", "automation", "producerChain", "rainRank"];
  }
  if (state.rainRanks >= 1) {
    return ["producerChain", "rainRank"];
  }
  return ["rainRank"];
}

function getGroup(groupId: UpgradeGroupId) {
  return UPGRADE_GROUPS.find((group) => group.id === groupId);
}
```

##### B. Collapse meta sections by default

In `App.tsx`, wrap pressure/storm/climate sections with `<details>`:

```tsx
{state.totalMonsoonCycles >= 2 || state.pressure > 0 ? (
  <details className="upgrade-layer-section" open={state.pressure > 0 && currentMilestone.kind !== "stormFront"}>
    <summary>气压升级</summary>
    <div className="upgrade-list">...</div>
  </details>
) : null}
```

Better default open logic:

```ts
const shouldOpenPressureSection = state.pressure > 0 && state.totalStormFronts === 0;
const shouldOpenStormSection = state.stormCells > 0 && state.totalClimateRewrites === 0;
const shouldOpenClimateSection = state.climateThreads > 0;
```

##### C. Weaken unaffordable cards visually

In upgrade-card class assignment:

```tsx
className={[
  "upgrade-card",
  affordable ? "upgrade-card--ready" : "upgrade-card--weak",
].filter(Boolean).join(" ")}
```

Do this for run, permanent, pressure, storm, and climate cards.

#### Component Split

P1 split:

```text
src/ui/UpgradePanel.tsx
```

Migrated JSX:

```text
right aside .weather-panel--right
run upgrade tabs + visibleRunUpgrades
cloud core permanent upgrade section
pressure section
storm section
climate section
```

Subcomponents optional:

```text
src/ui/UpgradeCard.tsx
src/ui/LayerUpgradeSection.tsx
```

#### CSS Changes

```css
.upgrade-layer-section {
  display: grid;
  gap: 10px;
}

.upgrade-layer-section > summary {
  padding: 10px 12px;
  border: 2px solid rgba(53, 85, 106, 0.12);
  border-radius: 8px;
  color: var(--ink);
  background: rgba(247, 251, 255, 0.76);
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 3px 0 rgba(53, 85, 106, 0.08);
}

.upgrade-card--weak {
  opacity: 0.66;
}

.upgrade-card--weak:not(:disabled):hover {
  opacity: 0.84;
}
```

Optional card height reduction:

```css
.upgrade-card {
  min-height: 104px; /* was 122px */
}
```

#### Acceptance Checks

```text
At any stage, right panel first visible group should align with current mainline goal.
Unpayable future cards should not dominate visual attention.
Pressure/storm/climate sections should not all be fully open at once by default.
Players can still manually open all sections.
```

---

### 3.4 Formula preview displays useful data, but should be debug-first rather than always-on

#### Issue

Formula breakdown is valuable for development but too technical for a weekend public build. `天气活力/s = base × 10^layerBonus` and five layer orders are useful once players reach meta layers, but not in the first 30 minutes.

#### Evidence

```text
src/App.tsx
  .formula-summary always visible in left panel

src/styles/app.css
  .formula-summary is normal card, not drawer
```

#### Code Locations

```text
src/App.tsx
  formula-summary JSX

src/styles/app.css
  .formula-summary
```

#### Proposed Change

Move formula summary into `FormulaDrawer`.

P0 inline version:

```tsx
<details className="formula-drawer" open={showExactDecimals}>
  <summary>公式摘要 / 调试</summary>
  <section className="formula-summary">
    ...existing formula summary...
    <small>
      最高 {state.bestWeatherExp.toFixed(2)} orders · 层级 +{layerBonuses.total.toFixed(1)} orders
    </small>
  </section>
</details>
```

P1 component:

```text
src/ui/FormulaDrawer.tsx
```

Props:

```ts
interface FormulaDrawerProps {
  state: WeatherReactorState;
  baseFormulaLog: number;
  layerBonuses: LayerBonusBreakdown;
  showExactDecimals: boolean;
}
```

#### CSS Changes

Use CSS from 3.1.

#### Acceptance Checks

```text
Formula detail does not appear by default for new players.
Exact display mode opens or highlights formula drawer.
Layer breakdown remains available for tester/debugger.
```

---

## 4. Progression Feedback Plan

### 4.1 Feature: Island Mood computed progression stage

#### Feature

Add a minimal, non-numeric “空岛天气/生态阶段反馈系统”。It should not affect economy in the weekend build. It only changes:

```text
背景色/天空状态
云层状态
雨/风/风暴 effects
short flavor copy
CSS mood class
```

#### Trigger

Computed from `WeatherReactorState`; no persistent state field needed.

Recommended stages:

| Stage ID | Trigger | Meaning |
|---|---|---|
| `dryStart` | `rainRanks === 0 && totalMonsoonCycles === 0` | 空岛干燥，只有第一片云。 |
| `firstRain` | `rainRanks >= 1 && rainRanks < 3 && totalMonsoonCycles === 0` | 第一场雨已经落下。 |
| `rootedRain` | `rainRanks >= 3 || upgrades.rootWake > 0 || upgrades.cloudBloom > 0` before monsoon | 根系/云团开始复苏。 |
| `windEye` | `rainRanks >= 6 || upgrades.windEye > 0` before monsoon | 风眼出现，天气链闭合。 |
| `monsoon` | `totalMonsoonCycles >= 1 && totalStormFronts === 0` | 季风循环开始压缩旧流程。 |
| `stormFront` | `totalStormFronts >= 1 || pressure > 0 || currentMilestone.kind === "stormFront"` | 多个季风组织成风暴前线。 |
| `climateRewrite` | `totalClimateRewrites >= 1 || currentMilestone.kind === "climateRewrite"` | 气候法则开始改写公式。 |
| `skyHeart` | `skyHeartPulseLevel > 0 || bestWeatherExp >= 250 || skyHeartAwakened` | 天空心脏进入终局。 |

Ordering matters: evaluate from latest to earliest.

#### Code Locations

Add:

```text
src/game/economy/progression.ts
```

Modify:

```text
src/game/economy/index.ts
src/App.tsx
src/styles/app.css
```

Optional P1 component:

```text
src/ui/IslandMoodStage.tsx
```

#### UI Behavior

Stage behavior table:

| Stage | Background / sky | Cloud state | Rain/wind/storm effect | Text | Numeric effect |
|---|---|---|---|---|---|
| dryStart | pale blue, dry island | small white cloud | none | “干燥空岛等待第一场雨。” | none |
| firstRain | brighter blue | cloud lower and wet | light drizzle lines | “第一场雨开始落下。” | none |
| rootedRain | blue-green tint | cloud + tiny green glow | soft rain | “根系把雨水留在岛上。” | none |
| windEye | stronger contrast | swirling cloud | wind streaks | “风眼把云团拉成循环。” | none |
| monsoon | darker blue/gold | heavy cloud | diagonal rain | “季风开始压缩旧流程。” | none |
| stormFront | storm-blue/violet | turbulent cloud | wind + storm overlay | “风暴前线正在汇合。” | none |
| climateRewrite | teal/violet | abstract sky | slow aurora bands | “气候法则被重新书写。” | none |
| skyHeart | violet/gold | glowing cloud | pulse glow | “天空心脏即将点燃。” | none |

#### Data Model

```ts
// src/game/economy/progression.ts
import { getCurrentMainlineMilestone } from "./resets.ts";
import type { WeatherReactorState } from "./types.ts";

export type IslandMoodId =
  | "dryStart"
  | "firstRain"
  | "rootedRain"
  | "windEye"
  | "monsoon"
  | "stormFront"
  | "climateRewrite"
  | "skyHeart";

export interface IslandMood {
  id: IslandMoodId;
  className: string;
  title: string;
  subtitle: string;
  skyLabel: string;
  effect: "none" | "drizzle" | "rain" | "wind" | "storm" | "aurora" | "pulse";
}

export function getIslandMood(state: WeatherReactorState): IslandMood {
  const milestone = getCurrentMainlineMilestone(state);

  if (state.skyHeartAwakened || state.skyHeartPulseLevel > 0 || state.bestWeatherExp >= 250) {
    return {
      id: "skyHeart",
      className: "mood-sky-heart",
      title: "天空心脏正在苏醒",
      subtitle: "所有天气循环都在向 1e308 汇聚。",
      skyLabel: "终局脉冲",
      effect: "pulse",
    };
  }

  if (state.totalClimateRewrites > 0 || milestone.kind === "climateRewrite") {
    return {
      id: "climateRewrite",
      className: "mood-climate-rewrite",
      title: "气候法则正在改写",
      subtitle: "雨阶、风暴和云核开始进入新的公式。",
      skyLabel: "气候改写",
      effect: "aurora",
    };
  }

  if (state.totalStormFronts > 0 || state.pressure > 0 || milestone.kind === "stormFront") {
    return {
      id: "stormFront",
      className: "mood-storm-front",
      title: "风暴前线正在汇合",
      subtitle: "多次季风被收束成更大的天气结构。",
      skyLabel: "风暴前线",
      effect: "storm",
    };
  }

  if (state.totalMonsoonCycles > 0) {
    return {
      id: "monsoon",
      className: "mood-monsoon",
      title: "季风循环已经形成",
      subtitle: "云核开始接管旧流程。",
      skyLabel: "季风循环",
      effect: "rain",
    };
  }

  if (state.rainRanks >= 6 || state.upgrades.windEye > 0) {
    return {
      id: "windEye",
      className: "mood-wind-eye",
      title: "风眼牵引云团",
      subtitle: "生产者链已经闭合，季风正在靠近。",
      skyLabel: "风眼",
      effect: "wind",
    };
  }

  if (state.rainRanks >= 3 || state.upgrades.rootWake > 0 || state.upgrades.cloudBloom > 0) {
    return {
      id: "rootedRain",
      className: "mood-rooted-rain",
      title: "雨水开始滋养根系",
      subtitle: "空岛生态把雨滴转成持续天气活力。",
      skyLabel: "生态复苏",
      effect: "drizzle",
    };
  }

  if (state.rainRanks >= 1) {
    return {
      id: "firstRain",
      className: "mood-first-rain",
      title: "第一场雨落下",
      subtitle: "雨阶让下一轮天气活力更容易聚集。",
      skyLabel: "初雨",
      effect: "drizzle",
    };
  }

  return {
    id: "dryStart",
    className: "mood-dry-start",
    title: "干燥空岛等待第一场雨",
    subtitle: "点击云层，把第一点天气活力注入空岛。",
    skyLabel: "晴空",
    effect: "none",
  };
}
```

Export:

```ts
// src/game/economy/index.ts
export * from "./progression.ts";
```

App integration:

```tsx
// src/App.tsx import
import { getIslandMood } from "./game/economy";

// inside App()
const islandMood = useMemo(() => getIslandMood(state), [state]);

// main class
<main className={`weather-shell ${islandMood.className}`}>

// island-reactor class
<section className={`island-reactor ${islandMood.className}`} aria-label="空岛天气反应堆">

// replace sky-status
<div className="sky-status island-mood-stage">
  <span>{islandMood.skyLabel}</span>
  <strong>{islandMood.title}</strong>
  <small>{islandMood.subtitle}</small>
  <i className={`island-mood-effect island-mood-effect--${islandMood.effect}`} aria-hidden="true" />
</div>
```

Optional component:

```tsx
// src/ui/IslandMoodStage.tsx
import type { IslandMood } from "../game/economy";

interface IslandMoodStageProps {
  mood: IslandMood;
}

export function IslandMoodStage({ mood }: IslandMoodStageProps) {
  return (
    <div className="sky-status island-mood-stage">
      <span>{mood.skyLabel}</span>
      <strong>{mood.title}</strong>
      <small>{mood.subtitle}</small>
      <i className={`island-mood-effect island-mood-effect--${mood.effect}`} aria-hidden="true" />
    </div>
  );
}
```

#### CSS

Add to `src/styles/app.css`:

```css
.weather-shell.mood-dry-start {
  --sky: #bfe7ff;
}

.weather-shell.mood-first-rain {
  background:
    radial-gradient(ellipse at 18% 18%, rgba(247, 251, 255, 0.64), transparent 20%),
    linear-gradient(180deg, #a9dcff 0%, #e8f8ff 78%, #f7fbff 100%);
}

.weather-shell.mood-rooted-rain {
  background:
    radial-gradient(ellipse at 35% 85%, rgba(127, 189, 104, 0.2), transparent 24%),
    linear-gradient(180deg, #acdfff 0%, #e1fff0 78%, #f7fbff 100%);
}

.weather-shell.mood-wind-eye {
  background:
    radial-gradient(ellipse at 80% 20%, rgba(255, 217, 120, 0.28), transparent 20%),
    repeating-linear-gradient(112deg, transparent 0 42px, rgba(255, 255, 255, 0.24) 42px 45px, transparent 45px 86px),
    linear-gradient(180deg, #9fd6ff 0%, #e8f8ff 76%, #f7fbff 100%);
}

.weather-shell.mood-monsoon {
  background:
    radial-gradient(ellipse at 50% 20%, rgba(53, 85, 106, 0.18), transparent 28%),
    linear-gradient(180deg, #8fc8f0 0%, #d9efff 75%, #f7fbff 100%);
}

.weather-shell.mood-storm-front {
  background:
    radial-gradient(ellipse at 50% 18%, rgba(117, 102, 214, 0.18), transparent 30%),
    linear-gradient(180deg, #7cb6dc 0%, #dbe7ff 78%, #f7fbff 100%);
}

.weather-shell.mood-climate-rewrite {
  background:
    radial-gradient(ellipse at 80% 14%, rgba(117, 102, 214, 0.22), transparent 24%),
    radial-gradient(ellipse at 20% 78%, rgba(34, 184, 216, 0.18), transparent 24%),
    linear-gradient(180deg, #9fcdf5 0%, #eff3ff 78%, #f7fbff 100%);
}

.weather-shell.mood-sky-heart {
  background:
    radial-gradient(ellipse at 50% 24%, rgba(255, 217, 120, 0.34), transparent 25%),
    radial-gradient(ellipse at 72% 16%, rgba(117, 102, 214, 0.28), transparent 22%),
    linear-gradient(180deg, #9ca6ff 0%, #eff1ff 75%, #fff9e7 100%);
}

.island-mood-stage {
  position: relative;
  overflow: hidden;
}

.island-mood-stage small {
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.island-mood-effect {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.45;
}

.island-mood-effect--drizzle,
.island-mood-effect--rain,
.island-mood-effect--storm {
  background: repeating-linear-gradient(108deg, transparent 0 16px, rgba(47, 117, 169, 0.22) 16px 18px, transparent 18px 32px);
}

.island-mood-effect--wind {
  background: repeating-linear-gradient(100deg, transparent 0 44px, rgba(255, 255, 255, 0.44) 44px 47px, transparent 47px 88px);
}

.island-mood-effect--aurora {
  background: linear-gradient(112deg, rgba(34, 184, 216, 0.18), transparent 32%, rgba(117, 102, 214, 0.18), transparent 72%);
}

.island-mood-effect--pulse {
  background: radial-gradient(circle at 80% 20%, rgba(255, 217, 120, 0.42), transparent 34%);
}
```

#### Acceptance Checks

```text
No economy value changes when mood changes.
New game mood is dryStart.
After first rain rank mood becomes firstRain.
At 3 rain ranks or producer unlock, mood becomes rootedRain.
At 6 rain ranks or windEye, mood becomes windEye.
After first monsoon, mood becomes monsoon.
At storm/front pressure stage, mood becomes stormFront.
At climate rewrite stage, mood becomes climateRewrite.
At sky pulse / bestWeatherExp >= 250, mood becomes skyHeart.
```

---

### 4.2 Weekend minimum vs deferred mood work

#### Must Do for weekend

```text
src/game/economy/progression.ts getIslandMood()
App.tsx applies mood class
Replace static sky-status text with mood text
Add 6-8 background CSS classes
No numeric effects
```

#### Defer

```text
Animated particle rain
SVG island art
Canvas/Pixi effects
Audio
Stage-specific gameplay modifiers
Complex cutscenes
```

#### Acceptance Checks

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

Simulation should be unchanged by mood system.

---

## 5. 48-Hour Implementation Order

### P0-1. Add simulation gates and richer output

#### 文件

```text
scripts/simulate-weather-strategies.mjs
```

#### 改动

```text
Add BALANCE_GATES.
Record milestoneAt for first monsoon / first stormFront / first climateRewrite / sky pulses.
Record layer snapshots at major events.
Fail process.exitCode when hard gates fail.
Print balance gate failure list.
```

#### 验收

```bash
npm run simulate:weather-strategies
```

Expected after adding gates but before balance nerfs: likely fails because current ending is too fast. This is acceptable and desired.

#### 预计风险

Low. Script-only change. No game runtime risk.

---

### P0-2. Nerf post-monsoon exponent sources

#### 文件

```text
src/game/economy/constants.ts
src/game/economy/formulas.ts
src/game/economy/upgrades.ts
```

#### 改动

```text
MAX_PRESSURE_EXPONENT_BONUS 30 -> 18
MAX_STORM_EXPONENT_BONUS 85 -> 55
MAX_CLIMATE_EXPONENT_BONUS 130 -> 85
SKY_HEART_PULSE_BONUS_EXPONENTS [32,32,16] -> [24,20,10]
monsoonPull.costGrowth 10 -> 100
getMonsoonPullMultiplier eyeWall 1000 -> 300
getPressureExponentBonus coefficients lowered
getStormCellExponentBonus coefficients lowered
getClimateLawExponentBonus coefficients lowered
```

#### 验收

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

Required:

```text
guided-human reaches 1e308.
roi-greedy does not finish before 75 minutes.
guided-human first monsoon remains 35-60 minutes.
guided-human first stormFront is not before 55 minutes.
guided-human first climateRewrite is not before 80 minutes.
No strategy maxQuiet > 10 minutes.
```

#### 预计风险

Medium. Could make `comfort-first` or `bad-but-plausible` too slow. If so, first rollback sky pulse to `[28,24,12]`, then pressure cap to 22, before undoing storm/climate nerfs.

---

### P0-3. If still too fast, apply fallback milestone table adjustments

#### 文件

```text
src/game/economy/constants.ts
```

#### 改动

Only if P0-2 still yields `guided-human` ending < 100 minutes:

```text
Raise storm_front_1 targetExp 70 -> 82.
Raise climate_rewrite_1 targetExp 160 -> 192.
Raise climate_rewrite_2 targetExp 230 -> 252.
Raise sky pulse targets to 270 / 292 / 302.
Optionally raise monsoon_2-8 as listed in 1.7.
```

#### 验收

```bash
npm run simulate:weather-strategies
```

Required:

```text
First monsoon unchanged enough.
All strategies still complete or low-efficiency reaches at least climate rewrite.
No stage has > 10 minute quiet warning.
```

#### 预计风险

Medium-high. Changes player-facing target progression. Keep as fallback only.

---

### P0-4. Hide UI noise without full rewrite

#### 文件

```text
src/App.tsx
src/styles/app.css
```

#### 改动

```text
Make resource-stack collapsible.
Make formula-summary collapsible.
Hide zero/unrelevant meta resources from weather-summary.
Conditionally render storm/climate/sky reset cards.
Add upgrade-card--weak for unaffordable cards.
Collapse pressure/storm/climate sections with details.
```

#### 验收

```bash
npm run typecheck
npm run build
```

Manual check:

```text
New game screen shows clear next action.
Before monsoon, pressure/storm/climate info is hidden.
After unlocking pressure, it appears but does not overwhelm right panel.
Formula/debug info remains accessible.
```

#### 预计风险

Low-medium. Risk is hiding a button that was needed. Mitigate by using conditions tied to `currentMilestone.kind` or existing resource/count > 0.

---

### P0-5. Add Island Mood progression feedback

#### 文件

```text
src/game/economy/progression.ts
src/game/economy/index.ts
src/App.tsx
src/styles/app.css
```

#### 改动

```text
Add getIslandMood(state).
Export progression.ts from index.ts.
Use islandMood.className on weather-shell and island-reactor.
Replace static sky-status text with mood title/subtitle.
Add mood CSS backgrounds and simple overlay effects.
No economic effect.
```

#### 验收

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

Simulation output should not change.

#### 预计风险

Low. CSS-only/derived-state feature. If visual class breaks layout, remove mood classes and keep text only.

---

### P1-1. Split App.tsx into components

#### 文件

Add:

```text
src/ui/StatusPanel.tsx
src/ui/ReactorStage.tsx
src/ui/ResetCards.tsx
src/ui/UpgradePanel.tsx
src/ui/FormulaDrawer.tsx
src/ui/IslandMoodStage.tsx
```

Modify:

```text
src/App.tsx
```

#### 改动

```text
Move left aside JSX to StatusPanel.
Move center sky/cloud/reactor chain to ReactorStage.
Move reset cards to ResetCards.
Move right upgrade list to UpgradePanel.
Move formula summary to FormulaDrawer.
Move mood status to IslandMoodStage.
Keep state, handlers, and economic calculations in App.tsx for now.
```

#### 验收

```bash
npm run typecheck
npm run build
```

Manual:

```text
All buttons still work.
No handler lost.
No reset card hidden incorrectly.
```

#### 预计风险

Medium. Component prop drilling can introduce mistakes. Do after P0 balance unless App.tsx becomes unmanageable.

---

### P1-2. Add debug report export

#### 文件

Add:

```text
src/game/economy/debug.ts
```

Modify:

```text
src/game/economy/index.ts
src/App.tsx
src/styles/app.css
```

#### 改动

```ts
// src/game/economy/debug.ts
import { calculateRates, calculateWeatherPerSecondLog, getCurrentMainlineMilestone, getCurrentMilestoneTargetExp, getLayerBonusBreakdown } from "./index.ts";
import type { WeatherReactorState } from "./types.ts";

export function createDebugReport(state: WeatherReactorState) {
  return {
    version: "v13-weekend",
    elapsedSeconds: state.elapsedSeconds,
    milestone: getCurrentMainlineMilestone(state),
    targetExp: getCurrentMilestoneTargetExp(state),
    resources: state.resources,
    rates: calculateRates(state),
    weatherRateLog: calculateWeatherPerSecondLog(state),
    layerBonuses: getLayerBonusBreakdown(state),
    upgrades: state.upgrades,
    permanentUpgrades: state.permanentUpgrades,
    pressureUpgrades: state.pressureUpgrades,
    stormUpgrades: state.stormUpgrades,
    climateLaws: state.climateLaws,
    resetCounts: {
      rainRanks: state.rainRanks,
      totalMonsoonCycles: state.totalMonsoonCycles,
      totalStormFronts: state.totalStormFronts,
      totalClimateRewrites: state.totalClimateRewrites,
      skyHeartPulseLevel: state.skyHeartPulseLevel,
      skyHeartAwakened: state.skyHeartAwakened,
    },
    bestWeatherExp: state.bestWeatherExp,
  };
}
```

Add App button:

```tsx
function exportDebugReport() {
  const report = createDebugReport(state);
  void navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
  setState((currentState) => ({
    ...currentState,
    notice: createNotice("info", "调试报告已复制。"),
  }));
}
```

#### 验收

```bash
npm run typecheck
npm run build
```

Manual:

```text
Click export button.
Clipboard contains JSON.
JSON includes current milestone, rates, layers, upgrades.
```

#### 预计风险

Low. If clipboard permission fails, fallback to download blob later.

---

### P1-3. Add developer state bookmarks only in dev mode

#### 文件

Add:

```text
src/game/economy/devStates.ts
```

Modify:

```text
src/game/economy/index.ts
src/App.tsx
```

#### 改动

Add a small dev-only dropdown:

```ts
if (import.meta.env.DEV) {
  // show bookmark buttons
}
```

Bookmarks:

```text
after-monsoon-1
after-storm-front-1
after-climate-1
sky-heart-entry
```

This is useful because the developer cannot repeatedly play from zero.

#### 验收

```bash
npm run typecheck
npm run build
```

Build should not expose bookmarks unless guarded by `import.meta.env.DEV`.

#### 预计风险

Medium if accidentally exposed in production. Keep P1, not P0.

---

### P2-1. Visual polish and ending panel

#### 文件

```text
src/App.tsx or src/ui/EndingPanel.tsx
src/styles/app.css
```

#### 改动

```text
Add final ending card after skyHeartAwakened.
Show elapsed time, total monsoons, storm fronts, climate rewrites, bestWeatherExp.
Allow continue playing or reset.
```

#### 验收

```bash
npm run build
```

#### 预计风险

Low. Deferred because it does not solve launch balance.

---

## Final launch command checklist

Run these before deployment:

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

Expected launch criteria:

```text
No TypeScript errors.
Build succeeds.
Simulation hard gates pass.
No NaN / Infinity displayed in simulation output.
guided-human reaches 1e308.
roi-greedy not earlier than 75 minutes.
comfort-first and bad-but-plausible do not hard lock.
maxQuietSeconds <= 10 minutes for all required strategies.
New UI does not show future layers before relevance.
Island mood changes across stages without changing simulation results.
```

If gates fail after P0 nerfs:

```text
Too fast: first reduce storm/climate/sky bonus more; then adjust MAINLINE_MILESTONES.
Too slow after first monsoon: partially restore pressure cap from 18 -> 22.
Too slow at final sky: restore SKY_HEART_PULSE_BONUS_EXPONENTS to [28, 24, 12].
First monsoon affected: revert changes touching rain rank requirements or first 10 rain rank formulas; P0 plan should not touch them.
```
