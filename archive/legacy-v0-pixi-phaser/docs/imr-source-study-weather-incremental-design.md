# IMR 源码研究与 Cloud Island 天气增量设计

日期：2026-05-14

研究对象：

- 仓库：`https://github.com/MrRedShark77/incremental-mass-rewritten`
- 本轮阅读重点：
  - `js/saves.js`
  - `js/main.js`
  - `js/ranks.js`
  - `js/buildings.js`
  - `js/upgrades.js`
  - `js/resources.js`
  - `js/tabs.js`
  - `js/atom.js`
  - `js/supernova/supernova.js`
  - `js/quantum/quantum.js`

本文目标：

```text
从 IMR 源码里提炼可迁移的增量结构，再把 Cloud Island 做成“天气复苏”主题下自己的玩法，而不是只做一层换皮。
```

## 1. 源码里看到的 IMR 主流程

IMR 早期主干可以概括成：

```text
Mass 自动增长
-> Rank 小 reset
-> Rank 解锁 Muscler / Booster / Stronger
-> 三个 Mass Upgrade 形成嵌套生产链
-> Mass 达到 Rage Power 门槛
-> Rage Power 大 reset
-> Rage Upgrades 压缩旧流程、解锁自动化
-> Dark Matter / Black Hole
-> Atom / Quarks
-> Challenges / Elements / Particles
-> Supernova / Neutron Tree
-> Quantum
-> Darkness
-> Infinity
```

源码支撑：

- `js/saves.js` 的 `calc(dt)` 每 tick 增加 `player.mass += tmp.massGain * globalSpeed`，并处理自动 Rank、自动升级和高层资源被动增长。
- `js/main.js` 的 `FORMS.massGain()` 是 Mass 增长核心公式，最早从 `1/sec` 起步，然后被 Muscler、Rank 奖励、Tickspeed 和后续层级持续乘上去。
- `js/ranks.js` 的 `RANKS.reset()` 是第一层小 reset。早期 Rank 会重置 Mass 和 Mass Upgrades，后续通过 Rage Upgrade 取消这些重置惩罚。
- `js/buildings.js` 的 `mass_1 / mass_2 / mass_3` 分别是 Muscler / Booster / Stronger，组成嵌套生产者。
- `js/main.js` 的 `FORMS.rp.gain()` 要求 Mass 至少达到 `1e15` 才能获得 Rage Power。
- `js/upgrades.js` 的第一列 Rage Upgrades 明确承担“压缩旧流程”的职责。

## 2. IMR 早期真正让玩家上头的结构

### 2.1 第一根柱子足够清楚

开局只有一个核心注意力：Mass。

玩家心理不是“我有很多资源要管理”，而是：

```text
Mass 还差多少才能 Rank？
Rank 还差多少才能解锁下一个东西？
Mass 还差多少才能第一次 Rage Reset？
```

这对 Cloud Island 的启发：

```text
前期主数值应只有一根柱子：天气活力。
雨水、根系、云团、风眼可以作为推动天气活力的生产者，不要一开始并排成为四个主资源。
```

### 2.2 小 reset 用来建立爬坡节奏

Rank 不是独立商店货币，它更像一段重复爬坡：

```text
够 Mass
-> Rank +1
-> 清空部分旧进度
-> 解锁或强化旧系统
-> 下一轮更快回到原位置
```

关键体验是“重走旧路，但明显更快”。

Cloud Island 可以对应为：

```text
天气活力达到门槛
-> 凝结 1 次雨阶
-> 本轮天气活力回落
-> 解锁根系 / 云团 / 冷却 / 自动细雨
-> 下一轮天气活力更快增长
```

### 2.3 Mass Upgrades 是嵌套生产链

IMR 早期三个升级的关系：

```text
Stronger 提高 Booster Power
Booster 提高 Muscler Power
Muscler 增加 Mass gain
Mass 推动 Rank / Rage
```

这比多个平级 `+X` 升级更有层次。玩家买 Stronger 时，虽然它不直接加 Mass，但能感到整条链被抬起来。

Cloud Island 对应：

```text
风眼提高云团倍率
云团增加根系
根系增加雨滴强度
雨滴推动天气活力
```

或者更主题化：

