# AGENTS.md

## 使用准则

- 始终使用简体中文回复。
- 当前工作目录是 `F:\Cloud_Farm_v12_lab`。
- 不要默认修改主项目 `F:\Cloud_Farm`。
- 读取文件时使用 UTF-8。
- 修改文件时使用 `apply_patch`，不要用 PowerShell 写文件。
- 可能存在用户或前序代理留下的未提交改动，先查看 `git status`，不要回滚无关改动。

## 当前项目状态

项目名：

```text
Cloud Island / 云上小岛 / 天气反应堆
```

当前版本：

```text
v13 / Post-Monsoon Complete Slice
```

当前存档 key：

```text
cloud-island-weather-reactor-v13-complete-slice
```

当前主线是浏览器端 React 增量游戏原型。核心目标是验证天气主题增量循环：

```text
点击云层
-> 天气活力
-> 本轮升级
-> 雨阶
-> 季风
-> 云核天赋
-> 气压
-> 风暴前线
-> 气候改写
-> 天空心脏
-> 1e308 终局
```

最新事实源：

```text
docs/weather-reactor-v13-implementation-summary.md
docs/current-code-map.md
docs/README.md
```

旧 v12 文档保留为公式、调参和决策历史。若旧文档与 v13 实现总表冲突，以 v13 实现总表为准。

## 当前技术栈

```text
Vite
React
TypeScript
CSS
localStorage
```

当前主线不使用后端、账号系统、3D、Redux、PixiJS 或 Phaser。旧 v0 农场路线、Pixi 画布路线、Phaser 伪 2.5D 实验已归档到：

```text
archive/legacy-v0-pixi-phaser/
```

这些归档内容只作历史参考，除非用户明确要求恢复，否则不要接回主线。

## 当前有效代码边界

入口与 UI：

```text
src/main.tsx
src/App.tsx
src/styles/global.css
src/styles/app.css
```

经济内核：

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

模拟器：

```text
scripts/simulate-weather-strategies.mjs
```

旧 `scripts/simulate-weather-reactor.mjs` 不作为 v13 平衡验收依据。

## 当前开发重点

优先级：

1. 保持 v13 全流程可跑到 `1e308`。
2. 小步调参，重点处理季风后压缩过强的问题。
3. 保持 UI 显示口径、公式口径、模拟输出和文档一致。
4. 逐步解耦过大的 `App.tsx`，但不要在调参中顺手做大重构。

下一轮高风险区域：

- 中后期本轮升级无限堆叠成本。
- 气压收益。
- 风暴胞、气候法则、天空心脏脉冲的指数贡献。
- 第一季风后 5 分钟内旧流程是否被明显压缩。
- 第一风暴前线是否让玩家感到进入新循环。

## 工作流要求

开始编码或改文档前，先给：

```text
Current SPEC:
Files to add:
Files to modify:
Explicitly not doing:
Acceptance checks:
```

只实现该范围。不要静默加入额外功能。

改动后给：

```text
What changed:
How to run:
How to verify:
Known limitations:
```

## 验收命令

代码、数值和文档入口改动后，至少运行：

```bash
npm run typecheck
```

涉及构建、样式或主入口时运行：

```bash
npm run build
```

涉及经济、数值、reset、升级或模拟器时运行：

```bash
npm run simulate:weather-strategies
```

## 设计边界

- 当前是 v13 lab 原型，不追求最终商业美术。
- 不默认恢复旧 v0 农场、Pixi、Phaser 或伪 2.5D 路线。
- 不引入后端、登录、多人、3D、ECS、大型状态库或复杂资产管线。
- 不用旧 v11、formula A/B 或过期技术说明作为当前事实。
- 如果用户说“比如”“例如”，从例子泛化到整体场景处理，不只修单一例子。

## UI 与显示口径

当前 UI 主要在 `src/App.tsx` 和 `src/styles/app.css` 中。显示相关辅助在：

```text
src/game/economy/format.ts
src/game/economy/constants.ts
src/game/economy/upgrades.ts
```

注意：

- 默认不显示 `K/M`，百万以上使用科学计数法。
- 默认速率尽量显示整数，小数模式只用于调试。
- “实测/s”当前只跟随公式被动速率，不记录点击和自动点击脉冲。
- 买前/买后预览必须显示真实数值，不要显示 `1e6.7` 这类 log 指数文本。

## Git 约定

- 当前远端是 `https://github.com/Hoarfrost42/Cloud_Farm`。
- 主要分支是 `main`。
- 提交前先运行必要验收命令。
- 不要提交 `node_modules/`、`dist/`、`.env*` 或临时日志。
