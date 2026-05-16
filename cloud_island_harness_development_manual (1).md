# 《云上小岛》Harness 式开发手册

> 项目代号：Cloud Island / 云上小岛  
> 类型：2D 轻增量页游 · 当前重新转向轻量 2D 表现 · 小生态自动化  
> 技术路线：Vite + React + TypeScript；原始渲染层为 PixiJS，当前仓库存在已归档 Phaser 实验，下一轮需收敛  
> 当前目标：先做一个 10 分钟内产生正反馈的 v0.1 灰盒原型

---

## 0. 文档定位

这不是灵感文档，不是世界观设定，也不是长期商业计划。

这是一份 **Harness 工程式开发手册**，用于约束 Codex / Subagent / 人工迭代，保证项目不会在早期发散成大而重的系统。

本手册的作用：

1. 固定 v0.1 的技术栈、玩法边界与视角策略。
2. 固定 v0.1 的功能边界。
3. 将开发拆成可执行 SPEC。
4. 为每个 SPEC 写清楚输入、输出、验收标准与禁止事项。
5. 让 Codex 每次只实现一个小闭环，避免“顺手扩展”。
6. 让所有新增功能必须通过 Harness Checklist 才能进入开发。

---

## 1. 核心定位

### 1.1 一句话定位

《云上小岛》是一款清爽的 2D 轻增量小游戏：玩家经营一座漂浮小岛，通过点击云朵下雨、收集水滴、让作物生长、建造天气机器，逐步搭建一个会自动运转的小天气生态。

### 1.2 核心卖点

> 不是种菜，而是种天气。

玩家不是传统农场主，而是在照顾一个小型天气循环：

- 云会飘过来。
- 玩家点击云让它下雨。
- 雨滴滋养作物。
- 作物成熟后产出云棉与阳光。
- 玩家建造风车、雨水收集器、太阳棱镜。
- 小岛逐渐从手动劳动变成自动循环。

### 1.3 情绪目标

v0.1 的情绪目标非常明确：

> 轻、软、清爽、看得见成长、没有沉重文本负担。

玩家应该获得这样的感受：

- “云掉雨滴好舒服。”
- “作物长起来了。”
- “我买了机器，小岛开始自己动了。”
- “这个小东西有点可爱，我想继续点几分钟。”

### 1.4 非目标

v0.1 明确不做：

- 不做剧情。
- 不做角色对话。
- 不做任务系统。
- 不做战斗。
- 不做敌人。
- 不做多岛屿。
- 不做复杂科技树。
- 不做 3D。
- 不做真正 2.5D / 等距引擎系统。
- 不做等距 tile map、自由建造、寻路、摄像机旋转或复杂遮挡系统。
- 不做 WASD 角色控制。
- 不做 AI 生成内容。
- 不做复杂离线收益。
- 不做广告、登录、联网、账号。
- 不做移动端适配优先。
- 不做 Steam 版或桌面打包。

v0.1 只追一个结果：

> 10 分钟内，玩家从手动点击云下雨，发展到第一套半自动天气循环。

---

## 2. 技术路线

### 2.1 平台选择

首版做页游，不使用 Unity / Godot。

选择页游的原因：

- 迭代速度快。
- 浏览器刷新即可验证。
- 适合 Codex 修改。
- 适合 HTML/CSS 面板 + Canvas 动画混合。
- 适合轻量挂机和本地存档。
- 不需要引擎资产管线。

### 2.2 推荐技术栈

```text
Vite
React
TypeScript
PixiJS
CSS Modules 或普通 CSS
localStorage
```

职责划分：

| 层 | 技术 | 职责 |
|---|---|---|
| 渲染层 | PixiJS | 云、雨滴、小岛、作物、机器动画 |
| UI 层 | React + HTML/CSS | 资源栏、升级面板、按钮、提示信息 |
| 逻辑层 | TypeScript | 资源计算、tick、升级、解锁、存档 |
| 存档层 | localStorage | v0.1 本地保存 |

### 2.3 为什么不用纯 Canvas UI

增量游戏有大量文本、按钮、数字、tooltip。  
这些内容使用 DOM 更高效、更容易调样式，也更适合后续扩展。

PixiJS 只负责“会动的小岛生态”。

### 2.4 为什么不用 Phaser

Phaser 更像完整 2D 游戏框架，适合横板动作、碰撞、关卡、物理。  
《云上小岛》v0.1 不需要复杂物理与关卡系统，更像一个互动生态动画，因此 PixiJS 更轻。

---

## 3. 视角与交互

### 3.1 视角

v0.1 greybox 采用 **2D 侧视浮岛视角**。

画面结构：

```text
上方：天空、云朵、太阳光
中部：漂浮小岛、作物地、水槽、风车、机器
下方/右侧：资源栏、升级按钮、状态提示
```

此前曾探索 **像素风伪 2.5D 漂浮空岛资产拼接**，但该路线当前已归档，不再作为默认后续方向。

视角策略：

```text
当前新路线：轻量 2D 漂浮小岛
表现重点：清爽、可读、少量固定作物和天气机器
底层实现：简单 2D 坐标 + 固定锚点 + 轻量动画层
```

已归档的伪 2.5D 探索包括：

