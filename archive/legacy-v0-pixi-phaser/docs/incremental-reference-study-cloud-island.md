# 《云上小岛》增量玩法参考研究

日期：2026-05-14

研究对象：

- 《质量增量》：本轮按 `Incremental Mass Rewritten` 理解。
- 《反物质维度》：`Antimatter Dimensions`。
- 《模组树》：`The Modding Tree` / `The Prestige Tree` 系谱。

本文件目标不是把三款游戏的系统搬进《云上小岛》，而是提炼它们为什么能让玩家愿意一直推进，并转换成适合“种天气”的轻量版本。

## 1. 当前设计问题

《云上小岛》现在已经有：

- 6 类资源。
- 5 类建筑。
- 5x5 岛面。
- 三种天气施放。
- 第一条自动链：雨水收集器 Lv.2 自动湿润相邻麦田。
- 总产出、下一目标、瓶颈、自动链状态 UI。

缺口在于：

- 玩法深度仍主要来自“买建筑 / 升级建筑”，策略差异弱。
- 自动链只有一条，玩家到达后缺少继续优化的理由。
- 天气还像一次性操作和倍率按钮，没有形成稳定的 build path。
- 阶段推进仍偏线性，没有形成“旧系统被自动化，新系统打开”的增量层次。

本轮设计方向：

```text
数值增长、瓶颈墙、reset/prestige 是增量游戏骨架。
Cloud Island 要做天气主题的轻量 reset，而不是回避 reset。
```

修正口径：

```text
短期：先把天气链和数值瓶颈做清楚。
中期：加入第一层天气 reset，让玩家把一轮岛屿进度凝结成永久天气能力。
长期：再考虑第二层 reset 或天气树，不提前堆满多层系统。
```

## 2. 参考拆解

### 2.1 《质量增量 / Incremental Mass Rewritten》

可确认特征：

- IncrementalDB 将它描述为一个 Web 端 semi-idle 增量游戏，核心是多重 reset layers、big numbers、local save、offline progress 和 open source。
- Steam 页面把它描述为 layered mathematical reactor：层层解锁 Black Holes、Atomic Generators、Stars 等系统，旧机制会变成新机制的踏板。
- Wiki 的升级表能看到一个很典型的结构：早期升级先提高产出，随后解锁自动购买、让低层 reset 不再清空、让高层资源反过来削弱 scaling 或提升旧系统。

可迁移点：

1. 旧动作自动化  
   早期玩家手动做的事情，后续应该变成系统自己做。例如手动下雨 -> 雨水收集器自动湿润；手动晴天 -> 阳光棱镜周期性成熟；手动微风 -> 风车让云停留更久。

2. Scaling wall 是阶段门槛  
   玩家不是永远线性加速，而是在某个瓶颈前停住。Cloud Island 可用“湿润不足 / 阳光不足 / 扩岛成本高 / 云停留时间短”作为软墙，而不是用天文数字。

3. 高层资源回头改造低层循环  
   不要让新机器只是多一个资源入口。阳光棱镜、风车、雨水收集器应该回头改变麦田、云、天气施放效率。

4. 自动化升级比纯倍率升级更有价值  
   纯 `+20%` 很快变钝；“雨水收集器不再只产雨水，而是自动湿润相邻麦田”更像真正进步。

谨慎迁移：

- 超大数字 notation。
- 多月长度。
- 复杂 softcap / overflow / challenge 表。
- 多标签页数学反应堆式 UI。

需要迁移但要主题化：

- Reset / prestige：从“清空宇宙换高阶货币”改成“季风循环 / 云核凝结”。
- Scaling wall：从抽象公式墙改成湿润、风力、阳光、扩岛成本的瓶颈墙。
- 永久升级：从纯倍率改成自动化、保留项、周期缩短和起始资源。

### 2.2 《反物质维度 / Antimatter Dimensions》

可确认特征：

