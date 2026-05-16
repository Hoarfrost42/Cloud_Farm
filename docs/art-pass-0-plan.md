# Art Pass 0 Plan

## 1. 目标

Art Pass 0 只验证《云上小岛》是否适合从当前 2D 侧视 greybox，转向“伪 2.5D 漂浮天气小岛”的美术方向。

本轮目标不是生产正式游戏资源，而是用 3 张验证图判断：

- 伪 2.5D 视角是否能增强“小世界经营感”。
- 天气元素是否能成为主角，而不是让画面变成普通农场。
- 小岛、云、雨、光、风车、水槽、太阳棱镜是否能在同一套风格下统一。
- 后续是否值得进入正式 Art Pass 资产拆分。

核心约束：

```text
视觉：伪 2.5D 漂浮空岛
逻辑：2D PixiJS 坐标 + 固定锚点
UI：React / HTML / CSS
玩法：沿用 v0.1 云 -> 雨 -> 作物 -> 收获 -> 升级 -> 天气机器闭环
```

Art Pass 0 不改变玩法、不改代码、不生成可直接接入的正式资源。

## 2. 三张验证图

### 2.1 主画面概念图

用途：验证整体画面方向。

这张图要回答：

- 小岛是否像一个可观看、会运转的小天气生态。
- 伪 2.5D 视角是否比当前侧视灰盒更有空间感。
- 天气机器、作物、云雨、阳光是否有清晰层级。
- 右侧是否能保留干净 UI 面板空间。

建议画面比例：16:9 或接近当前游戏画布 + 右侧 UI 的横向构图。

### 2.2 资产风格板

用途：验证单体资产的形状语言、色彩、材质和一致性。

风格板只包含 v0.1 已有对象：

- 云朵。
- 小岛底座。
- 3 个作物阶段或 4 个作物阶段。
- 雨水收集器 / 小水槽。
- 风车。
- 太阳棱镜。
- 雨滴、光束、风线、水花等小特效示意。

不加入新机器、新作物、新资源、新角色。

### 2.3 伪 2.5D 锚点草图

用途：验证后续资产接入时的固定锚点和层级关系。

这张图更像 production layout sketch，不追求精美，而要清楚标注：

- islandBase。
- cropA / cropB / cropC。
- rainCollector。
- windmill。
- sunPrism。
- weatherClouds。
- rainLayer。
- backgroundSky / farClouds / farIslands。
- fxLayer。
- rightUiSafeArea。

重点是证明：后续可以用 2D 坐标和固定锚点实现伪 2.5D 画面，不需要真正等距系统。

## 3. 每张图的生成提示词

### 3.1 主画面概念图 Prompt

```text
Create a bright, cozy pseudo-2.5D game concept art of a floating sky island for a light incremental idle game.

The island is small but rich, viewed from a fixed 45-degree elevated angle, like a stylized 2.5D game scene. It floats in a clear blue sky with soft clouds around it. The island should feel like a tiny living weather farm, not a normal crop farm.

Core elements:
- a grassy floating island with visible soil and rock thickness underneath
- 3 small crop plots
- large soft clouds above the island, raining gently
- a small rain collector / water tank
- a cute windmill
- a small sun prism device glowing softly
- a few water droplets, light beams, and subtle wind streaks
- distant floating islands and cloud layers in the background

Composition:
- the floating island is the main focal point
- weather elements are more prominent than ordinary farming
- leave clean empty space on the right side for a simple UI panel
- keep the island compact, not huge
- no characters, no animals, no houses, no extra machines

Art direction:
clean, soft, bright, airy, rounded, cozy but not childish
fresh sky blue, cloud white, soft gold sunlight, fresh green grass, warm earth tones, clear water blue
stylized 2D game art, slightly chunky shapes, clean readable asset style, charming small-world feeling

Important:
Weather should be the main theme. Clouds, rain, sunlight, and wind devices should feel more important than ordinary farming.
Do not make it dark, horror, cyberpunk, grotesque, realistic, or overly detailed.
Do not add characters.
Do not add combat, enemies, quests, cards, UI text, logos, or story elements.
Do not make a full isometric city or a large farm.
```