- 固定角度空岛 sprite。
- 像素风 2.5D asset board。
- 岛面投影坐标。
- 岛面网格化。
- Phaser 网格岛实验。

归档原因：

- 坐标系统和网格化成本过高。
- 资产角度一致性要求过高。
- 项目焦点从轻松放置反馈偏移到场景架构。
- Phaser 实验增加了依赖和 bundle 体积。

后续默认禁止继续：

- 不做真正等距 tile map。
- 不做自由建筑摆放。
- 不做建筑旋转。
- 不做角色寻路。
- 不做可旋转摄像机。
- 不做任意对象复杂深度遮挡。
- 不借视觉升级扩展新玩法系统。
- 不继续伪 2.5D 网格岛，除非用户明确重新打开该路线。

### 3.2 为什么当前不继续 2.5D / 3D

v0.1 不继续 2.5D / 3D 系统，因为它们会带来以下负担：

- 资产角度统一。
- 摄像机控制。
- 点击命中复杂化。
- 层级遮挡。
- 模型/材质/光照工作量。
- Codex 迭代成本升高。

当前目标是快速做出有趣的小循环，不是追求最终视觉上限。

视觉上可以保留“天空小岛”的清爽感，但工程和资产都应回到 2D idle 的轻量实现。

### 3.3 操作方式

首版仅支持鼠标：

- 点击云朵：让云下雨。
- 点击成熟作物：收获。
- 点击升级按钮：购买升级。
- 点击机器按钮：建造或升级机器。

v0.1 不做拖拽、不做键盘移动、不做复杂手势。

---

## 4. 项目结构 SPEC

### SPEC-ARCH-001：基础目录结构

#### 目标

建立清晰、可扩展但不过度工程化的项目结构。

#### 推荐结构

```text
src/
  main.tsx
  App.tsx

  game/
    GameCanvas.tsx
    createPixiApp.ts
    gameLoop.ts

    entities/
      Cloud.ts
      Raindrop.ts
      CropPlot.ts
      Machine.ts

    systems/
      weatherSystem.ts
      growthSystem.ts
      resourceSystem.ts
      upgradeSystem.ts
      saveSystem.ts

    state/
      gameState.ts
      gameTypes.ts

  ui/
    ResourceBar.tsx
    UpgradePanel.tsx
    MachinePanel.tsx
    StatusToast.tsx

  data/
    constants.ts
    upgrades.ts
    machines.ts
    crops.ts

  styles/
    global.css
    app.css
```

#### 验收标准

- 项目能通过 `npm run dev` 启动。
- `GameCanvas` 负责挂载 PixiJS。
- React UI 与 PixiJS 画面分离。
- 游戏数据集中在 `data/` 与 `game/state/`。
- 不出现所有逻辑挤在 `App.tsx` 的情况。

#### 禁止事项

- 禁止一开始引入复杂 ECS。
- 禁止引入 Redux 等重型状态管理。
- 禁止拆分过细导致 v0.1 难以维护。
- 禁止为了伪 2.5D 视觉引入等距地图引擎、3D 引擎或物理/寻路系统。

---

## 5. 游戏状态 SPEC

### SPEC-STATE-001：核心 GameState

#### 目标

定义 v0.1 所需最小状态。

#### 数据结构建议

```ts
export interface Resources {
  water: number;
  cloudCotton: number;
  sunlight: number;
}

export interface UpgradeLevels {
  cloudCapacity: number;
  clickRainPower: number;
  cropGrowthSpeed: number;
  waterStorage: number;
  rainCollectorEfficiency: number;
  windmillPower: number;
  sunPrismPower: number;
}

export interface Unlocks {
  rainCollector: boolean;
  windmill: boolean;
  sunPrism: boolean;
  autoHarvest: boolean;
}

export interface GameState {
  resources: Resources;
  upgrades: UpgradeLevels;
  unlocks: Unlocks;
  totalPlayTimeSeconds: number;
  lastSaveAt: number;
}
```

#### v0.1 初始值

```ts
resources = {
  water: 0,
  cloudCotton: 0,
  sunlight: 0,
};

upgrades = {
  cloudCapacity: 1,
  clickRainPower: 1,
  cropGrowthSpeed: 1,
  waterStorage: 1,
  rainCollectorEfficiency: 0,
  windmillPower: 0,
  sunPrismPower: 0,
};

unlocks = {
  rainCollector: false,
  windmill: false,
  sunPrism: false,
  autoHarvest: false,
};
```

#### 验收标准

- 所有资源变化都通过统一函数处理。
- UI 可以实时显示资源。
- 升级购买后状态立即变化。
- 状态可序列化为 JSON。

#### 禁止事项

- 禁止资源直接散落在各个 React 组件里。
- 禁止 Pixi entity 私自持有长期经济状态。

---

## 6. 资源系统 SPEC

### SPEC-RESOURCE-001：资源定义

v0.1 使用三种资源：

| 资源 | 字段 | 来源 | 用途 |
|---|---|---|---|
| 水滴 | water | 点击云下雨、雨水收集器 | 作物成长、部分升级 |
| 云棉 | cloudCotton | 作物收获 | 建造机器、升级云相关能力 |
| 阳光 | sunlight | 作物收获、太阳棱镜 | 加速成长、高级升级 |