- Wiki 描述它是 idle incremental，有 unfolding gameplay 和 multiple prestige layers。
- 维度链的基础结构是高维生产低维，低维再生产核心资源。
- Prestige 页列出多个层次：Dimension Boost、Galaxy、Infinity、Eternity、Reality 等，每一层 reset 的范围和保留内容不同。
- 公开基础指南强调：更高维生产更低维，Tickspeed 改变 tick 间隔，Dimension Shift / Boost 解锁新维度或全局 boost，Galaxy 提高 tickspeed 效果，Infinity 后得到 Infinity Points 买强力升级。

可迁移点：

1. 生产链级联  
   不是所有东西都直接生产最终资源。Cloud Island 可以做：

   ```text
   云量 -> 降雨频率 -> 湿润 -> 作物成长 -> 食物/金币
   风力 -> 云停留 -> 降雨机会 -> 湿润
   阳光 -> 成熟效率 -> 收获价值
   ```

   这样玩家会感觉自己在调一条天气链，而不是买平行产出按钮。

2. “解锁新维度”的节奏  
   反物质维度早期会不断解锁更高维。Cloud Island 可以把它转译为：

   ```text
   手动天气 -> 局部天气 -> 相邻天气 -> 周期天气 -> 天气共振
   ```

   每一步都让旧操作仍然存在，但重心后移。

3. Tickspeed 类机制  
   Cloud Island 不需要暴露 tick 公式，但可以有一个玩家能理解的等价物：天气周期。比如“雨云周期 20s -> 16s -> 12s”，让时间本身成为可升级对象。

4. Prestige 的真正价值是换玩法  
   反物质维度的好处不只是 reset 后数字变大，而是新货币、新升级、新系统逐步打开。Cloud Island 应做第一层轻量 reset：完成半自动天气循环后，把本轮岛屿进度凝结成永久天气资源，用来缩短下一轮手动期、保留部分自动化或解锁天气树节点。

不直接迁移：

- 8 维生产层。
- 需要攻略才能高效推进的复杂购买顺序。
- 纯文字表格 UI。

可转译：

- Infinity / Eternity / Reality 的层级感可转译成：

  ```text
  第 1 层 reset：季风循环，获得云核。
  第 2 层 reset：气候重塑，获得气候印记。
  第 3 层 reset：天空生态重生，获得岛屿天赋。
  ```

  但 v0.2 只考虑第 1 层。

### 2.3 《模组树 / The Modding Tree / Prestige Tree》

可确认特征：

- GitHub README 将 The Modding Tree 定义为基于 The Prestige Tree 的增量游戏引擎，用于创建 prestige upgrade tree。
- Modding Tree Wiki 的 layer 文档显示，它支持层节点、分支、tooltip、被动生成、autoPrestige、autoUpgrade、automate、reset propagation、layerShown、shouldNotify 等结构。
- Profectus 文档把 prestige 解释为 reset 部分进度，换取保留的新货币；多个 reset 层会形成递进。

可迁移点：

1. 树不是美术装饰，而是“系统依赖图”  
   Cloud Island 可以用一个小型天气树表达：

   ```text
   雨链：湿润 -> 自动湿润 -> 连锁湿润
   风链：云停留 -> 云聚集 -> 自动飘入
   光链：成熟 -> 收获加成 -> 周期成熟
   ```

   但这个树应该是右侧购买结构或阶段路线，不要替代中央岛面。

2. 节点可见性控制复杂度  
   未到阶段的东西不要提前全露。Cloud Island 当前 5 个建筑已经足够，后续如果加入天气树，应按循环证明逐步显露节点。

3. 通知和可购买高亮很重要  
   Tree 系游戏大量依赖 node highlight 告诉玩家哪里有动作。Cloud Island 已经开始做 `可建 / 接近 / 缺资源`，后续应把这种提示扩展到天气链节点。

4. reset propagation 可转译为“重开后保留自动化骨架”  
   做 reset 后，不应让玩家重复完整新手期。Cloud Island 可以保留部分天气链能力，例如开局保留 1 个雨链节点、开局获得少量雨水、或让第一座雨水收集器自动达到 Lv.2。

不迁移：

- 多层节点树铺屏。
- 每层一个新货币。
- 树节点替代地图对象。
- 模组框架本身。

## 3. Cloud Island 融合设计：天气链 + 轻量 reset

核心设计句：

