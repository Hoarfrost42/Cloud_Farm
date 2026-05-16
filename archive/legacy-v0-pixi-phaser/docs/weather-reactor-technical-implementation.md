# Weather Reactor 技术实现说明

更新时间：2026-05-15  
当前经济版本：`Batch 1 / economy v11`

## 代码结构

当前经济核心已经从 `App.tsx` 抽到 `src/game/economy`：

| 文件 | 职责 |
|---|---|
| `constants.ts` | 版本号、资源标签、倍率常量、云层等级表、雨阶需求表、季风目标 |
| `types.ts` | 资源、升级、状态、定义类型 |
| `state.ts` | 初始状态、存档归一化、资源加减、云层等级同步、永久升级即时效果 |
| `formulas.ts` | 点击、被动收益、生产者链、倍率公式 |
| `upgrades.ts` | 本轮升级定义、升级分组、可见性、成本和文案 |
| `resets.ts` | 雨阶 reset、雨阶需求、季风 reset 条件、云核获取、天空心脏进度 |
| `tick.ts` | 主循环结算、自动点击、自动雨阶 |
| `format.ts` | 数字、大数、倍率、成本和缺口展示 |
| `index.ts` | 统一导出 |

`App.tsx` 目前主要负责：

- 连接 React 状态和经济函数。
- 处理按钮事件。
- 渲染左侧摘要、中间主操作区、右侧升级区。
- localStorage 存档读写。

## 状态模型

核心状态是 `WeatherReactorState`：

```ts
interface WeatherReactorState {
  resources: {
    weather: number;
    droplets: number;
    roots: number;
    clouds: number;
  };
  upgrades: Record<UpgradeId, number>;
  cloudLevel: number;
  rainRanks: number;
  cloudCores: number;
  totalCloudCores: number;
  monsoonCycles: number;
  skyHeartAwakened: boolean;
  permanentUpgrades: PermanentUpgradeId[];
  clickCooldownRemaining: number;
  bestWeather: number;
  elapsedSeconds: number;
}
```

所有经济状态都在 TypeScript 对象里，不放在 CSS、DOM 或动画对象里。

## Tick 流程

游戏每 `250ms` 运行一次：

```text
calculateRates(state)
-> resources += rates * seconds
-> clickCooldownRemaining -= seconds
-> syncCloudUnlocks()
-> 如果有云层自触且冷却结束，applyCloudTouch()
-> 如果有自动雨阶且满足条件，performRainRankReset()
```

暂停按钮会停止 interval，但不改变存档状态。

## 点击流程

```text
如果冷却结束
-> getCloudTouchAmount(state)
-> weather += amount
-> clickCooldownRemaining = 2s
-> syncCloudUnlocks()
```

当前冷却升级已经隐藏，冷却固定为 `2s`。

## Reset 流程

### 雨阶 reset

`performRainRankReset()`：

- 雨阶 +1。
- 重建本轮初始状态。
- 保留云核、总云核、季风次数、永久升级、天空心脏状态、时间。
- 如果拥有 `rainRankMastery`，保留第一组本轮升级。

### 季风 reset

季风条件：

```text
weather >= getMonsoonWeatherTarget(state)
rainRanks >= 10
windEye > 0
```

云核收益：

```text
baseGain = floor((weather / target) ^ (1 / 3))
rankBonus = floor(max(0, rainRanks - 10) / 10)
lensBonus = monsoonLens ? 1 : 0
cloudCoreGain = max(1, baseGain + rankBonus + lensBonus)
```

## 存档

当前存档 key：

```text
cloud-island-weather-reactor-v11
```

存档保存在 localStorage。`normalizeState()` 会防御旧存档或非法字段，但没有正式 migration 层。

## 数字展示

普通模式：

- 小数尽量收敛成整数或 0.5 步进。
- `>= 1e6` 使用科学计数法，例如 `1e20`、`2.51e27`。

精确模式：

- 小于 `1e6` 最多显示 3 位小数。
- 大于等于 `1e6` 使用 6 位有效小数科学计数法。

当前仍使用 JS `number`。如果后续要做更长线内容，需要引入 Decimal 类库，或者先封装一个 `GameNumber` 适配层。

## 模拟脚本

| 脚本 | 用途 |
|---|---|
| `npm run simulate:weather-strategies` | 跑多种策略，比较雨阶和季风时间 |
| `npm run simulate:weather` | 跑顺序购买策略，输出关键事件和检查点 |
| `npm run simulate:ten-minute` | 旧 v0.1 种田路线残留，不代表当前天气反应堆主线 |

## 当前耦合风险

1. `upgrades.ts` 仍包含隐藏升级 `cooldownDraft`，类型和存档中还存在，但 UI 不显示。
2. `formulas.ts` 中天气活力把 `dropletSeedRate + droplets` 相加，这是主题上合理的生产链，但会让“总收益倍率”不适合作为升级描述。
3. `App.tsx` 仍承担大量 UI 和事件逻辑，后续若继续扩大，需要拆出更小组件。
4. 自动化组的部分升级已经在定义中，但季风后曲线仍未经过完整平衡。
5. 模拟策略过于机械，不能代表熟练玩家，特别是玩家会主动延迟 reset 或集中买某条生产链。

## 建议下一轮技术方向

先不要继续堆功能。下一轮应把经济做成更可调的配置：

```text
src/game/economy/content/
  cloudLevels.ts
  rainRanks.ts
  runUpgrades.ts
  permanentUpgrades.ts
  milestones.ts
```

然后让模拟脚本直接输出：

- 每次雨阶用时。
- 每个升级购买时间。
- 每个资源每秒增长。
- 当前瓶颈资源。
- 玩家点击次数估计。