v0.1 暂不加入风息。  
风息可作为 v0.2 资源。

### SPEC-RESOURCE-002：资源变化规则

#### 水滴

- 点击云产生雨滴。
- 雨滴落入作物地时，部分转化为作物成长。
- 雨滴落入水槽/收集器时，转化为 water 资源。

#### 云棉

- 作物成熟后点击收获，获得 cloudCotton。
- 数量受作物等级和成长速度影响。

#### 阳光

- 作物成熟有少量 sunlight 收益。
- 太阳棱镜周期性产出或加速阳光收益。

### 验收标准

- 玩家 1 分钟内可以获得第一批 water。
- 玩家 3 分钟内可以获得第一批 cloudCotton。
- 玩家 5-7 分钟内能解锁第一个自动化机器。

---

## 7. 云系统 SPEC

### SPEC-CLOUD-001：云实体

#### 目标

云是 v0.1 的核心互动对象。

#### 属性

```ts
interface CloudModel {
  id: string;
  x: number;
  y: number;
  waterAmount: number;
  maxWater: number;
  driftSpeed: number;
  scale: number;
  cooldown: number;
}
```

#### 行为

- 云在屏幕上方缓慢横向飘动。
- 玩家点击云，云释放雨滴。
- 每次点击减少 `waterAmount`。
- 云的视觉大小随 `waterAmount` 略微变化。
- 云水量耗尽后，云逐渐恢复或飘离后重生。

### SPEC-CLOUD-002：点击下雨

#### 输入

玩家点击云。

#### 输出

- 生成若干雨滴实体。
- 云播放缩放反馈动画。
- 云水量减少。

#### 数值建议

```text
基础点击：生成 3 个雨滴
clickRainPower 每级：+1 雨滴
云水量基础：20
cloudCapacity 每级：+10 maxWater
```

#### 反馈要求

- 云被点击时轻微压缩。
- 雨滴从云下方散落。
- 有轻微粒子或闪光反馈。

#### 禁止事项

- 禁止点击云直接只增加数字，不生成雨滴。
- 禁止云作为纯 UI 按钮。

---

## 8. 雨滴系统 SPEC

### SPEC-RAIN-001：雨滴实体

#### 属性

```ts
interface RaindropModel {
  id: string;
  x: number;
  y: number;
  vy: number;
  value: number;
  target?: "crop" | "collector" | "ground";
}
```

#### 行为

- 雨滴从云下落。
- 命中作物地时增加作物成长。
- 命中雨水收集器时增加 water。
- 落到空地时可产生小水花，但不产生收益或只产生少量 water。

### SPEC-RAIN-002：命中反馈

#### 作物命中

- 作物轻微弹跳。
- 成长条上升。
- 地块变湿一点。

#### 收集器命中

- 水槽液面上升或闪光。
- water 数字增加。

#### 空地命中

- 小水花。
- 可选：极少量 water。

---

## 9. 作物系统 SPEC

### SPEC-CROP-001：作物地

v0.1 固定 3 块作物地。

```ts
interface CropPlotModel {
  id: string;
  x: number;
  y: number;
  growth: number;
  growthRequired: number;
  isReady: boolean;
  moisture: number;
}
```

### SPEC-CROP-002：成长规则

- 雨滴命中作物地，增加 moisture。
- moisture 自动转化为 growth。
- 太阳棱镜可以提高 growth 转化速度。
- growth 达到 growthRequired 后，作物成熟。

#### 数值建议

```text
基础 growthRequired：100
每个雨滴：+8 moisture
每秒 moisture 转 growth：5 * cropGrowthSpeed
太阳棱镜激活时：growth 转化速度 +50% 起步
```

### SPEC-CROP-003：收获规则

成熟后玩家点击作物地：

- 获得 cloudCotton。
- 少量获得 sunlight。
- 作物 growth 重置为 0。
- 播放收获动画。

#### 数值建议

```text
基础收获：+5 cloudCotton
基础阳光：+1 sunlight
```

#### 禁止事项

- v0.1 不做多种作物。
- v0.1 不做种子系统。
- v0.1 不做作物选择。

---

## 10. 机器系统 SPEC

### SPEC-MACHINE-001：机器列表

v0.1 只有 3 个机器：

| 机器 | 作用 | 解锁阶段 |
|---|---|---|
| 雨水收集器 | 自动收集落下雨滴为 water | 早期 |
| 风车 | 增加云飘向小岛的概率 / 调整云速度 | 中期 |
| 太阳棱镜 | 周期性加速作物成长 / 产出 sunlight | 中后期 |

### SPEC-MACHINE-002：雨水收集器

#### 解锁成本

```text
water: 30
cloudCotton: 10
```

#### 效果

- 创建一个收集区域。
- 雨滴落入该区域时，自动增加 water。
- 等级越高，收集区域越大或收益越高。

#### 反馈

- 水槽液面轻微上升。
- 命中时有蓝色小闪光。

### SPEC-MACHINE-003：风车

#### 解锁成本

```text
cloudCotton: 25
sunlight: 5
```

#### 效果

- 云更容易停留在小岛上方。
- 或云 driftSpeed 降低，使玩家更容易点击。
- 风车等级越高，云刷新更稳定。

