# 《云上小岛》当前 Demo 技术报告

## 1. 当前版本总览

当前 Demo 已完成一个 v0.1 greybox 可玩原型，Phase 0 - Phase 7 都有对应实现：脚手架、云雨、作物、升级、雨水收集器、风车、太阳棱镜、localStorage 存档和重置都已接入。

核心循环已经跑通：

```text
云 -> 雨 -> 作物成长 -> 收获 -> 资源 -> 升级 -> 天气机器 -> 半自动循环
```

当前最核心的可玩点是：玩家点击漂浮云生成雨滴，雨滴落到作物后推动成长，成熟后收获云棉和阳光，再用资源买升级或解锁机器。实际体验时长估算在 5-10 分钟内能看到第一批机器，具体节奏依赖玩家是否持续点击云、是否让雨命中作物。

当前版本判断：已经具备“小玩具雏形”，但手感、节奏引导和性能实现还需要 polish。

## 2. 如何运行与验证

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

当前 `package.json` 脚本：

- `npm run dev`：Vite 本地服务，host 为 `127.0.0.1`
- `npm run typecheck`：`tsc -b`
- `npm run build`：`tsc -b && vite build`

本轮只读验证结果：

- `npm run build`：通过
- `npm run typecheck`：通过
- `http://127.0.0.1:5173`：返回 `200`
- Chrome headless 粗查 console：未捕获 `Uncaught / TypeError / ReferenceError / SyntaxError / Failed to load resource / ERR_`

浏览器手动验证流程：

1. 打开 `http://127.0.0.1:5173`
2. 点击上方云朵，观察云缩放和雨滴下落。
3. 让雨滴落到三块作物地，观察作物阶段变化。
4. 作物成熟后点击作物，检查云棉、阳光增加。
5. 购买升级，检查按钮 disabled 状态和效果变化。
6. 解锁小水槽、风车、太阳棱镜，检查场景里机器出现和动画反馈。
7. 刷新页面，确认资源/升级/机器状态恢复。
8. 点击“重置存档”，确认状态清空。

## 3. 项目结构说明

主要结构：

```text
src/
  App.tsx
  main.tsx
  data/
  game/
    assets/
    entities/
    systems/
    state/
  ui/
  styles/
public/assets/
```

React 层在 `src/App.tsx`、`src/ui/`。负责资源栏、升级面板、机器面板、存档按钮、toast，以及 `useReducer` 状态宿主。

PixiJS 层在 `src/game/GameCanvas.tsx` 和 `src/game/createPixiApp.ts`。负责 canvas、云、雨滴、小岛、作物、机器、粒子反馈。

游戏状态在 `src/game/state/gameTypes.ts` 和 `src/game/state/gameState.ts`。`GameState` 包含 `resources`、`upgrades`、`unlocks`、`cropPlots`、`totalPlayTimeSeconds`、`lastSaveAt`。

升级数据在 `src/data/upgrades.ts`，机器数据在 `src/data/machines.ts`。

美术资源目录在 `public/assets/art/`。当前只有 `.gitkeep`，没有实际 SVG/PNG 贴图。

存档系统在 `src/game/systems/saveSystem.ts`，使用 localStorage key：`cloud-island-v0-1-save`。

## 4. 技术栈与架构

当前使用 Vite + React + TypeScript + PixiJS + CSS + localStorage，符合 AGENTS.md / Harness 手册指定栈。没有 Redux、后端、物理引擎、ECS、3D、登录等超范围内容。

分工整体符合要求：

- React：持有长期可序列化状态、展示 DOM UI、发出购买/收获/重置动作。
- PixiJS：显示动态场景、处理云和作物点击、雨滴命中检测、动画反馈。
- TypeScript reducer：集中处理资源、升级、机器、作物状态变化。

游戏循环有两套：

- React 经济 tick：`App.tsx` 里 `setInterval(..., 100)` 每 0.1 秒 dispatch `tick`。
- Pixi 渲染 tick：`startGameLoop()` 使用 `requestAnimationFrame` 更新云、雨滴、机器、作物绘制。

