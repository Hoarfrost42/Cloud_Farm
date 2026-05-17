# Cloud Island UI Redesign Review & Action Plan

适用项目：Cloud Island / 云上小岛 / Weather Reactor  
适用版本：v13 / Post-Monsoon Complete Slice  
来源：`E:\Downloads_FromWeb\cloud-island-ui-redesign-review-action-plan.md`  
当前执行分支：`ui-single-screen-hud-redesign`

## 0. 结论

采用单屏空岛 HUD 方向：

```text
顶部 HUD
+ 中央空岛天气舞台
+ 底部当前行动条
+ Overlay / Drawer 承载完整资源、升级、公式、记录、设置
```

P0 必须收缩范围：

- 不做完整美术资源。
- 不做复杂天气图谱。
- 不做完整移动端。
- 不做完整推荐动作引擎。
- 不重构经济模块。
- 不引入全局状态管理。

P0 目标是让玩家 3 秒内知道：

```text
我在哪个天气阶段。
我有什么关键资源。
我现在该点什么。
空岛因我的进度发生了什么变化。
```

## 1. P0 最小可上线目标

开局首屏只显示：

- 当前天气阶段。
- 天气活力。
- 雨阶。
- 下一目标。
- 云层主按钮。
- 1-3 个当前推荐动作。

第一次季风后才显示：

- 云核入口。
- 云核天赋 overlay。

风暴前线后才显示：

- 风暴图谱入口。

气候改写后才显示：

- 气候法则入口。

公式、完整资源、调试信息：

- 默认不在首屏。
- 通过 overlay / drawer 打开。

## 2. 核心架构原则

### 2.1 新增纯派生层

新增：

```text
src/game/economy/progression.ts
```

只放 UI view model 纯函数：

```ts
getIslandMood(state)
getVisibleResources(state)
getPrimaryAction(state)
getUnlockedOverlayTabs(state)
getActionBarUpgradeIds(state)
```

要求：

- 不 import React。
- 不 import UI 组件。
- 不写入 state。
- 不改经济结果。
- 不影响模拟器时间。

### 2.2 App 继续持有状态和 handlers

`App.tsx` 暂时继续持有：

- React state。
- tick interval。
- save/load。
- 购买 handler。
- reset handler。

新 UI 组件只接 props，不重写购买逻辑。

### 2.3 Overlay 承载复杂信息

P0 做：

```text
OverlayShell
UpgradeOverlay
ResourceOverlay
FormulaDrawer
SettingsOverlay
```

P1 再补：

```text
WeatherMapOverlay
LogOverlay / DebugOverlay
HelpOverlay
```

主屏不常驻滚动条。Overlay 内部允许滚动。

## 3. 建议新增/调整文件

P0 新增：

```text
src/game/economy/progression.ts
src/ui/TopHud.tsx
src/ui/IslandMoodStage.tsx
src/ui/ActionBar.tsx
src/ui/OverlayShell.tsx
src/ui/UpgradeOverlay.tsx
src/ui/ResourceOverlay.tsx
src/ui/FormulaDrawer.tsx
src/ui/SettingsOverlay.tsx
```

P0 修改：

```text
src/game/economy/index.ts
src/App.tsx
src/styles/app.css
```

## 4. View Model 草案

### 4.1 `IslandMood`

Mood 只做表现层：

- 不写存档。
- 不改数值。
- 不影响模拟器。
- 不参与购买条件。
- 只从 `WeatherReactorState` 派生。

建议阶段：

| Mood | 触发原则 | 表现 |
|---|---|---|
| `dryStart` | 0 雨阶、0 季风 | 薄云、干净天空 |
| `firstRain` | 1-2 雨阶 | 细雨、水汽 |
| `rootedRain` | 3+ 雨阶或根系相关升级 | 嫩绿、稳定雨滴 |
| `windEye` | 6+ 雨阶或风眼升级 | 风线、环流 |
| `monsoon` | 第一次季风后、风暴前 | 厚云、云核记忆 |
| `stormFront` | 风暴前线后或当前目标为风暴 | 斜雨、暗云边缘 |
| `climateRewrite` | 气候改写后 | 气候环、规则纹理 |
| `skyHeart` | 天空心脏脉冲或终局接近 | 高空辉光、脉冲 |

注意：

```text
不要用 pressure > 0 触发 stormFront mood。
第一次季风后就可能有气压，过早进入风暴视觉会误导玩家。
```

### 4.2 `getVisibleResources`

阶段显露：

| 阶段 | 首屏允许显示 | 不应显示 |
|---|---|---|
| 开局 | 天气活力、雨阶 | 云核、气压、风暴胞、气候织线 |
| 第 1 雨阶 | 天气活力、雨阶、雨滴 | 云核、气压、风暴胞、气候织线 |
| 第 3 雨阶 | 天气活力、雨阶、雨滴、根系 | 云核、气压、风暴胞、气候织线 |
| 第 6 雨阶 | 天气活力、雨阶、雨滴、根系、云团/风眼 | 云核、气压、风暴胞、气候织线 |
| 第一次季风后 | 天气活力、雨阶、云核、季风 | 风暴胞、气候织线 |
| 第一风暴后 | 天气活力、当前前线、风暴胞 | 气候织线 |
| 气候改写后 | 天气活力、气候织线、当前法则 | 无强制隐藏 |
| 天空心脏 | 天气活力、天空心脏脉冲 | 无强制隐藏 |