#### v0.1 简化实现

- windmillPower > 0 时，云进入小岛区域的概率提升。
- 或云在小岛上方的速度降低 30%。

### SPEC-MACHINE-004：太阳棱镜

#### 解锁成本

```text
cloudCotton: 40
sunlight: 10
```

#### 效果

- 每隔 N 秒照射一块作物地。
- 被照射的作物 growth 转化速度提升。
- 可少量产出 sunlight。

#### v0.1 简化实现

- 每 10 秒触发一次 3 秒加速。
- 加速期间所有作物成长速度 +50%。

---

## 11. 升级系统 SPEC

### SPEC-UPGRADE-001：升级原则

升级要少、直接、可见。

v0.1 升级数量控制在 6-8 个。

每个升级必须满足至少一个条件：

- 提高点击收益。
- 提高自动收益。
- 解锁新机器。
- 明显改变画面反馈。

### SPEC-UPGRADE-002：升级列表

#### 1. 云容量

```text
名称：蓬松云层
效果：云最大水量 +10
成本：water + cloudCotton
```

#### 2. 点击雨量

```text
名称：轻轻一挤
效果：每次点击云生成雨滴 +1
成本：water
```

#### 3. 作物成长速度

```text
名称：湿润土壤
效果：作物 moisture 转 growth 速度提升
成本：water + cloudCotton
```

#### 4. 雨水收集器解锁 / 升级

```text
名称：小水槽
效果：解锁雨水收集器，后续升级提高收集效率
成本：water + cloudCotton
```

#### 5. 风车解锁 / 升级

```text
名称：风向标
效果：解锁风车，云更容易停留在小岛上方
成本：cloudCotton + sunlight
```

#### 6. 太阳棱镜解锁 / 升级

```text
名称：太阳棱镜
效果：周期性加速作物成长
成本：cloudCotton + sunlight
```

#### 7. 自动收获

```text
名称：小岛助手
效果：成熟作物自动收获
成本：较高，作为 v0.1 末期目标
```

### SPEC-UPGRADE-003：成本增长

v0.1 使用简单成本表，不使用复杂公式。

例如：

```ts
const upgradeCosts = {
  clickRainPower: [10, 25, 60, 120],
  cloudCapacity: [15, 40, 90],
  cropGrowthSpeed: [20, 50, 110],
};
```

#### 禁止事项

- v0.1 不做指数爆炸大数值。
- v0.1 不做转生。
- v0.1 不做多层货币。

---

## 12. 游戏循环 SPEC

### SPEC-LOOP-001：基础 Tick

游戏每帧更新画面，但经济逻辑使用固定 tick。

建议：

```text
渲染：requestAnimationFrame
逻辑 tick：每 100ms 或每帧 deltaTime 累积
存档：每 10 秒自动保存
```

### SPEC-LOOP-002：10 分钟体验曲线

v0.1 的体验曲线目标：

| 时间 | 玩家体验 |
|---|---|
| 0-1 分钟 | 学会点击云下雨，看到作物成长 |
| 1-3 分钟 | 第一次收获，获得云棉/阳光 |
| 3-5 分钟 | 购买第一个点击/成长升级 |
| 5-7 分钟 | 解锁雨水收集器，看到自动收水 |
| 7-9 分钟 | 解锁风车或太阳棱镜 |
| 9-10 分钟 | 小岛进入半自动循环，玩家有继续升级的欲望 |

### SPEC-LOOP-003：失败条件

v0.1 没有失败条件。

理由：

- 当前目标是正反馈。
- 不做惩罚。
- 不做压力。
- 不做灾害。

---

## 13. 存档系统 SPEC

### SPEC-SAVE-001：localStorage 存档

#### 内容

保存：

- resources
- upgrades
- unlocks
- totalPlayTimeSeconds
- lastSaveAt

不保存：

- 当前雨滴位置。
- 当前云实体精确状态。
- 当前动画状态。

加载后重新生成云和场景即可。

### SPEC-SAVE-002：自动保存

- 每 10 秒保存一次。
- 每次购买升级立即保存。
- 页面关闭前尝试保存。

### SPEC-SAVE-003：重置按钮

v0.1 必须提供重置存档按钮。  
防止测试时卡状态。

---

## 14. UI SPEC

### SPEC-UI-001：资源栏

展示：

```text
水滴：xxx
云棉：xxx
阳光：xxx
```

要求：

- 数字变化时轻微跳动或高亮。
- 资源不足时升级按钮置灰。

### SPEC-UI-002：升级面板

每个升级按钮显示：

- 名称。
- 当前等级。
- 效果简述。
- 成本。
- 是否可购买。

示例：

```text
轻轻一挤 Lv.2
每次点击云 +1 雨滴
成本：水滴 25
```

### SPEC-UI-003：状态提示

屏幕角落显示短提示：

- “雨水收集器建好了！”
- “作物成熟了。”
- “风车让云慢下来了。”

提示时间 2-3 秒，自动消失。

### SPEC-UI-004：不做复杂教程

v0.1 不做完整教程。  
只做极短提示：

```text
点击云朵，让它下雨。
雨会让小岛上的作物成长。
```

---

## 15. 视觉反馈 SPEC

