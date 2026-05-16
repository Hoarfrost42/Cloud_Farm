# 天气反应堆参考研究与解耦架构方案

日期：2026-05-15

研究对象：

- `incremental-mass-rewritten`：`C:\Users\Lenovo\AppData\Local\Temp\cloud_island_refs\incremental-mass-rewritten`
- `shark-incremental`：`C:\Users\Lenovo\AppData\Local\Temp\cloud_island_refs\shark-incremental`
- 当前项目：`F:\Cloud_Farm`

本文目标：

```text
把参考游戏的数值曲线、升级成本、收益放置、渐进披露和 reset 结构拆出来，
转成 Cloud Island 后续重构可执行的玩法与架构文档。
```

本文暂不要求立刻实现。下一轮应先审查本文，再拆成实现批次。

## 1. 当前诊断

当前 Cloud Island 已经从“农场经营”切到“天气活力增量”方向，这是正确的主轴。但最近几轮出现的 bug 和体感问题，根源集中在经济结构耦合过重：

- `云层等级` 一度同时承担倍率、解锁、升级成本阶梯，导致玩家误以为又多了一层 reset。
- `雨阶` 同时承担 reset、倍率、升级披露、重复开局压缩，导致早期节奏很容易过快或过慢。
- 本轮升级全部塞在右栏，缺少“当前阶段只看这一组”的信息架构。
- 成本和收益有时直接从当前状态计算，文案会随着浮点误差或倍率组合变化，玩家难以判断买前买后差异。
- 模拟脚本和游戏逻辑长期复制公式，任何一边小改都会产生新的不一致。

后续核心方向：

```text
云层等级只做自动解锁披露。
雨阶只做第一层 reset 与全局本轮倍率。
本轮升级负责短期爬坡。
云核升级负责压缩旧流程和解锁自动化。
模拟脚本必须复用同一套公式数据。
```

## 2. 参考游戏数值曲线

### 2.1 IMR：早期升级曲线

IMR 的 Mass Upgrades 使用很清晰的几何成本：

```text
Muscler:
cost = 10 * 1.5^level

Booster:
cost = 100 * 2^level

Stronger:
cost = 1e4 * 10^level
```

源码位置：

- `js/upgrades.js`：`UPGS.mass`
- `js/buildings.js`：`getMassUpgradeCost()`

关键点：

- 第一条升级便宜、增长慢，用来提供早期连续购买反馈。
- 第二条升级贵一档，但收益作用在第一条升级上。
- 第三条升级再贵一大档，作用在第二条升级上。
- 三者要构成嵌套生产链，避免退化成平级 `+X`。

抽象成公式：

```text
mainGain = base + producer1Effect
producer1Effect = producer1Level * producer1Power
producer1Power = producer2Effect
producer2Effect = 1 + producer2Level * producer2Power
producer2Power = producer3Effect
```

这给 Cloud Island 的直接结论：

```text
雨滴应该直接推动天气活力。
根系应该强化雨滴。
云团应该强化根系。
风眼应该强化云团或生产链速度。
```

不要同时放两个“固定增加点击收益”的升级。平级升级可以存在，但必须承担不同职责，例如一个加点击，一个加被动，一个缩短冷却，一个改倍率。

### 2.2 IMR：Rank 成本曲线

IMR 的 Rank 是第一层小 reset，核心公式近似：

```text
Rank requirement = 10^(rank^1.15) * 10
```

后续 Tier / Tetr / Pent / Hex 使用上一层数量作为门槛：

```text
Tier requirement = (tier + 2)^2 ranks
Tetr requirement = tetr^2 * 3 + 10 tiers
Pent requirement = pent^1.5 + 15 tetrs
Hex requirement = hex^1.8 + 20 pents
```

源码位置：

- `js/ranks.js`

关键点：

- 小 reset 的早期门槛快速抬高。
- 后续层级经常用上一层 reset 数量作为证明，而非继续只看主资源。
- reset 越往后越像“你已经掌握上一层循环”的检测。

Cloud Island 对应：

```text
雨阶门槛可以用天气活力表或公式快速抬高。
季风循环不应该只看天气活力，还应要求雨阶数量。
后续第二层 reset 不应再直接看天气活力，而应看季风次数、云核或天气器官进度。
```

### 2.3 IMR：Rage Power 获得曲线