```text
季风记忆 -> 云团密度 -> 根系复苏 -> 雨滴落点 -> 天气活力
```

### 2.4 第一次大 reset 保证买得起第一个升级

玩家回忆中最重要的体验：

```text
第一次 Rage Reset 通常只够 1 Rage Power。
第一个 Rage Upgrade 正好只要 1 Rage Power。
玩家被明确引导：现在 reset，然后买这个。
```

源码里第一项 Rage Upgrade：

```text
Boosters add Musclers.
cost: 1 Rage Power
```

它没有引入复杂新系统，直接让旧生产链更强。

Cloud Island 应照这个节奏做：

```text
第一次季风循环稳定给 1 云核。
第一个云核升级只花 1 云核。
效果必须立刻压缩前期。
```

候选：

```text
初雨记忆：每轮开始时自动拥有 1 级雨阶。
云脉残响：雨阶不再清空第一枚雨滴生成器。
湿土余温：每轮开始时天气活力增长速度 x2，持续到第一次雨阶。
```

### 2.5 大 reset 后的升级职责很干净

早期 Rage Upgrades 的职责大致是：

- 让高一层生产者给低一层生产者免费数量。
- 自动购买旧升级。
- 让 Rank 不再重置任何东西。
- 自动 Rank / Tier。
- 后续再削弱 scaling、推迟 softcap、反哺新层。

这套结构可以抽象成：

```text
生产者嵌套
-> 自动化
-> 免重置
-> scaling 缓解
-> 跨层反哺
```

Cloud Island 云核升级也应按这个顺序走。

## 3. Atom 长链的参考价值

玩家提到最喜欢的是 Atom 解锁链，原因可以从 IMR 的流程结构解释：

```text
Atom 是一个远目标。
玩家知道它存在，但不能直接碰到。
它要求前面的 Black Hole / Dark Matter / Rage / Mass 链足够成熟。
中间每个系统都像是在修通去 Atom 的路。
```

源码层面：

- `js/main.js` 的 reset message 写明 Atom 需要 `1e100 uni` 的 Black Hole mass。
- `js/atom.js` 的 `ATOM.gain()` 从 Black Hole mass 计算 Atom gain。
- Atom 之后又拆出 Quarks、Particles、Atomic Power 等子系统，并回头强化 Rage Power、Mass、Dark Matter。

Cloud Island 可以把 “天空心脏” 做成自己的 Atom 长链：

```text
第一次季风循环
-> 云核升级
-> 多轮季风后解锁风眼
-> 风眼稳定后解锁雷脉
-> 雷脉挑战完成后解锁天空器官
-> 四个天空器官齐备后唤醒天空心脏
```

重点是：

```text
天空心脏要早早可见。
中间每个系统都应被解释成“正在修通去天空心脏的路”。
```

## 4. Cloud Island 应迁移的经典骨架

建议新骨架：

```text
天气活力 = Mass
雨阶 = Rank
根系 / 云团 / 风眼 = Muscler / Booster / Stronger
季风循环 = Rage Power reset
云核升级 = Rage Upgrades
天空心脏长链 = Atom 解锁链
```

第一阶段玩法：

```text
天气活力自动增长
点击云层给短时爆发
天气活力达到门槛后可获得雨阶
雨阶解锁根系
根系提高天气活力增长
雨阶数量解锁云团
云团增加根系
更高天气活力解锁第一次季风循环
```

第二阶段玩法：

```text
季风循环重置本轮雨阶 / 生产者
获得云核
云核升级压缩旧流程
第一枚云核稳定买到第一个升级
后续云核解锁自动雨阶、保留根系、削弱雨阶门槛增长
```

中期长目标：

```text
完成多次季风循环
解锁风眼
风眼把云团生产根系改成自动链
解锁雷脉挑战
挑战限制部分增益，但永久提高季风收益
推进天空心脏器官
```

## 5. 从经典玩法之外挖掘的创新方向

这些方向来自 Cloud Island 的主题，不是 IMR 的机械复刻。

### 5.1 天气器官，而不是普通升级页

天空心脏可以拆成几个“天气器官”：