### 3.2 资产风格板 Prompt

```text
Create a clean game asset style board for a bright pseudo-2.5D floating sky island idle game called Cloud Island.

Show separate asset concepts on a plain light background, arranged like a production style sheet. Each object should be readable as an individual sprite candidate, with consistent perspective, color palette, shape language, and lighting.

Include only these existing v0.1 objects:
- 2 soft white cloud variations
- 1 floating island base with grassy top, warm soil, and rounded rock underside
- 4 crop plot stages: empty soil, sprout, growing crop, ready crop
- 1 small rain collector / water tank
- 1 cute windmill with separate-looking base and blades
- 1 small sun prism device with a gentle golden glow
- small effect samples: raindrop, splash, light beam, wind line, sparkle

Style:
bright sky blue, cloud white, soft gold sunlight, fresh green grass, warm earth tones, clear water blue
rounded shapes, soft edges, clean silhouettes, chunky readable forms
cozy small-world game asset style, not childish, not realistic

Important:
Keep all assets in one coherent art direction.
Do not add new machines.
Do not add new resources.
Do not add characters, animals, houses, enemies, cards, icons with text, or UI panels.
Do not make it pixel art unless explicitly requested.
Do not use dark, horror, cyberpunk, grotesque, or heavy realistic painting style.
```

### 3.3 伪 2.5D 锚点草图 Prompt

```text
Create a clean pseudo-2.5D layout sketch for a small floating sky island game scene.

This is a production planning image, not final art. It should clearly show a fixed angled island layout with simple labeled anchor positions for future sprites. Use a bright, soft, readable game concept style.

Scene:
- a compact floating island viewed from a fixed elevated 45-degree angle
- clear blue sky background with soft far clouds
- visible island thickness underneath
- enough empty space on the right side marked as UI safe area

Show and label these anchors:
- cropA
- cropB
- cropC
- rainCollector
- windmill
- sunPrism
- weatherClouds
- rainLayer
- islandBase
- farClouds
- farIslands
- fxLayer
- rightUiSafeArea

Layer intent:
- background sky and far clouds behind everything
- weather clouds above the island
- rain falling from clouds toward crops and rain collector
- island base in the middle
- crops and machines on fixed anchor spots
- light beams, wind lines, splashes, and sparkles on the fx layer

Important:
This should communicate fixed anchors and simple 2D layer ordering, not a real isometric building system.
Do not show free building placement.
Do not show a tile grid.
Do not show characters, roads, houses, combat, enemies, quests, or extra systems.
Do not make it a large map.
Keep it bright, clean, soft, airy, and easy to read.
```

## 4. 验收标准

### 4.1 主画面概念图验收

必须满足：

- 第一眼能看出这是“漂浮天气小岛”，不是普通农场。
- 小岛有明确厚度和体积感。
- 云、雨、阳光、风车、雨水收集器、太阳棱镜都能被辨认。
- 3 块作物地存在，但不抢走天气主题。
- 画面清爽、明亮、圆润、天空感强。
- 右侧留有 UI 面板空间。
- 不出现角色、剧情、敌人、战斗、卡牌、登录、任务板等扩展内容。
- 不像 3D 引擎截图，不像复杂等距城市，也不像完整农场模拟器。

拒收条件：

- 画面暗、脏、恐怖、赛博朋克、克苏鲁、写实厚涂。
- 天气元素不明显，只剩农田和建筑。
- 岛太大、元素太多、无法拆成可控游戏层。
- 加入新资源、新机器、新作物类型或 NPC。

### 4.2 资产风格板验收

必须满足：

- 所有对象看起来属于同一游戏。
- 云、小岛、作物、机器、特效的比例关系合理。
- 每个对象都有清晰轮廓，缩小到 64px 仍能辨认。
- 风车叶片有拆分成独立 sprite 的潜力。
- 太阳棱镜、雨水收集器和作物阶段的功能差异清楚。
- 色彩保持天空蓝、云白、嫩绿、暖土、淡金、水蓝的方向。

拒收条件：