IMR 第一次大 reset 的 Rage Power 获取基于 Mass：

```text
if mass < 1e15:
  ragePowerGain = 0
else:
  ragePowerGain = floor((mass / 1e15)^(1/3) * multipliers)
```

源码位置：

- `js/main.js`：`FORMS.rp.gain()`

这里的 `1/3` 很重要。它让玩家第一次到门槛时通常只拿 1 点，继续挂机会涨，但不会马上拿到大量点数。

Cloud Island 对应：

```text
cloudCoreGain = floor((weather / monsoonTarget) ^ 0.33 * multiplier)
最低 1。
```

第一轮季风循环必须稳定给 1 云核，第一个云核升级必须花 1 云核，并且效果立刻压缩旧流程。

### 2.4 IMR：大 reset 升级成本曲线

IMR Rage Upgrades 的早期成本：

| 序号 | 成本 | 作用 |
|---:|---:|---|
| 1 | 1 RP | Booster 增加 Muscler |
| 2 | 10 RP | Stronger 增加 Booster |
| 3 | 25 RP | 自动购买 Mass Upgrades |
| 4 | 50 RP | Rank 不再重置任何东西 |
| 5 | 1e4 RP | 自动 Rank |
| 6 | 1e5 RP | 自动 Tier |

源码位置：

- `js/upgrades.js`：`UPGS.main[1]`

这个顺序按职责推进：

```text
高层生产者反哺低层生产者
-> 自动购买旧升级
-> 取消低层 reset 惩罚
-> 自动执行低层 reset
```

Cloud Island 的云核升级也应按这个顺序：

| 云核升级 | 建议成本 | 作用 |
|---|---:|---|
| 初雨记忆 | 1 云核 | 每轮开始拥有 1 雨阶 |
| 雨滴余响 | 2 云核 | 雨阶 reset 后保留 `雨滴生成 Lv.1` |
| 云层自触 | 4 云核 | 自动购买前两项本轮升级 |
| 凝雨熟练 | 8 云核 | 雨阶 reset 不再清空第一批点击/被动升级 |
| 自动凝雨 | 16 云核 | 自动执行雨阶 reset |

这里要谨慎：免重置和自动 reset 不宜过早给。过早会直接跳过玩家学习阶段。

### 2.5 IMR：Scaling 与 softcap

IMR 使用多层 scaling 起点：

```text
Rank:
super starts at 50
hyper starts at 120
ultra starts at 600
meta starts at 1e4

Mass Upgrades:
super starts at 100
hyper starts at 500
ultra starts at 1e11
```

源码位置：

- `js/scaling.js`
- `js/saves.js`：`Decimal.prototype.scaleEvery`

这里的经验：

- 早期不要急着 softcap。
- scaling 起点通常放在玩家已经稳定掌握旧循环之后。
- scaling 本身也可以被后续升级削弱或推迟，形成中期目标。

Cloud Island 暂时不该早早引入软上限。更适合的做法是：

```text
前 1-2 小时只使用干净指数成本和 reset 门槛。
等玩家接近天空心脏或第二层 reset 时，再引入“气压”作为主题化 softcap。
```

## 3. 鲨鱼增量数值曲线

### 3.1 主等级成本

鲨鱼增量的 `shark_level` 成本：

```text
sharkLevelCost = sharkReqBase ^ scaledLevel
sharkReqBase = 10，后续研究可降到 9 / 8
```

源码位置：

- `js/features/shark.js`

它看起来舒服，因为主目标天然是：

```text
10 fish
100 fish
1,000 fish
10,000 fish
...
```

后续通过 `scaleAll("shark_level")` 在 10、100、1000 等等级后让等级本身变难，早期成本仍保持干净。

Cloud Island 的直接迁移：

```text
云层等级应是自动里程碑：
10 / 100 / 1K / 10K / 100K / 1M / ...
```

但它只负责解锁，不负责倍率，不要求玩家再花一次同样资源购买。

### 3.2 鲨鱼升级成本

鲨鱼增量前几项升级：

```text
s1:
unlock at shark level 3
cost = 100 * 1.1^level
effect = (level + 1)^s3Effect

s2:
unlock at shark level 7
cost = 1e6 * 10^(level^1.25)
effect = +level to shark base

s3:
unlock at shark level 15
cost = 1e21 * 1e3^(level^1.25)
effect = power multiplier
```