DOM UI 和 Canvas 通信方式：

- `App.tsx` 把 `gameState` 和回调传给 `GameCanvas`。
- `GameCanvas` 用 `useRef` 持有最新 `gameState` 和 callbacks，避免 Pixi loop 闭包读旧状态。
- Pixi 命中后调用 `onRainHitCrop` / `onRainCollected` / `onHarvestCrop`，再由 React reducer 更新状态。

主要架构风险：

- React 每 100ms rerender 一次，当前规模可接受，后续 UI 变复杂会浪费。
- Pixi 场景每帧重建部分 Graphics，性能和内存风险较高。
- Pixi 渲染被强制为 `preference: "canvas"`，解决了 headless/兼容显示问题，但未来如果要用 WebGL 特效、滤镜、spritesheet，需要重新验证。

## 5. 核心系统实现详情

### 5.1 云系统

关键文件：

- `src/game/entities/Cloud.ts`
- `src/game/GameCanvas.tsx`
- `src/game/createPixiApp.ts`

实现方式：

- `startPhaseTwoScene()` 初始化 2 朵云：`cloud-1`、`cloud-2`。
- `createCloud()` 创建 `CloudModel` 和 Pixi `Container`。
- `drawFallbackCloud()` 用 Pixi Graphics 画程序云。
- `updateClouds()` 让云横向漂移，超出右边界后回到左侧。
- 点击云时减少 `waterAmount`，设置 `pulseTime`，调用 `spawnRaindrops()`。
- `getCloudMaxWater()` 由 `cloudCapacity` 升级提高云容量。

反馈：

- 云点击后通过 scale 做 squash/pulse。
- 云大小也受 `waterAmount / maxWater` 影响。

水量/冷却/再生：

- 有 `waterAmount`、`maxWater`，每秒恢复 `1.25`。
- `cooldown` 字段存在但未使用。
- 没有真正“消失”机制，耗水后只是暂时不能继续产雨，随后自动恢复。

贴图：

- 没有加载贴图，全部是程序图形 fallback。

### 5.2 雨滴系统

关键函数：

- `spawnRaindrops()`
- `updateRaindrops()`
- `createSplash()`
- `updateSplashes()`

实现方式：

- 点击云生成若干 `RaindropModel`。
- 数量由 `getRaindropsPerClick(gameState)` 决定，即 `2 + clickRainPower`。
- 雨滴是 Pixi Graphics 椭圆水滴，速度约 `245-315 px/s`。
- 每帧向下移动，依次判定收集器、作物、地面。

命中逻辑：

- 收集器：`isRainCollectorHit()`
- 作物：`findHitCropPlot()`
- 地面：`drop.model.y >= GAME_HEIGHT - 118`

反馈：

- 命中后调用 `drawFallbackSplash()` 创建水花。
- 雨滴命中后会 `removeChild()` 并 `destroy()`，不会长期留在 stage。

性能风险：

- 雨滴自身会销毁，风险不大。
- 水花也会在生命周期结束后销毁。
- 更大的风险在作物和机器每帧重画，不在雨滴本身。

### 5.3 作物系统

关键文件：

- `src/game/entities/CropPlot.ts`
- `src/game/systems/growthSystem.ts`
- `src/game/state/gameState.ts`

当前有 3 块作物地，初始在 `createInitialGameState()` 中定义：

- `crop-1`：x 318, y 326
- `crop-2`：x 400, y 318
- `crop-3`：x 482, y 326

成长计算：

- 雨滴命中作物：`moisture + 10`
- `advanceCropGrowth()` 每 tick 将 moisture 转为 growth。
- 基础成长速率：`8 * cropGrowthSpeed`
- 太阳棱镜激活时倍率：`1.5 + sunPrismPower * 0.12`
- `growthRequired = 100`

阶段变化：

- `drawCropStage()` 根据 `growth / growthRequired` 分三段绘制。
- 成熟时 `isReady = true`，作物顶部有金色成熟/光圈表现。

收获：