- 风格混乱，例如云像厚涂、机器像写实、作物像像素风。
- 单体资产依赖复杂背景，无法后续拆分。
- 出现多余对象：房屋、角色、动物、市场、任务板、战斗物件。
- 机器设计过度复杂，超出 v0.1 的识别需求。

### 4.3 伪 2.5D 锚点草图验收

必须满足：

- 能清楚看出固定锚点布局。
- cropA / cropB / cropC、rainCollector、windmill、sunPrism 的位置关系合理。
- 天空层、天气云层、雨层、小岛层、机器层、fx 层关系清楚。
- 右侧 UI 安全区明确。
- 后续可以按这张图拆成 Pixi Container 和固定坐标。

拒收条件：

- 画成 tile map、自由建造编辑器或大地图。
- 需要真实 2.5D depth sorting 才能实现。
- 锚点过密，导致当前 v0.1 三机器三作物无法读清。
- 加入新的交互点或新系统。

## 5. 后续资产拆分建议

### 5.1 后续适合拆成 PNG sprite 的元素

这些是后续正式 Art Pass 候选，不在 Art Pass 0 直接生成正式资源：

- `island_base.png`：小岛主体，包含草地、土层、岩层厚度。
- `island_shadow.png`：小岛下方柔和投影或云影，可选。
- `cloud_soft_01.png` / `cloud_soft_02.png`：主要可点击云。
- `background_cloud_bank_01.png`：远景云海或云层。
- `far_island_01.png`：远景小浮岛，装饰层，不参与玩法。
- `crop_stage_0.png`：空地。
- `crop_stage_1.png`：小芽。
- `crop_stage_2.png`：成长阶段。
- `crop_ready.png`：成熟阶段。
- `machine_rain_collector.png`：雨水收集器主体。
- `machine_windmill_base.png`：风车塔身。
- `machine_windmill_blades.png`：风车叶片，必须可单独旋转。
- `machine_sun_prism.png`：太阳棱镜主体。

拆分原则：

- 交互对象必须单独成 sprite。
- 会旋转或闪烁的部件必须拆开。
- 背景层和玩法对象分离。
- PNG 需要透明背景、统一光向、统一伪 2.5D 角度。
- 每个关键对象必须保留 Pixi Graphics fallback。

### 5.2 继续用 Pixi Graphics 的元素

这些不建议做成正式 PNG sprite：

- 雨滴。
- 水花。
- 命中波纹。
- 作物进度条。
- 成熟 glow。
- 收获飞字。
- 资源飞字。
- 风线。
- 太阳棱镜光束。
- 小闪光粒子。
- collector 命中闪光。
- debug hitbox / anchor marker。

原因：

- 它们数量多、变化快、需要实时控制 alpha / scale / position。
- 程序图形更容易和当前 Pixi 动画系统结合。
- 这些效果的职责是反馈，不需要复杂纹理。

### 5.3 建议的 Pixi 层级

```text
backgroundSky
farClouds
farIslands
weatherClouds
rainLayer
islandBase
islandGroundDetails
crops
machines
fxLayer
uiOverlay
```

注意：`uiOverlay` 指 Pixi 场景内的轻量反馈层，不替代 React UI。资源栏、升级面板、机器面板、下一目标仍由 React 管理。

## 6. 不做事项

Art Pass 0 不做：

- 不调用 image generation 直接生成图片。
- 不生成正式资源。
- 不接入素材。
- 不改代码。
- 不改技术栈。
- 不新增玩法系统。
- 不新增资源。
- 不新增机器。
- 不新增作物系统。
- 不新增角色、NPC、动物、敌人、剧情、任务。
- 不做自由建造。
- 不做等距 tile map。
- 不做 3D 或真正 2.5D 引擎。
- 不做复杂遮挡、寻路、摄像机旋转。
- 不写长期商业美术计划。

Art Pass 0 结束后的唯一决策输出应该是：

```text
是否进入 Art Pass 1：生成少量风格验证图。
是否需要调整 prompt 方向。
是否继续保持当前程序图形 greybox，暂缓资产接入。
```