源码位置：

- `js/features/shark.js`：`SHARK_UPGRADES`

这里有三个可迁移点：

1. 成本锚点很干净：`100`、`1e6`、`1e21`。
2. 解锁由主等级控制，购买消耗仍是主资源或对应资源。
3. 效果阶梯逐渐从乘法变为指数或幂。

Cloud Island 对应：

```text
云层等级 1：显示点击升级，成本 10。
云层等级 2：显示被动升级，成本 30 或 100。
云层等级 3：显示冷却升级，成本 1K。
云层等级 4：显示天气倍率，成本 10K。
云层等级 6：显示根系生产链，成本 1M。
```

所有门槛都用干净数量级。公式本身从漂亮锚点开始，不依赖把计算结果再取整成漂亮数。

### 3.3 鲨鱼重置收益

鲨鱼增量的 Prestige gain：

```text
if totalFish < 1e36:
  prestigeGain = 0
else:
  prestigeGain = floor((totalFish / 1e36)^0.5 * multipliers)
```

源码位置：

- `js/modules/currency.js`
- `js/features/resets.js`

Core gain 更克制：

```text
if totalPrestige < 1e450:
  coreGain = 0
else:
  coreGain = floor(log10(totalPrestige / 1e450) / 10 + 1)
```

经验：

- 第一层 reset 可以用根号，鼓励多等一点拿更多。
- 第二层 reset 更适合用 log，让长线变慢。
- 每个 reset 清楚声明重置哪些东西，并且后续研究/里程碑可以保护旧系统。

Cloud Island 对应：

```text
雨阶：一次 +1，早期不 bulk。
季风循环：cloudCoreGain = floor((weather / target)^0.33)，最低 1。
更高层 reset：如果以后做，收益应考虑 log 或低幂。
```

### 3.4 鲨鱼自动化

鲨鱼增量把自动化独立成系统：

```text
automation.interval = [startSeconds, multiplier]
automation.cost = base * growth^level
automation.trigger = function
```

例子：

```text
auto shark:
interval starts at 1s
each upgrade interval * 0.9
cost = 1e3 * 3^level prestige

auto shark upgrades:
interval starts at 1s
each upgrade interval * 0.8
cost = 1e3 * 2^level prestige
```

源码位置：

- `js/features/automation.js`

Cloud Island 当前自动化不应混在普通本轮升级里。建议拆成：

```text
RunUpgrade：提高本轮数值。
AutomationUpgrade：解锁或加快自动执行。
PermanentUpgrade：reset 后保留、免重置、自动购买。
```

自动化给玩家的心理反馈应是“这个旧动作以后不用我管了”，不能只像又一个倍率。

## 4. Cloud Island 数值设计原则

### 4.1 成本锚点

统一使用数量级锚点：

```text
10
30
100
300
1K
3K
10K
30K
100K
300K
1M
3M
10M
...
```

推荐优先用 `10^n` 和 `3 * 10^n`，少用 `2.4K`、`3024`、`13689` 这种玩家无法预期的数字。

### 4.2 成本类型

本轮升级使用三类成本即可：

```text
慢增长：
cost = base * 1.5^level
适合早期点击、低级被动。

标准增长：
cost = base * 3^level 或 base * 10^level
适合阶段性生产者。

陡峭增长：
cost = base * 10^(level^1.25)
适合强倍率、幂、软上限推迟类升级。
```

为了观感，第一版建议避免 `1.1^level` 这种会产生大量小数成本的曲线，除非使用 Decimal 并统一格式化。

### 4.3 收益类型

升级收益也要分层：

| 类型 | 公式 | 用途 |
|---|---|---|
| 加法 | `+1 click` / `+1/s` | 开局建立反馈 |
| 几何乘法 | `x5 click` / `x4 passive` | 早期爽感 |
| 全局倍率 | `1.25^rainRank` | 小 reset 压缩旧流程 |
| 生产者嵌套 | `roots -> droplets -> weather` | 中期主玩法 |
| 指数/幂 | `gain^1.05` | 大 reset 后或终局 |
| 自动化 | `interval * 0.8` | 减少重复操作 |
| 免重置 | `keep X after reset` | 大 reset 升级价值 |