- 点击成熟作物触发 `harvestCrop`。
- 产出：`cloudCotton +6`，`sunlight +1.25`
- 收获后 `growth/moisture/isReady` 重置。

贴图切换：

- 没有贴图切换，只有程序图形阶段切换。

### 5.4 资源系统

当前资源：

- `water`
- `cloudCotton`
- `sunlight`

来源：

- water：雨滴命中作物少量获得，落地少量获得，命中雨水收集器获得更多。
- cloudCotton：成熟作物收获。
- sunlight：成熟作物收获；太阳棱镜激活时每 tick 少量增加。

消耗：

- water：基础升级、小水槽。
- cloudCotton：云容量、土壤、机器。
- sunlight：风车、太阳棱镜。

资源变化集中在：

- `src/game/systems/resourceSystem.ts` 的 `addResources()` / `subtractResources()`
- `src/game/state/gameState.ts` 的 reducer action

整体没有明显资源散落到 React 组件或 Pixi 对象中的问题。Pixi 只负责判断命中并发 action。

### 5.5 升级系统

关键文件：

- `src/data/upgrades.ts`
- `src/ui/UpgradePanel.tsx`
- `src/game/systems/upgradeSystem.ts`

当前升级：

- `clickRainPower` / 轻轻一挤：每次点击云生成更多雨滴。
- `cloudCapacity` / 蓬松云层：提高云最大水量。
- `cropGrowthSpeed` / 湿润土壤：提高 moisture 转 growth 速度。
- `waterStorage` / 小水罐：提高雨滴带来的 water 收益。

成本写在 `UPGRADE_DEFINITIONS` 配置表里，不是散落在 UI 里。购买条件通过 `canAfford()` 计算，按钮 disabled 状态由 `UpgradePanel` 控制。

升级即时影响：

- 点击雨量影响 `getRaindropsPerClick()`。
- 云容量影响 `getCloudMaxWater()`。
- 成长速度影响 `advanceCropGrowth()`。
- 水滴收集影响 `getWaterGain()`。

### 5.6 天气机器系统

关键文件：

- `src/data/machines.ts`
- `src/ui/MachinePanel.tsx`
- `src/game/GameCanvas.tsx`

雨水收集器：

- 解锁/升级成本：`water + cloudCotton`
- 解锁后 `unlocks.rainCollector = true`，`rainCollectorEfficiency +1`
- 显示：`syncMachines()` 在 x 578, y 334 绘制小水槽
- 效果：`isRainCollectorHit()` 命中后 `onRainCollected()` 增加 water
- 反馈：命中时有 splash，水槽本身无液面动画累计

风车：

- 解锁/升级成本：`cloudCotton + sunlight`
- 显示：`syncMachines()` 绘制底座和叶片
- 动画：叶片 rotation 根据 `totalPlayTimeSeconds` 和 `windmillPower`
- 效果：云在 x 230-570 区间漂移速度降低
- 半自动贡献：让云更长时间停在小岛上方，但仍需要玩家点击云

太阳棱镜：

- 解锁/升级成本：`cloudCotton + sunlight`
- 显示：`syncMachines()` 绘制三角棱镜
- 动画/反馈：`isSunPrismActive()` 时出现光束/光晕
- 效果：每 10 秒激活 3 秒，作物成长倍率提升，并少量产出 sunlight
- 半自动贡献：可以自动加速作物成长，但仍依赖雨水/moisture 输入

是否真正半自动：

- 是“半自动”的早期形态：收集器自动把命中雨滴转 water，风车改善云停留，棱镜周期加速成长。
- 不是完整自动循环：云仍需人工点击，没有自动下雨或自动收获。

### 5.7 存档系统

关键文件：

- `src/game/systems/saveSystem.ts`
- `src/App.tsx`

使用 localStorage：

- key：`cloud-island-v0-1-save`

保存数据：

- `resources`
- `upgrades`
- `unlocks`
- `cropPlots`
- `totalPlayTimeSeconds`
- `lastSaveAt`

不保存：

- 云位置、水量
- 雨滴位置
- 水花/动画状态
- Pixi 对象状态

保存时机：

