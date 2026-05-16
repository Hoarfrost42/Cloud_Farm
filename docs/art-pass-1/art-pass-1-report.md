# 《云上小岛》Art Pass 1 报告

## 1. 项目视觉现状分析

当前真实 Demo 参照图：[current_demo_screenshot.png](./current_demo_screenshot.png)

当前游戏内部画布尺寸是 `800 x 520`，CSS 展示区域约为 `960 x 624`，页面截图为 `1440 x 900`。右侧 React UI 面板固定 `320px`，加上间距后约占整屏 22%-24%，符合后续方向图里的 `20%-25% UI safe area` 目标。

小岛当前位于 Pixi 画布中下部，主体中心约在 `(400, 374)`，视觉宽度约 600px，高度约 250px。3 块作物在 `(302,350)`、`(400,340)`、`(498,350)`；雨水收集器在 `(602,344)`，风车在 `(192,340)`，太阳棱镜在 `(676,338)`。云层在上方 `(170,92)` 和 `(560,128)` 附近漂移，太阳在 `(642,86)`。

主要视觉问题是：小岛仍是程序图形拼接，缺少岩层厚度、局部材质和可观看的小世界细节；机器只有符号级识别，缺少“已建成设备”的重量；云雨反馈成立但天空层次仍偏平。转向伪 2.5D 时，小岛底座、作物锚点、三台机器都需要重新布局成固定角度；雨滴、风线、光束、飞字、进度条、命中闪光可以继续沿用 Pixi Graphics 思路。

## 2. 三个美术方向候选

### A. Cozy Pixel 2.5D

方向图：[art_direction_a_cozy_pixel.png](./art_direction_a_cozy_pixel.png)

核心气质：高完成度像素风空岛经营画面，细节丰富，游戏感强，天气云层很有主角感。

适合程度：中高。它最像成熟小型游戏截图，像素风能快速建立“可玩游戏”的信号。

风险：细节密度偏高，岛上出现了偏建筑化的风车结构，后续拆 sprite 和保持动画一致的成本较高；像素风如果正式采用，会要求所有 UI、特效和素材都统一到像素语法。

Prompt：

```text
Use the current Cloud Island demo screenshot as a layout reference only: left 75-80% playfield, right 20-25% clean UI safe area, compact floating island in the playfield, sky background.

Create one pseudo-2.5D game screen direction image for Cloud Island, a light incremental idle browser game about growing weather.

Direction A: Cozy Pixel 2.5D.

The image should look like an actual playable game screen, not a poster, not a splash art, not an asset showcase. Use a high-quality cozy pixel-art inspired 2.5D style with readable chunky pixel forms and soft bright colors. The camera is a fixed elevated 45-degree view of a small floating island in a clear sky.

Layout:
- Left 75-80% is the game scene.
- Right 20-25% is a clean empty UI safe area with no text, no icons, no fake UI labels.
- The island sits in the lower-middle of the playfield and is the visual focal point.
- Leave sky above for weather clouds and sunlight.

Core existing v0.1 elements only:
- one compact grassy floating island with visible soil and rock thickness underneath
- exactly 3 small crop plots on fixed anchor positions
- large soft clouds above the island, with gentle visible rain
- one small rain collector / water tank
- one cute windmill
- one small sun prism glowing softly
- water droplets, small splashes, light beams, subtle wind streaks
- distant floating islands and cloud layers only as background decoration

Important:
Weather is the main theme. No characters, animals, houses, combat, enemies, quests, cards, logo, text, or UI text.
Do not show tile grid, free building placement, or a large map.
```

### B. Clean Stylized 2D

方向图：[art_direction_b_clean_stylized.png](./art_direction_b_clean_stylized.png)

核心气质：高清 2D 手绘/卡通方向，色彩清爽，云雨和机器都很突出，网页游戏亲和力强。

适合程度：高。它最符合“清爽、明亮、圆润、天空感”的既定方向，也最容易和当前 React UI 的非像素风融合。