早期不要大量使用小数加法。玩家看到 `+0.1/s` 可以接受，但如果整个列表都是 `+0.127/s`、`x1.095`，就会显得像调试器。

### 4.4 雨阶定位

雨阶建议只保留两个职责：

```text
1. 小 reset。
2. 本轮所有天气活力收入使用清晰全局乘区。
```

它不应该：

- 直接给点击专属奇怪倍率。
- 直接给被动专属隐藏来源。
- 作为升级货币大量消耗。
- 既是等级又是可购买升级。

雨阶的后续变化由里程碑处理：

```text
Rain Rank 1：解锁根系。
Rain Rank 3：解锁云团。
Rain Rank 6：解锁风眼。
Rain Rank 8：解锁自动购买。
Rain Rank 12：解锁季风循环入口。
```

当前 v10 实现：

```text
weatherMultiplier = 1 + rainRank
```

这样第一次雨阶就是 `x2`，玩家会明显感觉 reset 值得；到 12 雨阶是 `x13`，不会像指数倍率那样把后段彻底打爆。

### 4.5 云层等级定位

云层等级建议完全自动：

```text
cloudLevel = count(threshold <= bestWeatherThisRun)
thresholds = [10, 100, 1K, 10K, 100K, 1M, ...]
```

职责：

- 控制本轮升级披露。
- 控制中心视觉复苏阶段。
- 提供下一目标文案。

不承担：

- 产出倍率。
- 购买成本。
- reset 层。

## 5. 推荐基础路线

### 5.1 核心资源

最小核心：

| 名称 | 类型 | 说明 |
|---|---|---|
| 天气活力 | 主资源 | 第一根柱子，所有本轮目标围绕它 |
| 雨滴 | 生产者 1 | 直接增加天气活力 |
| 根系 | 生产者 2 | 增加雨滴 |
| 云团 | 生产者 3 | 增加根系 |
| 风眼 | 生产者 4 | 增加云团或提高生产链速度 |
| 雨阶 | 小 reset 等级 | 当前实现为 `1 + rainRank` 本轮天气活力乘区 |
| 云核 | 大 reset 货币 | 购买永久压缩旧流程的升级 |

### 5.2 前 15 分钟目标

设计目标：

```text
0-30 秒：第一次购买点击升级。
30-90 秒：解锁被动增长，停止纯手点。
3-6 分钟：玩家看到 10K/100K 级目标。
8-15 分钟：第一次雨阶。
15-30 分钟：玩家开始重复雨阶循环，但每轮更快。
```

当前模拟显示：

```text
第一次被动：0:30
第一次雨阶：约 14-21 分钟
3 小时内无法到 12 雨阶或第一次季风
```

这说明当前版本已经把早期漏洞压住，但压得过重。第一轮雨阶可以在 10-15 分钟内，12 雨阶不应不可达。

### 5.3 建议本轮升级表

第一批只保留 8 个本轮升级，其他延后：

| id | 解锁 | 成本公式 | 收益公式 | 职责 |
|---|---:|---|---|---|
| cloudTouch | 10 天气活力 | `10 * 10^level` | 点击天气活力 `x5` | 早期点击爽感 |
| dropletSeed | 30 天气活力 | `30 * 10^level` | 天气活力 `+1 * 4^level /s` | 解放双手 |
| weatherAmplifier | 10K 天气活力 | `10K * 10^level` | 天气活力收入 `x2` | 阶段倍率 |
| rootWake | 雨阶 1 / 1M 天气活力 | `1M * 10^level` | 根系让雨滴增长 `+1 * 3^level /s` | 打开生产链 |
| cloudBloom | 雨阶 3 / 100M 天气活力 | `100M * 10^level` | 云团让根系增长 `+1 * 3^level /s` | 生产链第二段 |
| windEye | 雨阶 6 / 1B 天气活力 | `1B * 10^level` | 风眼让云团增长 `+1 * 2^level /s` | 生产链第三段 |
| heavyRain | 雨阶 8 / 10B 天气活力 | `10B * 10^(level^1.25)` | 天气活力收入 `^1.03` 或 `x10` | 后段爆发 |

说明：

- 早期点击和被动成本都用 `x10`，让玩家目标清楚。
- `dropletSeed` 第一级必须尽早出现，不要放到云层等级 2 之后还要 1000 成本。
- 强升级可以用幂或指数，但要晚出现。