```text
雨肺：提高雨阶收益，保留雨滴链。
云脉：让云团自动生成根系。
风眼：缩短天气周期，开启自动雨阶。
日核：提升所有生产者的指数或软上限。
雷骨：解锁挑战，换取季风收益倍率。
```

每个器官都对应一种实际玩法功能，而不是只加一个倍率。

创新点：

```text
终局不是买满升级，而是逐步把空岛天气系统拼成一个活物。
```

### 5.2 天气预报作为短期选择

每轮开始给 2-3 个天气预报，玩家选择一个本轮规则：

```text
温雨：雨阶门槛 -15%，但季风收益 -10%。
积云：云团生产 +30%，但根系起步更慢。
逆风：点击冷却更长，但自动化效果 +40%。
雷前静默：前 3 分钟较慢，第一次季风收益 +1 云核。
```

这可以制造路线差异，不必引入复杂装备或卡牌。

设计价值：

```text
同一套数值链，每轮有不同爬坡手感。
玩家在 reset 后有一个轻量决策。
```

### 5.3 气压作为 softcap 的主题化表达

IMR 大量使用 softcap / overflow。Cloud Island 可以把它做成“气压”：

```text
天气活力增长太快会积累气压。
气压过高会压低雨阶收益或云团效率。
风眼、雷脉、季风循环可以释放气压。
```

这比直接显示“softcap at X”更符合主题。

玩法效果：

```text
玩家会遇到平台期，但平台期有解释、有处理手段。
```

### 5.4 季风不是单按钮 reset，而是一个短仪式

季风循环可以有 5-10 秒的状态变化：

```text
云层聚集
雨线增强
空岛变绿
数字清空
云核凝结
下一轮启动
```

仪式只服务反馈，不打断玩家太久。

设计价值：

```text
reset 从“损失按钮”变成“天气完成一次呼吸”。
```

### 5.5 旧轮天气留下气候性格

每次季风循环可以根据本轮最高生产者或路线留下一个小标签：

```text
雨盛之岛：本轮雨阶较多，下轮雨阶门槛略低。
云厚之岛：本轮云团较高，下轮云团起步 +1。
风急之岛：本轮自动化较高，下轮点击冷却更短。
雷醒之岛：本轮挑战完成，下轮季风收益倍率提高。
```

这不是复杂 roguelike。它只是把玩家本轮行为变成一个轻量记忆。

设计价值：

```text
玩家会觉得每轮不是完全相同的刷数。
```

### 5.6 中央岛面只表现复苏阶段

侧边栏负责数值，中央岛面负责阶段反馈：

```text
荒云：只有一片淡云。
初雨：有雨线和小水洼。
生根：岛面出现根系纹路。
成云：天空出现固定云层。
季风：背景风线明显，云核可见。
雷脉：偶发闪光和气压条。
心脏：中心出现天气心脏脉动。
```

设计价值：

```text
UI 不需要新增很多卡片，也能让玩家感觉世界在活过来。
```

## 6. 建议的下一版重构边界

下一版如果要从当前原型转向 IMR 式骨架，建议只做一刀：

```text
把雨水 / 生命力 / 蒸腾 / 云层并排资源，重构为“天气活力 + 生产者链”。
```

最小可玩版本：

- 主数值：天气活力。
- 小 reset：雨阶。
- 生产者 1：雨滴，直接增加天气活力。
- 生产者 2：根系，增加雨滴。
- 生产者 3：云团，增加根系。
- 大 reset：季风循环，获得云核。
- 云核升级：
  - 1 云核：每轮开局获得 1 级雨阶。
  - 2 云核：雨阶不再重置雨滴。
  - 3 云核：自动购买雨滴。
  - 5 云核：自动雨阶。

暂不做：

- 多资源并排经济。
- 岛面地块规划。
- 复杂天气卡牌。
- 多层 tree UI。
- 完整 Atom 级长链。

## 7. 结论

Cloud Island 的增长核心应从“管理多个天气资源”转为：

```text
推高一根天气活力柱子。
用雨阶反复压缩前期。
用云核升级把旧流程自动化和免重置。
用天空心脏长链承接几小时目标。
用天气器官、气压、预报、气候记忆做主题创新。
```

这套结构足够支撑小品级几小时内容，并为后续扩展留下空间。