### SPEC-FEEDBACK-001：必须实现的反馈

v0.1 必须优先实现以下反馈：

1. 云被点击时缩放。
2. 雨滴实际下落。
3. 雨滴命中作物时作物轻弹。
4. 作物成长阶段变化。
5. 作物成熟时发光。
6. 收获时资源飞字或小粒子。
7. 机器建造后出现在岛上。
8. 风车转动。
9. 太阳棱镜周期性发光。

### SPEC-FEEDBACK-002：优先级

优先级高于数值复杂度。

如果时间有限：

> 先让云、雨、作物和机器动起来，再调数值。

---

## 16. 美术资源与资产管线 SPEC

### 16.0 本节定位

v0.1 玩法实现阶段默认不混入 image generation。只有用户明确批准 Art Pass 时，才允许生成或接入新的美术资产。

目标不是追求最终商业美术，而是：

> 用最小成本生成一套风格统一、可替换、能支撑 10 分钟体验的清爽占位资产。

本节用于约束：

- 资产类型。
- 资产格式。
- 文件目录。
- 命名规则。
- Codex 生成方式。
- PixiJS 加载方式。
- 验收标准。

---

### SPEC-ART-001：v0.1 美术策略

v0.1 greybox / polish 采用 **程序图形 + SVG 资产 + 少量可选 PNG** 的混合策略。

优先级：

```text
第一优先级：程序图形，直接用 Pixi Graphics 画
第二优先级：Codex 生成 SVG，作为可维护矢量资产
第三优先级：少量 PNG，用于更柔和的云、岛、光效
```

原因：

- 程序图形最快，适合云、雨滴、基础地块。
- SVG 易读、易改、适合 Codex 生成。
- PNG 可用于后续视觉提升，但 v0.1 不依赖。

v0.1 禁止引入复杂外部素材包。

此前 Art Pass 曾探索：

```text
视觉目标：像素风伪 2.5D 漂浮天气小岛
资产方式：像素风 sprite sheet / asset board
实现方式：PixiJS / Phaser 组合渲染
逻辑方式：2D 坐标、固定锚点、简单 hitbox
```

该路线当前已归档。新的 Art Pass 应转为轻量 2D 资产：简单岛、云、作物阶段、机器和天气特效，不再默认生成伪 2.5D 像素网格资产。

---

### SPEC-ART-002：资产目录结构

新增目录：

```text
public/
  assets/
    art/
      cloud/
        cloud_01.svg
        cloud_02.svg
      island/
        island_base.svg
      crop/
        crop_stage_0.svg
        crop_stage_1.svg
        crop_stage_2.svg
        crop_ready.svg
      machine/
        rain_collector.svg
        windmill_base.svg
        windmill_blades.svg
        sun_prism.svg
      fx/
        raindrop.svg
        sparkle.svg
        sunbeam.svg
    manifest.json
```

说明：

- `public/assets/art/` 用于静态美术资源。
- `manifest.json` 记录资产路径与用途。
- 资源名使用小写蛇形命名。
- v0.1 不需要 texture atlas。
- v0.2 以后如果资产数量明显增加，再考虑 spritesheet / atlas。

---

### SPEC-ART-003：资产命名规则

命名格式：

```text
类别_描述_序号.格式
```

示例：

```text
cloud_soft_01.svg
crop_sprout_01.svg
machine_windmill_blades.svg
fx_raindrop_01.svg
```

禁止：

- `image1.png`
- `new_asset.svg`
- `final_final.png`
- 中文文件名
- 空格文件名

---

### SPEC-ART-004：v0.1 必需资产清单

v0.1 至少需要以下资产或程序图形等价物：

| 类别 | 数量 | 格式建议 | 说明 |
|---|---:|---|---|
| 云朵 | 2 | SVG 或程序图形 | 普通白云、稍大的白云 |
| 雨滴 | 1 | SVG 或程序图形 | 小水滴，可重复生成 |
| 小岛底座 | 1 | SVG 或程序图形 | 浮岛主体 |
| 作物阶段 | 4 | SVG | 空地 / 小芽 / 成长 / 成熟 |
| 雨水收集器 | 1 | SVG | 小水槽或瓶状机器 |
| 风车 | 2 | SVG | 底座与叶片分开，便于旋转 |
| 太阳棱镜 | 1 | SVG | 三角形棱镜或小塔 |
| 光束 | 1 | SVG 或程序图形 | 棱镜触发时显示 |
| 闪光粒子 | 1 | SVG 或程序图形 | 收获 / 命中反馈 |

如果时间不够，可以先只做：

```text
云朵
雨滴
小岛
作物 4 阶段
雨水收集器
风车
太阳棱镜
```

---

### SPEC-ART-005：视觉风格约束

风格关键词：

```text
清爽
柔和
圆润
低对比
浅蓝
奶白
淡金
浅绿
轻盈
```

推荐色板：

```text
天空蓝：#BFE7FF
云白：#F7FBFF
淡金：#FFD978
嫩绿：#A9D98E
岛土：#D6B98C
水蓝：#73C7FF
UI 深蓝灰：#35556A
```

禁止风格：

- 阴暗。
- 怪诞。
- 克苏鲁。
- 赛博朋克。
- 高饱和霓虹。
- 写实厚涂。
- 恐怖氛围。
- 过度复杂细节。