- `App.tsx` 中 gameState 变化后最多每 10 秒自动保存一次。
- 购买升级/机器后 setTimeout 触发一次保存。
- `beforeunload` 保存最新状态。

恢复：

- `loadGameState()` 会把存档 merge 到 `createInitialGameState()` 的当前结构上。
- 刷新后可以恢复资源、升级、机器、作物状态。

重置：

- `clearSavedGameState()` 删除 localStorage。
- reducer `resetGame` 返回初始状态。

兼容风险：

- 没有 save version/schema migration。
- `cropPlots` 如果存档里存在，会整体复用旧数组；未来改作物位置/数量时可能继承旧结构。

## 6. 美术资源与贴图报告

这里需要纠正：当前 Demo 基本没有使用贴图。它是 Pixi Graphics 程序图形 Demo。

### 6.1 资产目录

当前资源路径：

- `public/assets/manifest.json`：内容为 `{ "art": {} }`
- `public/assets/art/cloud/.gitkeep`
- `public/assets/art/crop/.gitkeep`
- `public/assets/art/fx/.gitkeep`
- `public/assets/art/island/.gitkeep`
- `public/assets/art/machine/.gitkeep`

没有 SVG、PNG、JPG、WebP 等贴图资源。不存在过大资源，也不存在未使用贴图资源。

### 6.2 加载方式

代码层有预留：

- `src/game/assets/assetManifest.ts`：`ART_ASSETS = {}`
- `src/game/assets/loadAssets.ts`：调用 Pixi `Assets.load()`

当前实际没有调用 `loadArtAssets()`，也没有 Sprite 创建。所有视觉对象通过 `drawFallbackCloud()`、`drawFallbackRaindrop()`、`drawCropStage()`、`syncMachines()` 等函数程序绘制。

加载失败 fallback：

- 从结果看，当前“fallback”就是主实现，不依赖资源加载。
- 但如果后续接入贴图，需要补真正的 asset load flow 和失败兜底。

加载时序风险：

- 当前没有资源加载时序问题。
- 后续若创建 Sprite，必须避免资产未加载完成就读取 texture。

### 6.3 视觉一致性

程序图形整体符合清爽、柔和、圆润、明亮方向。云、岛、作物、机器色板基本贴合 AGENTS.md：浅蓝、奶白、浅绿、淡金、土色。

主要问题：

- 程序图形足够统一，但辨识度有限，尤其机器细节偏灰盒。
- UI 是干净的 DOM 面板，和场景色彩一致，但右侧按钮较密。
- 没有贴图边缘、透明背景、缩放模糊问题，因为没有贴图。
- Pixi Graphics 尺寸统一性目前靠硬编码坐标，后续扩展时容易乱。

### 6.4 后续美术风险

最需要统一或重画：

- 作物阶段：当前是几何小芽，反馈弱。
- 三个机器：雨水收集器、风车、太阳棱镜需要更可识别的 SVG。
- 小岛底座：当前可用，但灰盒感明显。
- 云：当前程序云可继续沿用，也可以换成 2 个 SVG 云型。

可以继续沿用：

- 雨滴、水花、光束这类动态 FX 用 Pixi Graphics 是合理的。
- UI 色板和布局方向可沿用。

是否需要 spritesheet / atlas：

- v0.1 不需要。
- 等资产数量明显增加，或加入多阶段动画后再考虑。

是否需要 image generation art pass：

- 可以做，但建议先做 SVG art pass，不要直接上大 PNG。
- 重点是统一云、岛、作物、机器的识别度，不是追求精细插画。

是否需要压缩图片：

- 当前无图片，不需要。

## 7. UI / UX 状态

资源栏清晰，三种资源显示明确。升级面板和机器面板也能展示名称、等级/未建造、效果、成本、disabled 状态。

提示系统：

- 有 toast：升级完成、机器建造、收获、重置。
- 有按钮 title，算轻量 tooltip。
- 有一句底部提示：“点击云朵，让雨落到作物上。”

当前 UI 最大问题：

