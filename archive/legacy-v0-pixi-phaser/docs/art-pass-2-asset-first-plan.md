# 《云上小岛》Art Pass 2 Pixel Asset-First Plan

## 1. 路线修正

Art Pass 1 的三张主画面方向图证明了伪 2.5D 能提升画面气质，但它们不是下一步最该继续的产物。

下一步应从“生成一张好看的游戏画面”改为：

> 生成适合当前游戏拆分和接入的资产。

最新美术决策：

> 后续 Art Pass 统一改为像素风伪 2.5D。

原因：像素风更适合拆 sprite、做地块、机器部件、作物阶段和特效小样，也更适合当前 PixiJS 组合式渲染。

目标不是再做概念图，而是验证资产能否被 PixiJS 组合成当前 v0.1 场景：

```text
岛屿底座
云
地块
作物阶段
雨水收集器
风车
太阳棱镜
少量特效素材
```

所有资产都必须服务当前闭环：

```text
云 -> 雨 -> 作物成长 -> 收获 -> 升级 -> 天气机器
```

不新增玩法，不新增资源，不新增机器，不扩展作物系统。

## 2. 资产生成原则

### 2.1 生成对象而不是生成场景

后续 image generation prompt 应直接描述“要生成什么资产”，例如：

```text
生成一张适合游戏拆分的伪 2.5D 像素风浮岛底座 sprite。
透明背景。
45 度俯视角。
草地顶部、土层、岩层厚度清楚。
不要角色、房子、栅栏、作物、机器。
```

避免继续使用：

```text
生成一张漂亮的游戏主画面。
生成一张概念图。
生成一张宣传图。
```

### 2.2 每张图只验证一个资产组

推荐按资产组生成，不要一次生成完整资产包：

1. 岛屿与地块。
2. 云与天气层。
3. 作物阶段。
4. 机器组。
5. 特效小样。

每组生成图都应像 sprite sheet 或 asset board，而不是完整场景。

### 2.3 透明背景优先

正式候选资产应优先要求：

- flat chroma-key background 或透明背景。
- 资产之间有足够 padding。
- 不互相遮挡。
- 不带投影到复杂背景。
- 不带文字、logo、水印。

如果使用 Codex 自带 imagegen，默认先生成在纯色背景上，后续再做抠图或手工拆分验证。

## 3. 第一批资产组

### 3.1 岛屿底座与地块

目标：替换当前程序图形小岛的主体视觉，但不改变玩法坐标。

资产候选：

- `island_base_pixel_01.png`
- `plot_soil_empty_01.png`
- `plot_soil_wet_01.png`
- `plot_anchor_marker_debug.png` 可选，仅用于规划，不进正式游戏。

关键要求：

- 像素风伪 2.5D，约 45 度俯视。
- 像素密度统一，边缘清楚，避免高清手绘/厚涂质感。
- 小岛必须是一个可放置 3 块作物 + 3 台机器的小型空岛。
- 地块必须能单独重复摆放。
- 岛屿不要自带作物、机器、角色、房屋。
- 岛屿边缘有清楚草层、土层、岩层厚度。

Prompt 草案：

```text
Generate a game-ready pixel-art pseudo-2.5D floating island base sprite for a cozy sky weather idle game.

Asset purpose:
- one compact floating island base for a browser game scene
- viewed from a fixed 45-degree elevated angle
- transparent background or perfectly flat chroma-key background
- no UI, no text, no logo

Visual requirements:
- grassy top surface
- warm soil layer
- chunky rounded rock underside
- soft bright sky-game color palette
- clean readable silhouette
- enough flat top area for exactly 3 crop plots and 3 small weather machines

Do not include:
- crops
- machines
- houses
- characters
- animals
- fences
- roads
- tile grid
- extra islands
- full scene background

Style:
high-quality pixel-art pseudo-2.5D game asset, bright, soft, rounded, clean, asset-readable, consistent pixel density.
```

### 3.2 云与天气层

目标：替换或补充当前程序云的视觉方向，支持点击云和背景云层。

资产候选：

- `cloud_clickable_01.png`
- `cloud_clickable_02.png`
- `cloud_bank_background_01.png`

关键要求：

- 可点击云需要单独 sprite。
- 背景云层不能抢主交互云。
- 云的视觉范围要与点击范围容易对应。
- 不做真实厚涂云，不做黑云灾害。

Prompt 草案：

```text
Generate a small pixel-art sprite sheet of soft clouds for a cozy pseudo-2.5D sky island game.

Include:
- two clickable white cloud sprites
- one long soft background cloud bank

Asset requirements:
- transparent background or perfectly flat chroma-key background
- separated assets with clear padding
- rounded soft cloud shapes
- readable at small game size
- bright cloud white with pale blue shadow

Do not include:
- lightning
- storm clouds
- faces
- text
- UI
- rain already attached to every cloud
- full scene background

Style:
clean bright pixel-art game asset, soft and rounded, compatible with pixel-art pseudo-2.5D.
```

