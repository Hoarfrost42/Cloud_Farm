# 给外部 GPT 的讨论简报

更新时间：2026-05-16  
项目：Cloud Island / 云上小岛  
当前方向：天气主题增量游戏  
当前版本：`v13 / Post-Monsoon Complete Slice`

## 讨论目标

目标是评审当前 v13 全流程结构与数值曲线，重点看：

- 第一次季风前节奏是否合理。
- 第一次季风后旧流程是否明显被压缩。
- 风暴前线是否形成新的循环感。
- 气候改写与天空心脏是否过快进入终局。
- 当前公式、UI 文案和模拟输出是否足够一致。

## 当前主线

```text
点击云层注入天气活力
-> 买本轮升级
-> 凝结雨阶
-> 第一次季风
-> 云核天赋
-> 气压升级
-> 风暴前线
-> 风暴图谱
-> 气候改写
-> 气候法则
-> 天空心脏脉冲
-> 1e308 终局
```

## 当前关键实现

当前天气活力采用 log-safe 结算：

```text
weather/s = baseFormula * 10 ^ layerBonus
```

其中：

```text
baseFormula =
  活力基流
  * 雨滴 log 乘区
  * 雨阶乘区
  * 天气增幅
  * 厚云降雨
  * 季风牵引
  * 风暴记忆
  + 自动细雨
```

```text
layerBonus =
  云核指数奖励
  + 气压指数奖励
  + 风暴胞指数奖励
  + 气候法则指数奖励
  + 天空心脏脉冲指数奖励
```

当前重要口径：

- 雨滴乘区：`1 + log10(1 + droplets / 1000) * 8`。
- 生产者存量乘区：`1 + log10(1 + amount / 1000) * 6`。
- 雨阶乘区基础为 `1 + rainRanks`。
- 第一次季风目标为 `1e20`。
- 季风后主线继续扩展到风暴前线、气候改写和 `1e308` 终局。
- 云核本身不提供隐藏线性倍率或隐藏指数倍率，只通过显式天赋生效。

## 当前模拟结果

命令：

```bash
npm run simulate:weather-strategies
```

最新基线：

| 策略 | 天空心脏时间 | 第一次季风 | 第一风暴前线 | 第一次气候改写 | 静默告警 |
|---|---:|---:|---:|---:|---:|
| guided-human | 50:07 | 33:34 | 45:17 | 48:21 | 0 |
| roi-greedy | 45:47 | 30:57 | 41:41 | 44:12 | 0 |
| comfort-first | 1:18:30 | 35:06 | 1:04:20 | 1:13:40 | 0 |
| bad-but-plausible | 1:18:45 | 35:06 | 1:08:34 | 1:13:44 | 0 |

当前判断：

- 全流程已经能跑通到 `1e308`。
- 第一季风前速度大致可接受。
- 季风后到风暴、气候、天空心脏的压缩偏强。
- 第二次气候改写后到终局过快，需要后续调参。

## 希望外部评审的问题

1. 第一次季风在 `31-35` 分钟是否适合作为小品增量游戏的第一层 reset。
2. 第一次季风后 5 分钟内旧流程是否应该被压缩到当前程度。
3. 当前 `monsoonPull`、`weatherAmplifier`、`dropletSeed` 是否因为无限堆叠导致中后期太容易爆穿。
4. 气压收益是否应该从指数层回退一部分到成本折扣或门槛压缩。
5. 风暴胞指数奖励与气候法则指数奖励是否过高。
6. 天空心脏三档脉冲是否应该承担终局冲刺，还是只作为最后确认按钮。
7. 模拟器当前四种策略是否足够代表玩家路线。
8. UI 是否应该把 `baseFormula` 和 `layerBonus` 继续拆得更清楚。

## 推荐阅读

当前事实源：

```text
docs/weather-reactor-v13-implementation-summary.md
docs/current-code-map.md
docs/README.md
README.md
```

历史参考：

```text
docs/weather-reactor-v12-change-summary.md
```

不要优先使用旧 v11、formula A/B、旧雨滴公式、旧技术说明或归档路线作为当前判断依据。

## 代码入口

经济核心：

```text
src/game/economy/constants.ts
src/game/economy/formulas.ts
src/game/economy/upgrades.ts
src/game/economy/resets.ts
src/game/economy/tick.ts
src/game/economy/logNumbers.ts
```

UI 入口：

```text
src/App.tsx
src/styles/app.css
```

模拟脚本：

```text
scripts/simulate-weather-strategies.mjs
```

## 希望外部 GPT 给出的产物

建议输出一份 v13 调参建议，至少包含：

- 第一季风后 5 分钟的理想压缩程度。
- 第一风暴前线的目标出现时间。
- 第一次气候改写的目标出现时间。
- `1e308` 终局目标时长建议。
- 当前最该削弱的 3 个指数来源。
- 当前最该抬高成本的 3 个升级。
- 模拟策略还缺哪类玩家行为。