---

### SPEC-ART-006：Codex 生成 SVG 的规则

Codex 可以直接生成 SVG 文件，但必须遵守：

1. SVG 必须简洁，不超过 120 行。
2. 优先使用基础形状：circle、ellipse、rect、path、polygon。
3. 不使用外链图片。
4. 不嵌入字体。
5. 不使用复杂滤镜，除非确有必要。
6. 每个 SVG 使用明确 viewBox。
7. 资产必须能在浏览器中直接打开预览。
8. 资产风格必须符合 SPEC-ART-005。

示例要求：

```text
请生成 public/assets/art/cloud/cloud_01.svg。
要求：奶白色软云，由 4-6 个圆形组成，浅蓝阴影，viewBox 0 0 128 80，不要复杂滤镜。
```

---

### SPEC-ART-007：程序图形优先规则

以下对象优先使用 Pixi Graphics 程序绘制：

- 雨滴。
- 简单粒子。
- 光束。
- 圆形点击波纹。
- 简单阴影。
- 调试用 hitbox。

以下对象建议使用 SVG：

- 云。
- 作物阶段。
- 小岛底座。
- 风车。
- 雨水收集器。
- 太阳棱镜。

原因：

- 动态大量生成的小对象适合程序图形。
- 需要稳定识别度的对象适合 SVG 资产。

---

### SPEC-ART-008：PixiJS 资产加载

使用 PixiJS `Assets` 加载静态资源。

建议创建：

```text
src/game/assets/assetManifest.ts
src/game/assets/loadAssets.ts
```

示例结构：

```ts
export const ART_ASSETS = {
  cloud01: "/assets/art/cloud/cloud_01.svg",
  islandBase: "/assets/art/island/island_base.svg",
  cropStage0: "/assets/art/crop/crop_stage_0.svg",
  cropStage1: "/assets/art/crop/crop_stage_1.svg",
  cropStage2: "/assets/art/crop/crop_stage_2.svg",
  cropReady: "/assets/art/crop/crop_ready.svg",
  rainCollector: "/assets/art/machine/rain_collector.svg",
  windmillBase: "/assets/art/machine/windmill_base.svg",
  windmillBlades: "/assets/art/machine/windmill_blades.svg",
  sunPrism: "/assets/art/machine/sun_prism.svg",
};
```

加载函数：

```ts
import { Assets } from "pixi.js";
import { ART_ASSETS } from "./assetManifest";

export async function loadArtAssets() {
  await Assets.load(Object.values(ART_ASSETS));
}
```

v0.1 不强制做加载进度条。  
但如果资产未加载完成，画面不应报错崩溃。

---

### SPEC-ART-009：资产 fallback

每个关键实体必须有 fallback 程序图形。

例如：

- 云 SVG 加载失败 → 用 Pixi Graphics 画 5 个白色圆。
- 作物 SVG 加载失败 → 用绿色小圆/小芽占位。
- 风车 SVG 加载失败 → 用直线和圆形占位。

验收标准：

> 即使 assets 文件夹缺失，游戏也应该能运行，只是视觉退回程序图形。

---

### SPEC-ART-010：资产验收标准

每个新资产必须通过以下检查：

```text
1. 文件名符合命名规则。
2. 能在浏览器直接打开。
3. 颜色符合清爽色板。
4. 在 64px、128px、256px 下都能看清。
5. 没有复杂外链和不可控依赖。
6. 加载失败时有 fallback。
7. 不引入沉重风格或黑域边界式视觉。
```

---

### SPEC-ART-011：v0.1 美术开发顺序

不要一开始就生成全套资产。

按 Phase 需要逐步生成：

```text
Phase 0：不生成资产，只用背景色和空 canvas
Phase 1：生成云朵、雨滴
Phase 2：生成小岛、作物阶段
Phase 4：生成雨水收集器
Phase 5：生成风车底座与叶片
Phase 6：生成太阳棱镜与光束
Phase 7：补缺失反馈粒子
```

这样能防止 Codex 在 Phase 0 就花大量时间画素材。

---

### SPEC-ART-012：禁止事项

v0.1 美术阶段禁止：

- 禁止生成大量 PNG 大图。
- 禁止引入外部素材库。
- 禁止使用未经确认的 AI 图像资产。
- 禁止做复杂角色立绘。
- 禁止做多套皮肤。
- 禁止做天气灾害视觉。
- 禁止做昼夜循环完整美术。
- 禁止做复杂粒子系统。
- 禁止为美术资源改技术栈。

### SPEC-ART-013：轻量 2D Art Pass 规则

后续只有在用户明确要求 Art Pass 时，才允许接入新的美术资产。

允许：

- 生成或接入 2D 空岛底座、云朵、作物阶段、雨水收集器、风车、太阳棱镜等拆分资产。
- 增加简单远景云层或天空背景。
- 使用固定 2D 锚点摆放作物和机器。
- 使用渲染层顺序管理背景、天气、岛屿、作物、机器和特效。
- 优先生成小型可替换资产，而不是完整主画面概念图。

禁止：

