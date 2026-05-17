# 云屿回晴 / Cloud Island

《云屿回晴》是一款轻量的天气主题增量游戏原型。

从第一次点击云层、凝聚天气活力开始，玩家会一点点唤醒一座安静的空中小岛：让雨重新落下，让天气自己流动，让沉睡的高空回响逐步浮现。

当前版本是一个可试玩的单屏 UI 原型，重点是完整体验“点击 -> 培育 -> 凝结 -> 回响 -> 继续推进”的放置循环，而不是最终美术版。

## 游戏体验

玩家一开始只能手动点击云层，获得天气活力。随着本轮培育不断推进，新的注入方式、自动增长、雨阶、季风、风暴前线和气候改写会逐步解锁。

核心节奏：

```text
点击云层注入天气活力
-> 购买培育项
-> 凝结雨阶
-> 推进季风与高空回响
-> 解锁更深层的天气循环
-> 点燃天空心脏
```

当前目标不是经营农田，而是让天气本身重新生长。

## 当前可玩内容

- 单屏天气手账式 UI。
- 点击云层获得天气活力。
- 多层升级与自动增长。
- 雨阶、季风、风暴前线、气候改写、天空心脏等完整进度链。
- 顶部晴雨脉象、右侧观察笔记、升级页签、批注页公式说明。
- 本地存档，刷新后可继续游玩。
- Windows Electron 目录包，可直接运行 `CloudIsland.exe`。

## 试玩方式

安装依赖：

```bash
npm install
```

启动浏览器版本：

```bash
npm run dev
```

本地地址通常是：

```text
http://127.0.0.1:5190
```

如果端口被占用，Vite 会自动使用后续端口。

## Windows 桌面版

生成可直接运行的 Windows 目录包：

```bash
npm run package:desktop
```

产物位置：

```text
release-desktop/win-unpacked/CloudIsland.exe
```

这里使用 Electron Builder 的 `dir` target，只生成 `win-unpacked` 目录，不额外生成安装器。把整个 `win-unpacked` 文件夹发给试玩者即可运行。

仓库内也保留了一份 Windows 试玩包：

```text
releases/CloudIsland-v13-playtest-win.zip
```

## 当前版本状态

```text
v13 / Single-Screen Weather Notebook Prototype
```

当前模拟显示，熟悉玩法或偏贪心的路线大约可在 2-4 小时内完成主流程；更保守或误导路线可能会拉长到 6 小时以上。现阶段保留一定路线差异，只要求存在正常可完成路径。

当前存档 key：

```text
cloud-island-weather-reactor-v13-complete-slice
```

如果遇到旧存档导致状态异常，可以在浏览器开发者工具中清理 localStorage，或在游戏内使用重置入口。

## 技术栈

```text
Vite
React
TypeScript
CSS
localStorage
Electron
```

当前主线不使用后端、账号系统、3D 引擎、Redux、PixiJS 或 Phaser。旧 v0 农场路线、Pixi 画布路线、Phaser 伪 2.5D 实验已归档到：

```text
archive/legacy-v0-pixi-phaser/
```

## 开发入口

当前有效入口：

```text
src/main.tsx
src/App.tsx
src/styles/global.css
src/styles/app.css
```

当前经济内核：

```text
src/game/economy/
  constants.ts
  types.ts
  state.ts
  formulas.ts
  logNumbers.ts
  upgrades.ts
  resets.ts
  tick.ts
  format.ts
  index.ts
```

Electron 入口：

```text
electron/main.cjs
```

## 验收命令

常规检查：

```bash
npm run typecheck
npm run build
npm run simulate:weather-strategies
```

桌面包检查：

```bash
npm run package:desktop
```

旧脚本 `scripts/simulate-weather-reactor.mjs` 仍在仓库中，但当前平衡验收以 `scripts/simulate-weather-strategies.mjs` 为准。

## 项目文档

开发和调参事实源：

```text
docs/weather-reactor-v13-implementation-summary.md
docs/weather-reactor-external-discussion-brief.md
docs/weather-reactor-simulation-strategy-notes.md
docs/current-code-map.md
docs/README.md
```

旧 v12 文档仍保留为第一季风前公式、调参和决策历史。若旧文档与 v13 实现总表冲突，以 v13 实现总表为准。

## 开发原则

- 以当前单屏天气手账原型为主线。
- 小步修改，避免一次性重构整套经济系统。
- 数值改动后必须跑模拟器。
- UI 显示口径、公式口径和文档口径要同步更新。
- 当前仓库是 `F:\Cloud_Farm_v12_lab` 的 lab 分支，不默认修改旧目录。