### 5.4 雨阶需求

建议先用表，不急着追求纯公式：

| 雨阶 | 天气活力需求 |
|---:|---:|
| 1 | 300K |
| 2 | 1M |
| 3 | 3M |
| 4 | 10M |
| 5 | 30M |
| 6 | 100M |
| 7 | 300M |
| 8 | 1B |
| 9 | 3B |
| 10 | 10B |
| 11 | 30B |
| 12 | 100B |

这张表的意义是把玩家目标变成熟悉数量级。若实测太慢，可以整体下调一档：

```text
100K / 300K / 1M / 3M / ...
```

不要在早期使用批量雨阶。批量应作为云核升级或里程碑，并且 UI 必须显示“本次可获得 X 雨阶”。

### 5.5 季风循环

季风循环条件：

```text
rainRank >= 12
weather >= monsoonTarget
```

建议第一版：

```text
monsoonTarget = 1T
cloudCoreGain = max(1, floor((weather / 1T)^0.33))
```

如果第一次季风超过 2 小时，则优先调：

1. `12 雨阶后的生产链收益`
2. `monsoonTarget`
3. 云核第一个升级的压缩强度

不要优先强化雨阶倍率。雨阶倍率一旦过强，会重新出现“只冲雨阶”的最优路线。

实现备注（2026-05-15 v9）：

```text
当前试玩基线为了压住“只买雨滴生成”路线，已经把建议表整体上移：
雨阶从 3M 起步，后段进入 100B / 10T / 1Qa / 100Qa / 100Qi / 100Sx / 100Sp。
第一次季风目标暂定 1Oc。
厚云降雨起步成本暂定 1Qa，单级倍率暂定 x3。
冷却气流已从当前可见路线移除。
雨阶倍率已改为 1 + rainRank。
```

这不是最终曲线，只是当前可试玩基线。后续调参优先改 `src/game/economy/constants.ts` 的雨阶表、季风目标，以及 `src/game/economy/upgrades.ts` 的 `costSequence`。

## 6. 渐进披露规则

### 6.1 右侧 UI 分组

右侧只显示当前阶段主组，其他组折叠成下一组预告。

建议分组：

| 组 | 可见条件 | 内容 |
|---|---|---|
| I 雨阶爬坡 | 开局 | 点击、被动、冷却、基础倍率 |
| II 生产者链 | 雨阶 1 | 根系、云团、风眼 |
| III 自动化 | 雨阶 8 或云核升级 | 自动购买、自动雨阶 |
| IV 云核天赋 | 季风 1 | 永久压缩、免重置 |
| V 天空心脏 | 云核门槛 | 长目标和终局推进 |

### 6.2 卡片文案

升级文案必须是买后确定描述：

```text
点击注入的天气活力变为原来的 5 倍。
天气活力基础增长变为原来的 4 倍。
云层回拢时间减少 0.1 秒。
根系每秒生成雨滴变为原来的 3 倍。
```

避免：

```text
增加 1.0950000000000002。
提升一些天气效率。
还需要多少才能买。
```

成本区域始终显示“购买下一次升级需要多少”。可购买只用高亮，不改成一句话。

## 7. 解耦架构方案

### 7.1 目标模块

建议把当前大 `App.tsx` 的经济逻辑逐步拆成纯数据和纯公式：

```text
src/game/economy/
  types.ts
  state.ts
  resources.ts
  formulas.ts
  runUpgrades.ts
  resetLayers.ts
  permanentUpgrades.ts
  milestones.ts
  progression.ts
  tick.ts
  format.ts

src/game/simulation/
  simulateWeatherRun.ts
  strategies.ts
```

React UI 只读 view model：

```text
src/ui/
  EconomyPanel.tsx
  UpgradePanel.tsx
  ResetPanel.tsx
  DebugPanel.tsx
```

### 7.2 数据结构

建议状态：

```ts
interface WeatherReactorState {
  resources: {
    weather: number;
    droplets: number;
    roots: number;
    clouds: number;
    windEyes: number;
    cloudCores: number;
  };
  run: {
    bestWeather: number;
    cloudLevel: number;
    rainRank: number;
    clickCooldownRemaining: number;
    elapsedSeconds: number;
  };
  upgrades: Record<RunUpgradeId, number>;
  permanentUpgrades: Record<PermanentUpgradeId, number>;
  automation: Record<AutomationId, AutomationState>;
  lifetime: {
    monsoonCycles: number;
    totalCloudCores: number;
    bestMonsoonWeather: number;
  };
  options: {
    paused: boolean;
    decimalDisplay: boolean;
  };
}
```