```text
玩家把一轮小岛天气经营推到瓶颈，然后把这轮天气经验凝结成永久云核，让下一座小岛更快进入自动天气生态。
```

建议把后续深度分成 3 条天气链：

### 3.1 雨链：解决成长

当前已有最小版本：

```text
下雨 -> 麦田成长 -> 雨水收集器 Lv.2 -> 自动湿润相邻麦田
```

可深化：

- 雨水收集器 Lv.3：自动湿润范围从相邻 1 格扩大到十字范围。
- 湿润记忆：被自动湿润过的麦田在 10 秒内成长效率提高。
- 连锁湿润：如果相邻麦田成熟，下一次自动湿润会优先未成熟麦田。

玩家感受：

- 手动下雨从必需动作变成纠偏和加速动作。
- 岛面开始自己推动作物成长。

### 3.2 风链：解决云和时间

当前风力只作为微风天气和资源收益存在。

可深化：

```text
风车 -> 云停留时间增加 -> 天气施放机会增加 -> 雨链更稳定
```

第一批可做：

- 风车 Lv.2：每 18 秒生成一次“慢云”状态，下一次天气施放影响范围 +1。
- 风车 Lv.3：让所有自动天气计时速度提高 10%。

玩家感受：

- 风不是木头/石头倍率，而是调节天气节奏。
- 玩家开始关心“什么时候施放天气最赚”。

### 3.3 光链：解决成熟和收获

当前阳光主要是资源和晴天收益。

可深化：

```text
阳光棱镜 -> 成熟加速 -> 收获价值提高 -> 高阶升级更快
```

第一批可做：

- 阳光棱镜 Lv.2：每 24 秒给相邻麦田一次“日照”，成熟度 +12%。
- 阳光棱镜 Lv.3：成熟麦田保留“丰收”状态，下一次收获 +25% 食物和金币。

玩家感受：

- 阳光不是雨的替代品，而是负责把成长转成更高价值的收获。

## 4. 第一层 reset：季风循环 / 云核凝结

第一层 reset 不叫 prestige，建议叫：

```text
季风循环
```

玩家触发条件：

```text
自动湿润累计 3 次
至少 3 座建筑达到 Lv.2
总产出达到 20/秒
完成阶段 4：进入半自动循环
```

触发后：

```text
重置：
- 当前 6 类基础资源
- 地块解锁状态
- 建筑放置、等级、成长
- 当前阶段进度
- 本轮自动化计时

保留：
- 云核
- 已购买的永久天气天赋
- 总循环次数
- 最高总产出记录
- 累计自动湿润次数记录
```

云核获得公式建议：

```text
cloudCoreGain = floor(sqrt(totalRate / 20) + automationTriggerCount / 3 + completedWeatherChains)
最低 1，首轮通常 1-3 个。
```

这个公式的设计意图：

- 总产出鼓励数值增长。
- 自动湿润次数鼓励半自动链跑起来。
- 天气链完成数鼓励之后做雨 / 风 / 光 build 差异。
- sqrt 避免第一版数值爆掉。

永久天气天赋第一批只做 4 个：

| 天赋 | 花费 | 效果 | 设计目的 |
|---|---:|---|---|
| 初雨记忆 | 1 云核 | 开局雨水 +20 | 缩短第一座雨水收集器前的等待 |
| 轻云牵引 | 1 云核 | 天气施放成长 +10% | 强化手动天气 |
| 蓄水基座 | 2 云核 | 第一座雨水收集器成本 -20% | 更快进入雨链 |
| 自动苗床 | 3 云核 | 开局中心麦田成长 +25% | 缩短首轮收获 |

第一层 reset 的目标体验：

```text
第一轮：10-15 分钟进入半自动。
第二轮：5-8 分钟进入半自动。
第三轮：开始追求更高云核收益，而不是只通关。
```

## 5. 数值增长与瓶颈墙

Cloud Island 需要更明确的数值曲线。推荐拆成三类数值：

### 5.1 基础产出

```text
建筑等级 -> 每秒资源
天气倍率 -> 当前产出速度
地块数量 -> 建筑容量
```

### 5.2 自动化产出