- 右侧面板内容较密，在 800px 高度下需要滚动，机器/存档可能不在首屏。
- 玩家不一定知道“应该把雨落到作物上”，因为云漂移和雨滴命中区域没有明确引导。
- 机器解锁条件可见，但没有“下一目标”突出提示。
- 资源数字是整数 floor，内部小数 water/sunlight 增长可能让玩家感觉没涨。

## 8. 玩法闭环评估

前 1 分钟：玩家能看到云并点击，雨滴反馈明确，基本知道要点云。但“雨要落到作物上”仍需要试错。

3 分钟内：如果持续点击并让雨落到作物，作物应能成熟；如果玩家只点边缘云，可能收获变慢。

5 分钟内：第一个升级成本很低，通常能买到。

7-10 分钟内：小水槽、风车、太阳棱镜的成本不算高，手动积极点击时可以解锁至少一个自动化机器。

“岛开始自己运转起来”的感觉：有，但偏弱。风车会动、棱镜会周期发光，小水槽能自动收水；但云仍需手动点击，作物仍需手动收获，所以自动化只是辅助。

最爽反馈：

- 点击云直接下雨。
- 作物成熟后收获资源。
- 风车和棱镜出现后画面变得更活。

最不清楚/无聊：

- 雨滴是否命中作物、作物还差多少成熟不够直观。
- 等待 moisture 转 growth 的过程缺少进度条。
- 小数资源被 floor 后，早期水滴增长反馈可能被隐藏。

判断：C. 已经具备小玩具雏形。

理由：闭环完整，机器带来初步自动化和视觉变化；但还没到可扩内容的稳定状态，主要缺手感、反馈清晰度、性能清理和美术统一。

## 9. 数值与节奏

当前关键数值：

- 每次点击雨滴数：`2 + clickRainPower`，初始 `3`
- 雨滴命中作物：`moisture +10`，`water +0.12 * waterStorage`
- 雨滴落地：`water +0.15 * waterStorage`
- 雨滴命中收集器：`water +(0.75 + rainCollectorEfficiency * 0.35) * waterStorage`
- 作物成长速率：`8 * cropGrowthSpeed`
- 作物成熟需求：`100`
- 收获：`cloudCotton +6`，`sunlight +1.25`
- 太阳棱镜：每 10 秒激活 3 秒，成长倍率 `1.5 + sunPrismPower * 0.12`

升级成本：

- 轻轻一挤：water 3 / 8 / 18 + cloudCotton 2
- 蓬松云层：water 5+cloudCotton 1 / 12+4 / 24+8
- 湿润土壤：water 5+cloudCotton 1 / 14+4 / 30+10
- 小水罐：water 6 / 14+cloudCotton 3 / 28+8

机器成本：

- 小水槽：water 12+cloudCotton 4 起
- 风向标：cloudCotton 16+sunlight 3 起
- 太阳棱镜：cloudCotton 24+sunlight 6 起

是否接近 10 分钟曲线：

- 从代码估算，积极点击时接近。
- 但没有自动模拟脚本，也没有记录机器解锁时间。
- 节奏最大风险是“雨是否命中作物”高度依赖玩家点击时机，实际体验可能波动较大。

是否会卡住：

- 理论上不会卡死，因为落地雨也给少量 water，作物收获给 cloudCotton/sunlight。
- 但如果玩家不理解作物点击收获，云棉会停滞。

## 10. 性能与稳定性

Pixi 对象增长：

- 雨滴命中后会 `destroy()`。
- 水花生命周期结束后会 `destroy()`。
- 但 `syncCropPlots()` 每帧 `removeChildren()` 后重新创建作物 Graphics，未 destroy 旧 children。
- `syncMachines()` 每帧 `removeChildren()` 后重新创建机器 Graphics，未 destroy 旧 children。
- 这会造成明显对象 churn，长时间运行可能带来 GC 压力或 Pixi 资源释放不彻底。

动画循环：

- `GameCanvas` 的 Pixi loop 在 mount 时启动，cleanup 会 stop，正常情况下不会重复注册。
- React 经济 tick 使用 `setInterval`，cleanup 正常。