- 生成整张全屏插画直接替代游戏画面。
- 用视觉升级引入自由建造、多岛屿、路径寻路或复杂遮挡。
- 在 gameplay bugfix、数值调整、性能修复任务中顺手调用 image generation。
- 默认继续伪 2.5D 像素网格岛。
- 为视觉路线改用 3D、等距地图引擎或大型新库。

推荐层级：

```text
backgroundSky
farClouds
farIslands
weatherClouds
rainLayer
islandBase
crops
machines
fxLayer
uiOverlay
```

---

### 第一条资产生成提示词模板

```text
请为《云上小岛》v0.1 生成 Phase 1 所需的最小 SVG 资产。

范围：
1. public/assets/art/cloud/cloud_01.svg
2. public/assets/art/cloud/cloud_02.svg

风格：
清爽、柔和、圆润、奶白色、浅蓝阴影，不要怪诞，不要写实，不要复杂滤镜。

技术要求：
- 每个 SVG viewBox 0 0 128 80。
- 不使用外链。
- 不嵌入字体。
- 不超过 120 行。
- 可以由 ellipse / circle / path 组成。
- 浏览器直接打开应正常显示。

不要生成其他资产。
不要修改游戏逻辑。
生成后说明文件路径和预览方式。
```

---

## 17. 数值 Harness SPEC

### SPEC-BALANCE-001：数值目标

v0.1 只服务 10 分钟体验。

关键验收：

- 1 分钟内获得第一次资源反馈。
- 3 分钟内获得第一次收获。
- 5 分钟内能买第一个升级。
- 7 分钟内能解锁第一个自动化机器。
- 10 分钟内能看到至少 2 个自动化对象运作。

### SPEC-BALANCE-002：模拟脚本

建议编写简单模拟函数，不需要完整测试框架。

模拟内容：

```text
假设玩家每 2 秒点击一次云。
假设玩家资源足够时购买当前最便宜升级。
模拟 10 分钟。
输出：每分钟资源、升级数、机器解锁时间。
```

### SPEC-BALANCE-003：验收指标

```text
第 1 分钟：water > 0
第 3 分钟：cloudCotton > 0
第 5 分钟：至少 1 个升级
第 7 分钟：rainCollector 解锁或接近解锁
第 10 分钟：至少 1 个自动化机器已运作
```

---

## 18. 开发阶段规划

## Phase 0：项目脚手架

### 目标

建立 Vite + React + TypeScript + PixiJS 项目。

### SPEC

- 初始化项目。
- PixiJS canvas 能显示在页面上。
- React UI 能显示资源栏。
- 有基础 CSS。

### 验收

- 浏览器能打开页面。
- 中央有空白小岛画面。
- 右侧或底部有资源栏。

---

## Phase 1：云与雨

### 目标

完成第一个互动正反馈。

### SPEC

- 云在上方漂浮。
- 点击云生成雨滴。
- 云被点击时缩放。
- 雨滴下落。
- 雨滴落地消失。

### 验收

- 玩家可以连续点击云。
- 屏幕上能看到雨滴落下。
- 云的反馈明显。

---

## Phase 2：作物成长

### 目标

让雨滴产生可见结果。

### SPEC

- 创建 3 块作物地。
- 雨滴命中作物地增加成长。
- 作物有至少 3 个视觉阶段。
- 成熟后可点击收获。
- 收获获得 cloudCotton / sunlight。

### 验收

- 玩家能通过下雨让作物成熟。
- 收获后资源增加。
- 作物重置并可再次成长。

---

## Phase 3：升级系统

### 目标

建立增量反馈。

### SPEC

- 添加 4 个基础升级。
- 升级会消耗资源。
- 升级会改变点击雨量、云容量、成长速度。
- UI 显示可购买/不可购买。

### 验收

- 玩家能购买升级。
- 升级后效果肉眼可见。

---

## Phase 4：雨水收集器

### 目标

实现第一个自动化对象。

### SPEC

- 解锁雨水收集器。
- 雨滴落入收集器区域时自动增加 water。
- 收集器有简单动画。

### 验收

- 玩家不点击作物也能通过雨滴获得 water。
- 收集器存在感明确。

---

## Phase 5：风车

### 目标

让云移动变得可控或更友好。

### SPEC

- 解锁风车。
- 风车建造后出现在岛上。
- 风车转动。
- 云在小岛上方停留时间增加，或漂移速度降低。

### 验收

- 玩家感到云更容易被点击或命中岛。
- 风车动画可见。

---

## Phase 6：太阳棱镜

### 目标

加入第二个自动化/加速对象。

### SPEC

- 解锁太阳棱镜。
- 棱镜周期性发光。
- 发光期间作物成长更快。

### 验收

- 玩家能看到光束或闪光。
- 作物成长速度在棱镜期间明显提升。

---

## Phase 7：存档与 10 分钟体验

### 目标

把 v0.1 变成可反复试玩的小原型。

### SPEC

- localStorage 自动保存。
- 重置按钮。
- 简单 10 分钟数值校准。
- 状态提示。

### 验收

- 刷新页面后资源和升级保留。
- 重置功能可用。
- 玩家 10 分钟内能看到半自动循环。

---

## 19. Codex 工作流 SPEC

### SPEC-CODEX-001：每轮工作流程

每次让 Codex 开发时，必须遵守：