### 7.3 升级定义

本轮升级应该是纯数据：

```ts
interface RunUpgradeDefinition {
  id: RunUpgradeId;
  group: UpgradeGroupId;
  title: string;
  unlock: (state: WeatherReactorState) => boolean;
  cost: (level: number, state: WeatherReactorState) => ResourceCost;
  effect: (level: number, state: WeatherReactorState) => UpgradeEffect;
  describeNext: (level: number, state: WeatherReactorState) => string;
}
```

重要规则：

```text
cost(level) 只描述下一次购买成本。
effect(level) 不应该偷偷读 UI 状态。
describeNext(level) 必须基于 level + 1 的确定效果。
```

### 7.4 reset 定义

reset 层也应数据化：

```ts
interface ResetLayerDefinition {
  id: ResetLayerId;
  canReset: (state: WeatherReactorState) => boolean;
  rewardPreview: (state: WeatherReactorState) => ResetReward;
  apply: (state: WeatherReactorState) => WeatherReactorState;
  resetScope: ResetScope;
}
```

所有 reset 必须显式写清：

```text
清空哪些资源。
清空哪些本轮升级。
保留哪些永久升级。
是否保留自动化开关。
是否触发里程碑初始加成。
```

这可以直接避免“雨阶 reset 没重置右侧升级”的旧 bug。

### 7.5 模拟必须复用游戏公式

当前两个模拟脚本复制了游戏公式，这是调数值最危险的地方。

目标：

```text
scripts/simulate-weather-strategies.mjs
  import { createInitialState, tickState, buyUpgrade, performReset } from compiled economy modules
```

如果 Vite/TS 直接导入麻烦，可以先做一个 `src/game/economy` 纯 TypeScript，无 React、无 DOM、无 CSS，再用 `tsx` 或编译后的 JS 跑模拟。

模拟输出至少包括：

```text
first passive
first rain rank
rain rank 3 / 6 / 8 / 12
first monsoon
cloud core count at 1h / 2h / 3h
active bottleneck
upgrade purchase trace
```

### 7.6 策略模拟

至少保留 5 种策略：

| 策略 | 目的 |
|---|---|
| tutorial | 按推荐顺序买，模拟新手 |
| click-heavy | 偏点击，测试手点是否过强 |
| passive-rush | 偏被动，测试单路线漏洞 |
| producer-chain | 优先生产链，测试中期正解 |
| greedy-roi | 计算单位成本收益，模拟熟练玩家 |

手玩玩家通常比模拟快或慢都可能。脚本的关键价值是发现“只买一个升级一路平推”这种结构性漏洞。

## 8. 推荐目标曲线

当前目标是做一个有几小时长度的小品级增量游戏。建议目标：

| 时间 | 玩家状态 |
|---:|---|
| 0:00 | 第一次点击云层，获得 1 天气活力 |
| 0:30 | 买到第一次点击强化 |
| 1:00 | 解锁被动天气活力 |
| 5:00 | 看到 100K / 300K 目标 |
| 10-15:00 | 第一次雨阶 |
| 30-45:00 | 到达雨阶 3，生产者链开始成立 |
| 60-90:00 | 到达雨阶 8，自动化预告出现 |
| 90-150:00 | 第一次季风循环，获得 1 云核 |
| 2-4h | 多次季风后解锁天空心脏第一阶段 |

如果想做更短：

```text
第一次雨阶 8-10 分钟。
第一次季风 60-90 分钟。
天空心脏 2 小时左右。
```

如果想做更像 IMR 的中期平台：

```text
第一次雨阶 10-15 分钟。
第一次季风 2 小时。
天空心脏 4-6 小时。
```

建议先做短版，因为这是原型，调优成本更低。

## 9. 设计审查

### 9.1 Player Experience Target

玩家体验目标：

```text
从第一次点击云层降下雨水开始，重塑空岛的天气活力。
```

玩家每一阶段的感受应是：