React rerender：

- 每 100ms dispatch tick，整个 `App` 和右侧 UI 会频繁 rerender。
- 当前小 Demo 可接受；后续 UI 增多后建议降低 UI 更新频率或拆分状态订阅。

localStorage：

- 自动保存最多 10 秒一次，购买时额外保存，不算频繁。
- 但购买后的 `setTimeout(..., 0)` 保存依赖 ref 更新时序，虽然通常可行，严谨性一般。

流畅性：

- 当前浏览器能正常启动，headless 截图可见场景。
- 手动长时间运行前，建议先处理 Pixi 每帧重建对象问题。

## 11. 已知 Bug / 技术债

1. Pixi 每帧重建作物和机器 Graphics  
   影响程度：高  
   建议处理时机：立即  
   说明：`syncCropPlots()`、`syncMachines()` 每帧 remove/recreate，长期运行有性能和内存风险。应改为持久对象，只更新状态、alpha、rotation、visible。

2. UI 每 100ms 整体 rerender  
   影响程度：中  
   建议处理时机：v0.1 polish  
   说明：经济 tick 推动整个 React app 刷新。当前可接受，后续面板复杂后会浪费。

3. 没有 save schema/version  
   影响程度：中  
   建议处理时机：v0.1 polish  
   说明：当前 `loadGameState()` 只 merge 字段。未来改 cropPlots 或升级字段时可能兼容异常。

4. 自动化感偏弱  
   影响程度：中  
   建议处理时机：v0.1 polish  
   说明：机器只辅助，不会自动下雨/收获。v0.1 可以接受，但“半自动循环”的体感还不够强。

5. 成熟/命中反馈不够清楚  
   影响程度：中  
   建议处理时机：v0.1 polish  
   说明：没有成长条、成熟 toast、资源飞字。玩家可能不知道作物快成熟了。

6. 字段/文件存在占位或未使用  
   影响程度：低  
   建议处理时机：v0.2  
   说明：`MachineModel` 未使用，`CloudModel.cooldown`、`RaindropModel.value/target` 基本未用，`loadArtAssets()` 未接入。

7. 函数命名滞后  
   影响程度：低  
   建议处理时机：v0.1 polish  
   说明：`startPhaseTwoScene()` 实际承载 Phase 1-7 场景，不影响运行，但降低可读性。

8. 资源小数被 UI floor 掩盖  
   影响程度：低到中  
   建议处理时机：v0.1 polish  
   说明：早期 water 以 0.12/0.15 增长，但 UI 显示整数，玩家可能感知不到收益。

## 12. 与 AGENTS.md / Harness 手册的偏差

未添加剧情、NPC、战斗、AI、卡牌、敌人、登录、后端、多人、3D、2.5D、WASD、复杂离线收益、转生、多岛屿、大科技树、灾害。没有明显越界。

没有改变技术栈。使用 Vite + React + TypeScript + PixiJS + CSS + localStorage。PixiJS 使用 CanvasRenderer preference，但仍是 PixiJS 渲染层，不算改栈。

没有引入 Redux、ECS、物理引擎或大型额外库。

Pixi 和 React 职责总体分离：经济状态在 React/reducer，Pixi 负责场景和点击命中。但 `GameCanvas.tsx` 里聚合了太多系统逻辑，后续继续开发会变成大文件。

没有提前做 v0.2 内容。`autoHarvest` 字段存在但未实现；这是 AGENTS 初始状态的一部分，不算越界。

Phase 验收基本覆盖：Phase 0-7 都有实现和 build/typecheck 验证。缺口是没有自动化平衡模拟，也没有专门的浏览器交互测试脚本。

## 13. 文件级改动摘要