风险：画面细节仍然偏多，风车被生成成带门的建筑，容易往普通经营游戏跑；正式接入时要压低装饰密度，避免小岛变成完整农场或村庄。

Prompt：

```text
Use the current Cloud Island demo screenshot as a layout reference only: left 75-80% playfield, right 20-25% clean UI safe area, compact floating island in the playfield, sky background.

Create one pseudo-2.5D game screen direction image for Cloud Island, a light incremental idle browser game about growing weather.

Direction B: Clean Stylized 2D.

The image should look like an actual playable browser game screen, not a poster and not a marketing illustration. Use a clean high-resolution stylized 2D art style with rounded shapes, soft edges, clear silhouettes, and bright airy colors. The camera is a fixed elevated 45-degree view of a small floating island in a clear sky.

Layout:
- Left 75-80% is the game scene.
- Right 20-25% is a clean empty UI safe area with no text, no icons, no fake UI labels.
- The floating island is lower-middle in the playfield, large enough to inspect but still compact.
- Clouds and weather effects occupy the upper scene without covering the UI safe area.

Core existing v0.1 elements only:
- one compact grassy floating island with visible soil and rounded rock underside
- exactly 3 small crop plots, arranged as fixed anchors
- large soft clouds above the island, raining gently
- one small rain collector / water tank
- one cute windmill with readable blades
- one small sun prism device emitting a soft warm beam
- water droplets, splashes, light beams, wind streaks
- distant cloud banks and tiny far floating islands as atmospheric background

Important:
Weather should dominate the composition. Only 3 crop plots. No extra crop rows, barns, houses, fences, characters, animals, roads, shops, enemies, quests, cards, text, UI labels, or logos.
```

### C. Hybrid Chunky 2.5D

方向图：[art_direction_c_hybrid_chunky.png](./art_direction_c_hybrid_chunky.png)

核心气质：介于像素和高清 2D 之间，块面清楚，资产可读，天气表现很强，岛屿体积感最好。

适合程度：最高。它保留了游戏截图感，又不像纯像素风那样强绑定整套资产语言；对 PixiJS sprite 拆分、React UI 融合和后续程序特效都更友好。

风险：生成图仍然带有一些建筑化倾向，风车像小塔楼，岛上装饰花草略多。正式 Art Pass 需要把“可爱经营细节”压回“天气机器生态”，减少无功能装饰。

Prompt：

```text
Use the current Cloud Island demo screenshot as a layout reference only: left 75-80% playfield, right 20-25% clean UI safe area, compact floating island in the playfield, sky background.

Create one pseudo-2.5D game screen direction image for Cloud Island, a light incremental idle browser game about growing weather.

Direction C: Hybrid Chunky 2.5D.

The image should look like an actual playable game screen. Use a hybrid chunky 2.5D style between pixel art and clean HD 2D: blocky readable forms, soft rounded edges, light texture, moderate detail, strong asset readability. The camera is a fixed elevated 45-degree view of a small floating island in a clear sky.

Layout:
- Left 75-80% is the game scene.
- Right 20-25% is a clean empty UI safe area with no text, no icons, no fake UI labels.
- Island is the main focal point, placed slightly below center.
- Weather clouds, rain, wind, and sun prism glow create the visual hierarchy.

Core existing v0.1 elements only:
- one compact floating island with grassy top, warm soil band, rounded chunky rock underside
- exactly 3 small crop plots on fixed anchor positions
- large soft clouds above the island with visible gentle rain
- one small rain collector / water tank with visible water
- one cute windmill with clear rotating-blade silhouette
- one small sun prism device glowing with warm light
- water droplets, splashes, wind streaks, soft light beam
- distant cloud layers and tiny floating islands only as background depth

Important:
Weather must be the main gameplay theme. Only 3 crop plots. No characters, animals, houses, combat, enemies, quests, cards, logo, text, or UI text.
Do not show tile grid, free building placement, real 3D camera, or a large map.
```