```text
雨链 -> 成长自动化
风链 -> 周期自动化
光链 -> 收获价值自动化
```

### 5.3 永久产出

```text
季风循环 -> 云核
云核天赋 -> 下轮起速、成本降低、保留能力
```

瓶颈墙应该是可读的：

- 食物墙：麦田成熟慢，需要雨链。
- 木头 / 石头墙：扩岛慢，需要微风或风链。
- 雨水墙：自动链慢，需要收集器等级。
- 阳光墙：成熟收益低，需要光链。
- 云核墙：本轮已经半自动，需要 reset 进入下轮。

不要用隐藏公式让玩家卡住；左侧瓶颈提示必须告诉玩家现在卡在哪里。

## 6. 新增深度的最小结构

不要立刻做完整 tree。先做一个“天气链 + 季风循环”状态结构：

```ts
interface WeatherChainState {
  rainChainLevel: number;
  windChainLevel: number;
  sunChainLevel: number;
  chainEvents: Record<string, number>;
}

interface PrestigeState {
  cloudCores: number;
  monsoonCycles: number;
  bestTotalRate: number;
  permanentUpgrades: string[];
}
```

但第一批甚至可以不加这个全局结构，继续挂在现有建筑等级上：

```text
rainCollector Lv.2/Lv.3 = 雨链进度
windmill Lv.2/Lv.3 = 风链进度
sunPrism Lv.2/Lv.3 = 光链进度
```

这样最小、可解释，也不会把当前代码推向复杂状态机。

第一版 reset 可先直接扩展现有 `PrototypeState`，不急着拆大架构。

## 7. UI 融合方案

当前三栏结构继续保留：

```text
左侧：资源 + 总产出 + 下一目标 + 三条天气链摘要
中间：岛面对象和自动触发反馈
右侧：建筑购买 + 当前推荐操作 + 可买/接近节点
```

建议 UI 不新增大面板，只把左侧自动链从单条扩成三条，并在阶段 4 完成后显示季风循环入口：

```text
天气链
雨链：自动湿润 1/3
风链：云停留 未建立
光链：日照成熟 未建立

季风循环
本轮可凝结：2 云核
重置后保留：初雨记忆、轻云牵引
```

每条链只显示：

- 当前状态。
- 下一步动作。
- 一个进度条。

中央地图必须同步表达：

- 雨链：蓝色湿润跳字和水波。
- 风链：云/地块边缘风线，自动计时加速时出现轻量风纹。
- 光链：金色日照跳字和成熟 glow。
- Reset：季风循环触发时，地图出现一轮云环扫过，随后回到初始岛面，但左侧云核和永久天赋保留。

## 8. 推荐实现批次

### Batch A：研究落地前的规则收束

目标：把三款参考转成 Cloud Island 自己的天气链设计，不写代码。

交付：

- 本文件。
- handoff 更新。

### Batch B：雨链深化 + 云核预告

目标：把当前唯一自动链做得更像增量核心，而不是一个隐藏计时器。

实现：

- 雨水收集器 Lv.2 自动湿润保留。
- 雨水收集器 Lv.3 扩大自动湿润范围。
- 自动湿润优先选择未成熟麦田。
- 左侧天气链摘要显示雨链等级和下一次触发。
- 阶段 4 完成后显示“可进行季风循环”的预告，但先不执行 reset。

验收：

- 玩家能在地图上看懂雨链正在接管作物成长。
- 玩家能看见“继续推进是为了获得云核”。
- 不新增建筑。

### Batch C：第一层 reset MVP

目标：真正加入第一层 reset：季风循环。

实现：

- 新增 `cloudCores`、`monsoonCycles`、`bestTotalRate`、`permanentUpgrades`。
- 阶段 4 完成后可点击“季风循环”。
- reset 当前资源、地块、建筑、成长、阶段。
- 保留云核和永久天赋。
- 实现 2-4 个云核天赋。

验收：

- 玩家能完成一次 reset，并明显感觉第二轮起速更快。
- save/load 正常保留云核与天赋。

### Batch D：风链接入

目标：让风影响时间和云，而不是只给资源倍率。

实现：