- 我点击云层，天气活力动了。
- 我买了升级，点击或每秒收入明显变强。
- 我第一次凝结雨阶，旧流程被重跑，但明显更快。
- 我打开生产链，不再只靠点击和单一被动。
- 我第一次季风循环，旧流程被永久压缩。
- 我看到天空心脏，知道长目标还在前面。

### 9.2 Core Loop Impact

核心循环：

```text
点击云层 -> 买本轮升级 -> 推高天气活力 -> 凝结雨阶 -> 解锁生产链 -> 季风循环 -> 买云核升级 -> 更快重走旧流程
```

后续所有新增功能都应增强以下之一：

- 提高 rate。
- 改变 bottleneck。
- 压缩重复操作。
- 解锁下一组升级。
- 强化 reset 后的期待感。

### 9.3 Player Decisions

早期选择不必复杂，但至少要有两条路线：

```text
点击路线：更快到第一批门槛，适合主动玩家。
被动路线：更快解放双手，适合挂机玩家。
```

中期选择：

```text
雨滴直接推天气。
根系/云团拉长生产链。
冷却/倍率改善旧路线。
```

如果某条路线永远最优，就需要改成本或收益。

### 9.4 Feedback Requirements

必须在 UI 和中心场景同时反馈：

- 云层等级达标：中心天气复苏阶段变化。
- 雨阶 reset：雨线/云层短动画，不只数字清空。
- 生产者链启动：雨滴、根系、云团卡片不抽搐，固定格位显示速率。
- 云核获得：明确显示“本次 +1 云核”，并马上高亮 1 云核升级。

### 9.5 Scope Guard

暂不做：

- 天气预报。
- 气压 softcap。
- 天气器官。
- challenge。
- 第二层 reset。
- 大型 tree UI。

这些可以留到基础路线稳定后。

## 10. 实施批次

### Batch A：经济内核抽离

目标：

```text
不改玩法，只把经济公式从 App.tsx 和模拟脚本里抽出来。
```

验收：

- 游戏行为不变。
- 两个模拟脚本引用同一套公式。
- `npm run build` 通过。
- 当前手动试玩存档可重置到新版本。

### Batch B：云层等级纯披露化

目标：

```text
云层等级只由 bestWeather 自动决定，只解锁升级和视觉阶段。
```

验收：

- 不存在购买云层等级按钮。
- 云层等级不提供倍率。
- UI 不再把云层等级表现成 reset 层。

### Batch C：升级表重做

目标：

```text
按 10 / 30 / 100 / 1K / 10K / 1M 的锚点重写前 12 雨阶前升级。
```

验收：

- 第一次点击强化在 30 秒内。
- 第一次被动在 1 分钟内。
- 前 10 分钟不会要求玩家重复 30 次以上纯等待点击。
- 不出现不规则成本。

### Batch D：雨阶与生产者链重做

目标：

```text
雨阶只做全局天气活力乘区和 reset。
生产链负责中期增长。
```

验收：

- 单买雨滴不能成为最优到季风路线。
- 生产者链路线在 30-90 分钟段明显优于单路线。
- 雨阶 reset 清空本轮内容，保留高层内容。

### Batch E：云核升级与季风循环

目标：

```text
第一次季风稳定给 1 云核，第一个云核升级稳定可买。
```

验收：

- 第一个云核升级立刻压缩开局。
- 云核升级逐步提供自动购买、免重置、自动雨阶。
- reset 范围由 `resetLayers.ts` 显式定义。

### Batch F：视觉反馈与固定 UI

目标：

```text
中心空岛根据阶段复苏，所有卡片固定高度，不因数字变化抽搐。
```

验收：

- 左侧资源卡不跳高。
- 中央回拢进度条不挤压布局。
- 右侧卡片文案和成本区域固定。
- 可购买只高亮，不改文案结构。

## 11. 最关键结论

Cloud Island 后续不应继续靠单次小修补数值。正确顺序是：

```text
先抽经济内核。
再确定成本/收益类型。
再重写前 12 雨阶曲线。
再接季风循环和云核升级。
最后用同一套公式跑多策略模拟。
```

参考游戏真正值得学的是：

```text
成本锚点干净。
收益职责分层。
reset 后第一笔升级明确。
自动化逐步接管旧操作。
显示内容永远跟随玩家当前阶段。
```