1. 先读取本开发手册。
2. 明确本轮只做哪个 Phase / SPEC。
3. 先输出简短计划。
4. 只实现本轮范围。
5. 实现后输出改动摘要。
6. 说明如何本地验证。
7. 不主动扩展下一阶段功能。

### SPEC-CODEX-002：禁止行为

Codex 不得：

- 未经确认加入剧情。
- 未经确认加入战斗。
- 未经确认加入新资源。
- 未经确认改技术栈。
- 未经确认引入大型库。
- 未经确认把 Pixi UI 全部换成 Canvas。
- 未经确认写复杂科技树。
- 未经确认增加 3D 或物理引擎。

### SPEC-CODEX-003：实现前检查

每次 Codex 实现前，必须回答：

```text
本轮 SPEC：
将修改文件：
将新增文件：
不会做的事：
验收方式：
```

---

## 20. Subagent 策略

v0.1 初期可以使用 3 个 subagent，但每次只允许一个最终实现者改代码。

### Subagent 1：Gameplay Loop Reviewer

职责：检查本轮是否增强核心循环。

关注：

- 是否让玩家更快获得正反馈。
- 是否让小岛更自动。
- 是否增加了不必要复杂度。

### Subagent 2：Implementation Architect

职责：检查技术实现是否最小、安全、可维护。

关注：

- 文件修改范围。
- 状态归属。
- Pixi 与 React 分界。
- 是否有回归风险。

### Subagent 3：Feel & Feedback Reviewer

职责：检查交互反馈是否足够明显。

关注：

- 云是否有点击反馈。
- 雨滴是否可见。
- 作物成长是否舒服。
- 自动机器是否有存在感。

### 使用规则

- 设计讨论阶段：3 个 subagent 都不改代码。
- 实现阶段：只有主 implementer 改代码。
- 测试阶段：reviewer 可以提出问题，但不直接重写。

---

## 21. 第一条 Codex 启动提示词

```text
我们要新建一个全新的小型页游原型《云上小岛》，不再迭代《黑域边界》。请严格遵守开发手册，不要自行扩展范围。

项目类型：2D 侧视轻增量 / 挂机小生态游戏。
技术栈：Vite + React + TypeScript + PixiJS。
平台：页游。
目标：v0.1 灰盒，10 分钟内让玩家从手动点击云下雨，发展到第一套半自动天气循环。

本轮只做 Phase 0：项目脚手架。

Phase 0 目标：
1. 初始化 Vite + React + TypeScript 项目。
2. 接入 PixiJS。
3. 页面中显示一个 Pixi canvas 区域。
4. React UI 显示资源栏：水滴、云棉、阳光，初始均为 0。
5. 建立推荐目录结构。
6. 添加基础 CSS，让页面有清爽的浅蓝 / 奶白 / 浅绿方向。

本轮禁止：
- 不做云点击。
- 不做雨滴。
- 不做作物。
- 不做升级。
- 不做存档。
- 不做剧情。
- 不引入大型状态管理库。

实现前请先输出：
- 本轮 SPEC
- 将新增文件
- 将修改文件
- 不会做的事
- 验收方式

然后再开始实现。
```

---

## 22. 版本规划

### v0.1：手动到半自动循环

目标：

- 云。
- 雨。
- 作物。
- 收获。
- 基础升级。
- 雨水收集器。
- 风车。
- 太阳棱镜。
- 本地存档。

### v0.2：更像小生态

可选内容：

- 风息资源。
- 云类型：白云、胖云、金边云。
- 简单云合成。
- 更多作物视觉。
- 自动收获。
- 更完整的数值曲线。

### v0.3：挂机体验

可选内容：

- 简单离线收益。
- 更丰富机器升级。
- 小岛扩建 1 次。
- 轻成就。
- 10-30 分钟体验曲线。

### v0.4 以后

待定。

只有 v0.1 玩起来舒服，才讨论后续。

---

## 23. Harness Checklist

任何新功能进入开发前，必须回答以下问题：

```text
1. 它是否服务“种天气”的核心概念？
2. 它是否能在 10 分钟体验内被玩家感知？
3. 它是否增加了正反馈，而不是只增加系统复杂度？
4. 它是否需要大量新文本？如果需要，拒绝。
5. 它是否需要新资源类型？如果需要，推迟。
6. 它是否需要新 UI 面板？如果需要，确认是否真的必要。
7. 它是否能用现有状态结构表达？
8. 它是否会拖慢 v0.1 完成？如果会，拒绝。
```

只有通过这些问题，才能进入开发。

---

## 24. 当前最终裁决

项目选择：

```text
云上小岛
```

技术路线：

```text
Vite + React + TypeScript + PixiJS
```

平台：

```text
页游
```

视角：

```text
当前新路线：轻量 2D 漂浮小岛
已归档路线：像素风伪 2.5D / Phaser 网格岛
底层逻辑：简单 2D 坐标 + 固定锚点
```

核心动作：

```text
点击云 → 下雨 → 作物成长 → 收获 → 升级 → 建造天气机器 → 小岛自动运转
```

v0.1 唯一胜利条件：

> 玩家 10 分钟内能从手动点击云，发展到第一套半自动天气循环，并觉得小岛变得更活了。

文档结束。