- 风车 Lv.2 提供自动天气计时加速或下一次施放范围增强。
- 地图有风线反馈。
- 左侧天气链摘要加入风链。

验收：

- 玩家能感觉风车让天气循环更快或更稳定。

### Batch E：光链接入

目标：让阳光负责成熟和收获价值。

实现：

- 阳光棱镜 Lv.2 周期性日照相邻麦田。
- 成熟麦田出现丰收状态。
- 左侧天气链摘要加入光链。

验收：

- 玩家能区分雨链负责成长、光链负责成熟收益。

### Batch F：天气树最小版

目标：只在 reset 和前三条链都成立后，再考虑右侧或左侧加入一个小天气树。

形式：

```text
雨链 Lv.1 -> Lv.2 -> Lv.3
风链 Lv.1 -> Lv.2 -> Lv.3
光链 Lv.1 -> Lv.2 -> Lv.3
共振节点：雨 + 风 / 雨 + 光 / 风 + 光
```

暂不实现：

- 多货币树。
- 节点铺屏。
- 复杂 challenge。

## 9. 设计护栏

从三款参考吸收的规则：

1. 新层必须自动化旧层。
2. 新层必须改变玩家操作方式。
3. 新节点要回头影响旧系统。
4. 购买高亮和下一目标要一直清楚。
5. 数值墙要用可理解的瓶颈表达。
6. Reset 必须给永久能力，不能只是清空重跑。

Cloud Island 特有护栏：

1. 中央岛面不能变成装饰。
2. 天气链反馈必须出现在地图对象旁边。
3. 第一层 reset 必须是主题化的“季风循环 / 云核凝结”，不使用抽象 prestige 话术。
4. 不新增资源，除非现有 6 类资源已经无法表达天气链。
5. 每批只深化一条链或一个 reset 层。
6. 云核是第一种允许新增的 meta resource，因为它承担 reset 核心玩法。

## 10. 第一批实现建议

下一轮建议直接做 Batch B：雨链深化 + 云核预告。

Current SPEC 应限制为：

```text
Files to modify:
- src/App.tsx
- src/styles/app.css
- docs/cloud-island-handoff.md

Core changes:
- 雨水收集器 Lv.3 自动湿润范围扩大。
- 自动湿润优先未成熟麦田。
- 左侧自动链摘要从单条状态升级为“天气链”模块，但先只启用雨链。
- 地图自动湿润反馈更强。
- 阶段 4 完成后显示“季风循环 / 可凝结云核”的预告，不执行 reset。

Explicitly not doing:
- 不做风链。
- 不做光链。
- 不做天气树 UI。
- 不新增建筑。
- 不正式执行 reset；正式 reset 放到 Batch C。
```

第二批再做 Batch C：第一层 reset MVP。

Current SPEC 应限制为：

```text
Core changes:
- 新增云核与季风循环次数。
- 完成阶段 4 后可执行季风循环。
- reset 当前轮基础进度，保留云核与永久天赋。
- 实现 2-4 个永久天气天赋。

Explicitly not doing:
- 不做第二层 reset。
- 不做完整天气树。
- 不做 challenge。
- 不新增建筑。
```

## 11. 参考来源

- Incremental Mass Rewritten on IncrementalDB: https://www.incrementaldb.com/game/incremental-mass-rewritten
- Incremental Mass Rewritten Steam page: https://store.steampowered.com/app/4411510/Incremental_Mass_Rewritten/
- Incremental Mass Rewritten Wiki - Main Upgrades: https://incremental-mass-rewritten.fandom.com/wiki/Main_Upgrades
- Antimatter Dimensions Wiki: https://antimatterdimensions.wiki.gg/
- Antimatter Dimensions Wiki - Prestige: https://antimatterdimensions.wiki.gg/wiki/Prestige
- Antimatter Dimensions on Kongregate: https://www.kongregate.com/en/games/hevipelle/antimatter-dimensions
- The Modding Tree GitHub: https://github.com/Acamaeda/The-Modding-Tree
- The Modding Tree Wiki - Layers: https://modding-tree.fandom.com/wiki/Layers
- Profectus Prestige Mechanic: https://moddingtree.com/guide/recipes/prestige