- `src/App.tsx`：React 根组件，持有 reducer 状态，驱动经济 tick、存档、toast，连接 Pixi 回调和 UI。
- `src/main.tsx`：React 入口。
- `src/game/GameCanvas.tsx`：Pixi 场景主文件，包含云、雨滴、作物、机器绘制和命中检测。
- `src/game/createPixiApp.ts`：创建 Pixi app，绘制基础场景和 fallback 图形。
- `src/game/gameLoop.ts`：requestAnimationFrame 循环工具。
- `src/game/state/gameTypes.ts`：核心状态和 action 类型。
- `src/game/state/gameState.ts`：初始状态、reducer、机器购买判断。
- `src/game/systems/resourceSystem.ts`：资源加减工具。
- `src/game/systems/growthSystem.ts`：作物成长和太阳棱镜激活判断。
- `src/game/systems/upgradeSystem.ts`：购买条件和升级成本读取。
- `src/game/systems/saveSystem.ts`：localStorage 保存/读取/清除。
- `src/game/systems/weatherSystem.ts`：点击产雨数量。
- `src/game/entities/Cloud.ts`：云模型接口。
- `src/game/entities/Raindrop.ts`：雨滴模型接口。
- `src/game/entities/CropPlot.ts`：作物地模型接口。
- `src/game/entities/Machine.ts`：机器模型接口，目前未实际使用。
- `src/data/upgrades.ts`：升级配置表。
- `src/data/machines.ts`：机器配置表。
- `src/data/constants.ts`：画布尺寸。
- `src/ui/ResourceBar.tsx`：资源栏。
- `src/ui/UpgradePanel.tsx`：升级按钮列表。
- `src/ui/MachinePanel.tsx`：天气机器按钮列表。
- `src/ui/StatusToast.tsx`：状态提示。
- `src/game/assets/assetManifest.ts`：空资产表。
- `src/game/assets/loadAssets.ts`：预留资产加载函数。
- `src/styles/app.css`：布局、面板、按钮、toast 样式。
- `src/styles/global.css`：全局样式。
- `public/assets/manifest.json`：空 art manifest。

## 14. 下一步建议

### 14.1 立即修复

1. 改掉 `syncCropPlots()` 每帧重建 Graphics，改为持久对象更新。
2. 改掉 `syncMachines()` 每帧重建机器对象，机器只在解锁/等级变化时重绘。
3. 给作物增加明确成长进度条或湿润/成熟状态提示。
4. 让 water 小数收益在 UI 上有更清楚反馈，例如短暂高亮或保留 1 位小数。
5. 加一个极简 10 分钟模拟脚本或 debug 输出，用来验证机器解锁节奏。

### 14.2 v0.1 Polish

1. 给雨滴命中作物增加更明显弹跳/湿润变化。
2. 给收获增加资源飞字。
3. 给成熟作物加 toast 或更强 glow。
4. 优化右侧面板层级，把“下一目标”突出出来。
5. 用 2 个简单 SVG 云替代程序云，保留 fallback。
6. 用 SVG 做小岛、作物、三台机器的统一美术 pass。
7. 调整机器成本，让第一台机器稳定在 5-7 分钟出现。
8. 给 reset 增加确认，避免误点清档。

### 14.3 v0.2 候选

1. 简单自动下雨机器或云滴漏。
2. 自动收获作为后期目标。
3. 新云类型：胖云、金边云。
4. 轻量离线收益，但不要做复杂挂机经济。
5. 风息资源，但只在 v0.1 稳定后加入。
6. 小岛扩建 1 次。
7. 更多作物视觉阶段，不做作物选择系统。
8. 简单成就/里程碑提示，用于引导而不是任务系统。

## 15. 最终结论

当前 Demo 值得继续，已经不是单纯技术样例，而是有完整闭环的小玩具原型。最大亮点是 React 状态和 Pixi 场景的分工基本正确，云雨作物机器的主循环已经可运行。最大问题是 Pixi 每帧重建作物和机器 Graphics，这会阻碍长时间运行和后续扩展。玩法上，半自动循环已经存在，但体感还偏弱，需要更强的成长进度、命中反馈和机器存在感。下一步最应该优先做 v0.1 polish：先修性能对象重建，再补反馈和数值验证。暂时不应该扩新系统、加新资源或做大科技树。美术方向建议走小规模 SVG 统一 pass，而不是直接引入大图或复杂素材管线。