## 3. 自评

| 方向 | 像可玩的游戏画面 | 突出天气主题 | UI 空间 | 适合拆资产 | 技术栈兼容 | 避免普通农场感 |
|---|---:|---:|---:|---:|---:|---:|
| A Cozy Pixel 2.5D | 5 | 5 | 4 | 3 | 3 | 4 |
| B Clean Stylized 2D | 5 | 5 | 5 | 4 | 5 | 4 |
| C Hybrid Chunky 2.5D | 5 | 5 | 5 | 5 | 5 | 4 |

当时推荐继续迭代：C Hybrid Chunky 2.5D。

当时理由：C 的岛屿厚度、天气层级、机器存在感和 UI 留白都比较接近可执行方向，同时不像 A 那样强制项目进入像素风管线。该判断已被后续“像素风资产拼接”决策覆盖。

建议放弃：A Cozy Pixel 2.5D 作为主方向暂缓。

理由：它很有游戏感，但像素风会牵动 UI、字体、粒子、缩放、资源制作规范，当前项目的 React UI 和 Pixi 程序图形并不天然匹配像素风。

B Clean Stylized 2D 可作为备选方向。若用户更偏好清爽网页感而不是“更像小型游戏”的质感，B 更安全。

## 4. 后续资产拆分判断

后续适合拆成 PNG sprite：

- 小岛底座：`island_base.png`
- 可点击云：`cloud_soft_01.png`、`cloud_soft_02.png`
- 背景云海：`background_cloud_bank_01.png`
- 远景浮岛：`far_island_01.png`
- 作物阶段：`crop_stage_0.png`、`crop_stage_1.png`、`crop_stage_2.png`、`crop_ready.png`
- 雨水收集器主体：`machine_rain_collector.png`
- 风车塔身：`machine_windmill_base.png`
- 风车叶片：`machine_windmill_blades.png`
- 太阳棱镜主体：`machine_sun_prism.png`

继续用 Pixi Graphics：

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

## 5. 结论

Art Pass 1 证明伪 2.5D 能显著提升《云上小岛》的“小世界经营感”，也能让天气主题更像画面主角。当前最值得继续的是 C Hybrid Chunky 2.5D：它比 A 更容易落地，比 B 更有游戏质感。

下一轮如果继续 Art Pass，建议不要直接接入代码，而是先做 Art Pass 2：基于 C 方向生成一张资产风格板和一张锚点草图，并进一步压低装饰密度，去掉建筑化倾向，确保只保留 v0.1 的 3 块作物、3 台机器和天气循环。

## 6. 路线修正：从概念图转向游戏资产

Art Pass 1 的主画面方向图已经足够证明“伪 2.5D 气质可行”。继续生成完整游戏画面收益不高，容易把工作带向宣传图、概念图或不可拆分的整图。

后续应改为资产优先：

```text
先生成可拆分游戏素材
再验证是否能被 PixiJS 组合
最后才考虑接入正式资源
```

优先资产组：

- 岛屿底座。
- 云。
- 地块。
- 作物阶段。
- 雨水收集器。
- 风车底座与叶片。
- 太阳棱镜。
- 少量特效风格参考。

新的执行计划已写入：[art-pass-2-asset-first-plan.md](../art-pass-2-asset-first-plan.md)。

## 7. 最新美术决策：改为像素风资产拼接

后续 Art Pass 主方向已从 `Hybrid Chunky 2.5D` 改为：

```text
Pixel-art pseudo-2.5D asset-first
```

原因：像素风更适合当前阶段的素材拼接，尤其是：

- 岛屿底座。
- 地块 tile。
- 机器部件。
- 作物阶段。
- 云和天气特效。

因此，Art Pass 1 中 `C Hybrid Chunky 2.5D` 的推荐已被新决策覆盖。C 图仍可作为“天气主角、右侧 UI 留白、小岛体积感”的构图参考，但不再作为正式美术语法。