### 4.3 `getPrimaryAction`

主行动优先级：

1. 唤醒天空心脏。
2. 点亮天空心脏脉冲。
3. 执行气候改写。
4. 收束风暴前线。
5. 执行季风循环。
6. 凝结雨阶。
7. 等待 / 买推荐升级。

ActionBar 同一时刻最多显示：

```text
1 个主按钮 + 3 个推荐升级 + 全部升级入口
```

### 4.4 `getActionBarUpgradeIds`

P0 只做固定阶段规则推荐，不做完整 ROI / rollout 引擎。

推荐升级应被理解为“当前建议动作”，不是最优策略证明。

P1 再考虑：

```text
src/game/economy/recommendations.ts
getRecommendedAction(state)
UI 与模拟器共用推荐逻辑
```

## 5. UI 组件职责

### 5.1 `TopHud`

职责：

- 当前 Mood 标题。
- 阶段显露后的关键资源。
- 下一目标。
- 计时和暂停。
- overlay 入口。

约束：

- 顶部高度控制在约 84-96px。
- 资源不超过 4 个为宜。
- 长目标描述单行省略，详情进 overlay。

### 5.2 `IslandMoodStage`

职责：

- 中央最大视觉区域。
- Mood 文案。
- 云层主按钮。
- 生产者链状态。
- CSS 天气效果。

不做：

- 完整资源表。
- 全部 reset 卡。
- 后期系统列表。

### 5.3 `ActionBar`

职责：

- 当前主行动。
- 1-3 个推荐升级。
- 全部升级入口。

执行主行动时，由 `App.tsx` 集中 switch 调原 handler。

### 5.4 `OverlayShell`

职责：

- 标题。
- 关闭按钮。
- 页签。
- 内容区。

Overlay 内部允许滚动。

### 5.5 `UpgradeOverlay`

职责：

- 完整升级列表。
- 本轮升级。
- 云核天赋。
- 气压升级。
- 风暴图谱。
- 气候法则。

未解锁系统不显示页签。

### 5.6 `ResourceOverlay`

职责：

- 完整资源列表。
- 生产者链详情。
- 被动/s。
- 实测/s。
- 最高 orders。
- 层级 bonus 简表。

### 5.7 `FormulaDrawer`

职责：

- 公式摘要。
- orders breakdown。
- 调试用数值解释。

默认隐藏。

## 6. CSS 方向

三栏布局应替换为：

```css
.weather-shell--single {
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-rows: 84px minmax(0, 1fr) 128px;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}
```

中央舞台：

```text
占据最大面积。
使用 Mood class 改变背景和天气效果。
weather-effect 必须 pointer-events: none。
```

底部行动条：

```text
主按钮 + 推荐升级 + 全部入口。
中文文案必须限制行数。
不可买推荐升级要弱化，不能看起来像主按钮。
```

响应式：

```text
P0 不做完整移动端。
1100px 以下允许纵向自然流。
禁止横向滚动。
overlay 必须可关闭。
```

## 7. 不建议 P0 做的事

- 不做完整移动端。
- 不做 imagegen 结果直接落地。
- 不做复杂天气图谱。
- 不做完整推荐动作引擎。
- 不重构经济模块。
- 不改数值。
- 不改模拟器策略。
- 不改存档结构。
- 不引入 Redux / Zustand。

可以做 imagegen 概念图用于讨论，但不直接作为生产 UI。

## 8. 执行顺序

1. `P0-UI-1`：新增 `progression.ts` view model。
2. `P0-UI-2`：替换三栏布局为单屏骨架。
3. `P0-UI-3`：实现 `TopHud`。
4. `P0-UI-4`：实现 `IslandMoodStage`。
5. `P0-UI-5`：实现 `ActionBar`。
6. `P0-UI-6`：实现 `OverlayShell + UpgradeOverlay`。
7. `P0-UI-7`：迁移 `ResourceOverlay / FormulaDrawer / SettingsOverlay`。

建议先用 imagegen 生成概念图确认单屏布局和 Mood 方向，再正式替换三栏。

## 9. 验收

每次代码提交前运行：

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

纯 UI / Mood 改动后，模拟结果不应发生经济时间变化。

截图验收阶段：

```text
0 雨阶开局
第 1 雨阶
第 3 雨阶
第 6 雨阶
第 10 雨阶 / 第一次季风前
第一次季风后
第一次风暴后
第一次气候改写后
天空心脏脉冲阶段
```

每张截图检查：

- 首屏是否无常驻滚动条。
- 当前主按钮是否清楚。
- 当前阶段资源是否正确显露。
- 未解锁资源是否没有提前出现。
- Mood 是否表达阶段变化。
- 底部行动条是否最多 1 主按钮 + 3 推荐升级。
- 文字是否溢出。
- overlay 是否可打开、可关闭、可滚动。