### 3.3 作物阶段

目标：只做当前 3 块作物地需要的通用成长阶段，不扩展作物系统。

资产候选：

- `crop_stage_0_empty.png`
- `crop_stage_1_sprout.png`
- `crop_stage_2_growing.png`
- `crop_stage_3_ready.png`

关键要求：

- 通用“天气作物”，不要变成多种蔬菜合集。
- 四阶段必须同一视角、同一地块尺寸。
- 成熟阶段要有轻微云棉/阳光感，但不要新增资源。

Prompt 草案：

```text
Generate a 4-frame pixel-art crop growth sprite sheet for a cozy pseudo-2.5D sky weather idle game.

Frames:
1. empty soil plot
2. small sprout
3. growing soft green crop
4. ready crop with subtle cloud-cotton and sunlight feeling

Asset requirements:
- exactly 4 separate crop plot sprites in one row
- same size and same 45-degree pseudo-2.5D perspective
- transparent background or perfectly flat chroma-key background
- readable at small game size
- no text, no labels, no UI

Do not include:
- multiple crop species
- vegetables collection
- character
- tools
- fences
- extra machines

Style:
high-quality pixel-art pseudo-2.5D, bright, rounded, clean, compatible with the floating island base.
```

### 3.4 机器组

目标：生成当前 3 台天气机器的可拆分视觉方向。

资产候选：

- `machine_rain_collector.png`
- `machine_windmill_base.png`
- `machine_windmill_blades.png`
- `machine_sun_prism.png`

关键要求：

- 雨水收集器、风车、太阳棱镜必须一眼能区分。
- 风车叶片必须可单独旋转。
- 机器不能变成房子、商店、建筑群。
- 机器体积应适配小岛，不抢过岛屿和云雨。

Prompt 草案：

```text
Generate a small pixel-art game asset sheet of three weather machines for a cozy pseudo-2.5D sky island idle game.

Include only:
- one rain collector / water tank
- one windmill base
- one separate windmill blade sprite
- one sun prism device

Asset requirements:
- separated objects with clear padding
- same 45-degree pseudo-2.5D perspective
- transparent background or perfectly flat chroma-key background
- readable at small size
- simple shapes suitable for sprite extraction

Do not include:
- houses
- shops
- characters
- animals
- extra machines
- UI
- text
- full scene background

Style:
high-quality pixel-art pseudo-2.5D game assets, bright sky palette, rounded, clean, cute but not childish, consistent pixel density.
```

### 3.5 特效小样

目标：验证少量效果风格，但正式运行中仍优先用 Pixi Graphics。

资产候选：

- `fx_raindrop_style_ref.png`
- `fx_splash_style_ref.png`
- `fx_sparkle_style_ref.png`
- `fx_light_beam_style_ref.png`
- `fx_wind_line_style_ref.png`

关键要求：

- 这些大多只是视觉参考，不一定作为 PNG 接入。
- 雨滴、水花、光束、风线仍建议优先程序绘制。
- 可以用这组图统一颜色和形状语言。

Prompt 草案：

```text
Generate a small pixel-art VFX style reference sheet for a cozy pseudo-2.5D sky weather idle game.

Include:
- raindrop
- small water splash
- soft sparkle
- warm sunlight beam
- gentle wind line

Asset requirements:
- separated effect samples
- transparent background or perfectly flat chroma-key background
- no text, no labels, no UI
- simple readable shapes suitable for Pixi Graphics recreation

Style:
bright, clean, soft, rounded, sky-weather themed.
```

## 4. 仍然继续用 Pixi Graphics 的内容

即使后续有特效小样，以下内容仍优先使用 Pixi Graphics：

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

原因：这些元素需要频繁生成、移动、缩放、淡出，用程序图形更稳定，也更容易保持当前玩法反馈。

## 5. 下一轮建议

如果继续 Art Pass 2，建议只做第一批 2 张资产验证图：

1. `pixel island_base + plot tiles` 资产板。
2. `pixel weather machines` 资产板。

暂时不要一口气生成所有资产，也不要接入游戏。

验收通过后，再进入 Art Pass 3：拆单体 PNG、做透明背景、建立 manifest、保留 fallback，然后才考虑替换当前 Pixi Graphics。

## 6. 不做事项

- 不生成完整主画面概念图。
- 不生成宣传海报。
- 不生成传统农场资产包。
- 不加入房子、角色、动物、战斗、任务、商店。
- 不新增资源。
- 不新增机器。
- 不新增作物系统。
- 不接入代码。
- 不替换当前 Pixi Graphics。
- 不改变技术栈。
