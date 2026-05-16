# 《云上小岛》持续交接文档

## 维护规则

后续每轮任务结束后都更新本文件，作为新窗口或下一个开发者恢复上下文的入口。

更新时至少补充：

- 本轮目标
- 改动文件
- 验证命令和结果
- 当前仍存在的问题
- 下一轮建议

除非用户明确要求，交接信息优先写入本文件，不再散落在聊天里。

## 项目状态

项目：Cloud Island / 云上小岛

当前阶段：已切到“2D 云岛放置经营闭环验证版 v0.1”；伪 2.5D / Phaser 网格岛路线已归档；当前优先验证轻量 2D 格子放置经营闭环。

## 本轮任务：v10 移除冷却路线并修正雨阶反馈

日期：2026-05-15

目标：

- 删除存在感弱且语义混乱的 `冷却气流` 可见升级。
- 修复点击收益中隐藏的冷却乘区，避免 `125 -> 126 -> 630` 这种玩家无法推导的显示。
- 提高第一次雨阶的心理反馈，避免 `3M` reset 只换 `x1.25`。
- 明确数字飞速增长的后续渲染策略，但本轮不做 UI 大改。

本轮改动文件：

- `src/game/economy/constants.ts`
- `src/game/economy/formulas.ts`
- `src/game/economy/upgrades.ts`
- `src/game/economy/state.ts`
- `src/game/economy/resets.ts`
- `src/App.tsx`
- `scripts/simulate-weather-strategies.mjs`
- `scripts/simulate-weather-reactor.mjs`
- `docs/weather-reactor-reference-research-and-architecture.md`
- `docs/cloud-island-handoff.md`

完成内容：

- 存档 key 升为 `cloud-island-weather-reactor-v10`，版本标签显示 `Batch 1 / economy v10`。
- `冷却气流` 不再出现在升级组，也不再被模拟脚本购买。
- `getClickCooldownSeconds()` 固定返回基础 `2s`，点击收益不再受冷却等级影响。
- `getCloudTouchAmount()` 删除隐藏的 `cooldownMultiplier`，点击显示只由：
  - `基础点击`
  - `云层触碰 x5`
  - `雨阶全局乘区`
  - `厚云降雨 x10`
  共同决定。
- 雨阶倍率从 `1.25^rainRank` 改为：

```text
weatherMultiplier = 1 + rainRank
```

  第一雨阶直接 `x2`，12 雨阶为 `x13`，首阶反馈更强，后段不爆炸。
- `雨势增幅` 文案改为“额外天气乘区”，避免玩家误以为它是某个隐藏基础值的替换。
- 为了抵消首阶 `x2` 带来的加速，后段曲线同步上移：
  - `雨滴生成 / 云层触碰 / 雨势增幅` 的序列后增长更陡。
  - `厚云降雨` 改为 `1Qa` 起步，单级倍率从 `x10` 降到 `x3`。
  - 第一次季风目标改为 `1Oc`。

当前模拟结果：

```text
early-click-auto  passive 0:31 | rank 1/3/6/8/12 5:47 / 11:23 / 21:42 / 40:43 / 115:16 | monsoon 156:21
auto-rush         passive 0:31 | rank 1/3/6/8/12 14:53 / 44:27 / never / never / never | monsoon never
producer-chain    passive 0:31 | rank 1/3/6/8/12 5:47 / 11:23 / 21:42 / 40:22 / 114:00 | monsoon 154:48
value-greedy      passive 0:31 | rank 1/3/6/8/12 5:27 / 10:26 / 18:22 / 103:58 / 267:21 | monsoon 304:21
full-route sim    6 小时内完成 2 次季风循环，未到天空心脏。
```

当前观察：

- 第一雨阶仍偏早，约 5-6 分钟，但首阶 `x2` 反馈明确。
- 纯雨滴路线被压住，6 小时内卡在 5 雨阶附近。
- 生产者链和常规路线第一次季风约 2.5 小时，比较接近“几小时小品”的当前方向。
- 贪心策略约 5 小时才季风，说明策略函数仍不代表熟练玩家，但能继续用来抓极端路线。

当前数字渲染策略观察：

- 现在游戏是 `250ms` 一次 React state tick，数字直接跳到新值。
- 这会显得像“表格在刷新”，不会像经典增量游戏那样有连续飞涨感。
- 后续建议单独加一层 display interpolation：
  - 经济状态继续用固定 tick 保持稳定。
  - UI 显示值用 `requestAnimationFrame` 向真实值插值。
  - 高增长阶段给资源卡和中心按钮加短促数字 pop，而不是提高经济 tick 频率。

下一轮建议：

- 先试玩 v10，确认 `x(1 + 雨阶)` 的第一雨阶反馈是否舒服。
- 如果第一次季风变太快，优先上调雨阶表后段或季风目标，不要把雨阶首阶反馈降回 `x1.25`。
- 数字飞速增长动效独立成 UI 批次，不和经济曲线一起改。

## 本轮任务：落实 v9 成本序列、雨阶/季风曲线和模拟工具

日期：2026-05-15

目标：

- 回应“成本 `10^n` 与收益 `4^n` 脱节”的试玩反馈，把核心升级成本改为可直接调表的漂亮数量级序列。
- 按策划文档继续收束基础路线：云层等级只负责披露，雨阶负责小 reset 与全局倍率，生产者链负责中段增长，云核负责压缩旧流程。
- 让后续迭代尽量只调数值表，而不是继续在 UI 和公式里散改。

本轮改动文件：

- `src/game/economy/types.ts`
- `src/game/economy/constants.ts`
- `src/game/economy/format.ts`
- `src/game/economy/upgrades.ts`
- `src/game/economy/state.ts`
- `src/game/economy/resets.ts`
- `src/App.tsx`
- `scripts/simulate-weather-strategies.mjs`
- `scripts/simulate-weather-reactor.mjs`
- `docs/cloud-island-handoff.md`

完成内容：

- 存档 key 升为 `cloud-island-weather-reactor-v9`，页面标题显示 `Batch 1 / economy v9`，避免旧存档继续污染试玩。
- `UpgradeDefinition` 新增 `costSequence`：
  - 早期成本直接写成 `10 / 30 / 100 / 300 / 1K / 3K / 10K...` 这类序列。
  - 序列用完后再回落到 `baseCost * costGrowth^level`。
  - 以后调曲线优先调 `costSequence` 和少量倍率常量。
- 重写核心升级成本节奏：
  - `云层触碰`：`10 / 100 / 1K / 10K / 100K`，后续 `x10`。
  - `雨滴生成`：`30 / 100 / 300 / 1K / 3K / 10K`，后续 `x8`，避免 `4^收益` 长期碾压成本。
  - `雨势增幅`：`10K / 30K / 100K / 300K / 1M / 3M`，后续 `x5`。
  - `根系 / 云团 / 风眼` 使用 1-3-10 数量级序列，后续增长高于收益倍率，避免生产链后段溢出。
  - `厚云降雨` 推迟到 `100T` 起步，作为 12 雨阶前后的爆发升级，而不是 8 雨阶立即平推。
- 雨阶门槛上移并拉开后段平台：
  - 从 `3M` 起步，后段进入 `1T / 10T / 100T / 1Qa / 10Qa...`。
  - 纯 `点击 + 雨滴生成` 策略在 6 小时内卡在 8 雨阶，不能一路平推到季风。
- 季风目标改为 `1Sp` 起步，云核收益改为 `(weather / target)^(1/3)`，保证第一次季风主要给 1 云核。
- 云核天赋效果集中：
  - `初雨记忆` 立即给当前轮 1 雨阶。
  - `雨滴余响` 立即保留 `雨滴生成 Lv.1`。
  - `凝雨熟练` 保留第一组本轮升级的基础等级。
- 修正 UI / 逻辑：
  - `季风循环` 的可执行状态也检查 `风眼牵引`。
  - `云团孕育 / 风眼牵引` 的下一目标进度不再错误读取已移除的副资源成本。
  - 大数显示补到 `Qa / Qi / Sx / Sp / Oc`，避免中后段全部挤成科学计数法。
- 模拟脚本改进：
  - `simulate-weather-strategies.mjs` 输出每种策略的购买次数摘要。
  - `simulate-weather-reactor.mjs` 会在雨阶 reset 前优先买生产链首级，且不再重复刷同一升级日志。

当前模拟结果：

```text
early-click-auto  passive 0:31 | rank 1/3/6/8/12 5:51 / 14:50 / 23:26 / 27:13 / 33:13 | monsoon 47:06
auto-rush         passive 0:31 | rank 1/3/6/8/12 9:47 / 32:20 / 100:51 / 257:21 / never | monsoon never
producer-chain    passive 0:31 | rank 1/3/6/8/12 5:51 / 14:50 / 23:09 / 27:00 / 33:18 | monsoon 48:37
value-greedy      passive 0:31 | rank 1/3/6/8/12 4:37 / 11:28 / 40:30 / 65:27 / 113:23 | monsoon 114:33
full-route sim    天空心脏约 305:02，约 5 小时 5 分
```

当前观察：

- 主动熟练路线第一次季风仍偏快，约 45-50 分钟；保守/贪心路线约 1.9 小时。
- 纯雨滴路线已经被压住，不能在 6 小时内到 12 雨阶。
- `value-greedy` 购买次数异常高，说明 ROI 策略还不是“正常玩家策略”，但可以继续用来抓结构漏洞。
- 这版可以进入试玩，下一轮优先根据玩家实际体感调 `costSequence`、雨阶表和季风目标。

验证结果：

- `npm run typecheck`：通过。
- `npm run simulate:weather-strategies`：通过。
- `npm run simulate:weather`：通过。
- `npm run build`：通过。

## 本轮任务：按架构文档落地 Batch 1 基础数值路线

日期：2026-05-15

目标：

- 按 `weather-reactor-reference-research-and-architecture.md` 的推荐基础路线，把当前玩法从“旧数值接线”推进到“新版 8 个本轮升级 + 干净成本锚点”。
- 保持云层等级只做自动披露，雨阶只做小 reset 与 `x1.25^雨阶` 天气活力倍率。
- 让模拟脚本输出关键里程碑，方便后续继续调曲线。

本轮改动文件：

- `src/game/economy/types.ts`
- `src/game/economy/constants.ts`
- `src/game/economy/formulas.ts`
- `src/game/economy/upgrades.ts`
- `scripts/simulate-weather-strategies.mjs`
- `scripts/simulate-weather-reactor.mjs`
- `docs/cloud-island-handoff.md`

完成内容：

- 存档 key 升为 `cloud-island-weather-reactor-v8`，避免旧曲线存档继续污染试玩。
- 本轮核心升级对齐文档的 8 个主升级：
  - `云层触碰`：`10 * 10^level`，点击收益 `x5`。
  - `雨滴生成`：`30 * 10^level`，基础天气增长 `+1 * 4^(level-1)/秒`。
  - `冷却气流`：`1K * 10^level`，点击 CD `-0.1s`。
  - `雨势增幅`：`10K * 10^level`，天气活力收入 `x2`。
  - `根系苏醒`：`1M * 10^level`，雨滴增长 `+1 * 3^(level-1)/秒`。
  - `云团孕育`：`100M * 10^level`，根系增长 `+1 * 3^(level-1)/秒`。
  - `风眼牵引`：`1B * 10^level`，云团增长 `+1 * 2^(level-1)/秒`。
  - `厚云降雨`：`10B * 10^(level^1.25)`，天气活力和点击收益 `x10`。
- 移除早期核心升级的副资源购买门槛：
  - `云团孕育` 不再要求雨滴。
  - `风眼牵引` 不再要求根系。
  - `厚云降雨` 不再要求雨滴。
- 生产链公式改成更干净的嵌套生产：
  - 雨滴推动天气活力。
  - 根系推动雨滴。
  - 云团推动根系。
  - 风眼推动云团。
- 自动化组延后到第一次季风循环后再出现，避免 12 雨阶前右栏再次膨胀。
- 升级描述改为更明确的买后规则：
  - `点击注入的天气活力变为原来的 X 倍。`
  - `根系每秒生成雨滴变为原来的 X 倍。`
- `simulate-weather-strategies.mjs` 改为 6 小时窗口，并输出：
  - first passive
  - rank 1 / 3 / 6 / 8 / 12
  - first monsoon
  - final bottleneck
- `simulate-weather-reactor.mjs` 现在记录 6、8 雨阶关键事件。

多策略模拟结果：

```text
early-click-auto  passive 0:31 | rank 1 16:21 | rank 3 59:44 | rank 6 138:29 | rank 8 192:34 | rank 12 274:21 | monsoon 310:45
auto-rush         passive 0:31 | rank 1 14:23 | rank 3 52:15 | rank 6 135:02 | rank 8 210:34 | rank 12 never | monsoon never
producer-chain    passive 0:31 | rank 1 16:21 | rank 3 59:44 | rank 6 155:31 | rank 8 216:44 | rank 12 306:49 | monsoon 347:40
value-greedy      passive 0:31 | rank 1 20:51 | rank 3 172:33 | rank 6 never | rank 12 never | monsoon never
```

验证结果：

- `npm run typecheck`：通过。
- `npm run simulate:weather-strategies`：通过。
- `npm run simulate:weather`：通过。
- `npm run build`：通过。
- headless Chrome 页面检查：通过，`#root` 正常渲染且无运行时错误。

当前观察：

- 第一雨阶约 14-16 分钟，接近文档目标上沿。
- 生产链路线可在约 4.5-5.8 小时到第一次季风。
- 纯 `雨滴生成` 冲刺会卡在 10 雨阶附近，说明生产链已经开始承担必要路线价值。
- `value-greedy` 目前仍很弱，说明策略评估函数还不能代表真实玩家，需要下一轮继续优化模拟策略。

## 本轮任务：修复 Vite React 运行时白屏

日期：2026-05-15

目标：

- 修复 `http://127.0.0.1:5173` 只显示背景、React UI 未渲染的问题。

本轮改动文件：

- `vite.config.ts`
- `docs/cloud-island-handoff.md`

完成内容：

- 通过 headless Chrome + CDP 复现并抓到运行时错误：
  - `Invalid hook call`
  - `TypeError: Cannot read properties of null (reading 'useState')`
- 根因：Vite dev server 的 React 预构建缓存出现了不同 query 版本，`react` 与 `react-dom/client` 没有共享同一个 React 单例，导致 hooks dispatcher 为空。
- 在 Vite 配置中加入：
  - `resolve.dedupe: ["react", "react-dom"]`
  - `optimizeDeps.include: ["react", "react-dom/client"]`
  - `optimizeDeps.force: true`
- 修复后再次用 headless Chrome 验证，`#root` 已正常渲染，页面文本恢复。

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- headless Chrome 复现检查：通过，根节点内容长度从 `0` 恢复到 `4432`。

当前观察：

- 控制台只剩一个非阻塞资源 404，疑似 favicon，不影响 UI 渲染。
- 若后续不希望每次 dev server 都强制预构建依赖，可以在确认缓存稳定后移除 `optimizeDeps.force`。

## 本轮任务：抽离天气反应堆经济内核

日期：2026-05-15

目标：

- 按已评审通过的重构方案，把玩法公式、升级、reset、tick 与显示格式从 `App.tsx` 抽离。
- 让前台游戏和模拟脚本复用同一套经济内核，避免后续调数值时出现两套公式。
- 保持当前玩法曲线不主动大改，为下一轮深度数值设计留下稳定接口。

本轮改动文件：

- `src/App.tsx`
- `src/game/economy/types.ts`
- `src/game/economy/constants.ts`
- `src/game/economy/format.ts`
- `src/game/economy/state.ts`
- `src/game/economy/formulas.ts`
- `src/game/economy/upgrades.ts`
- `src/game/economy/resets.ts`
- `src/game/economy/tick.ts`
- `src/game/economy/index.ts`
- `scripts/simulate-weather-reactor.mjs`
- `scripts/simulate-weather-strategies.mjs`
- `tsconfig.app.json`
- `docs/cloud-island-handoff.md`

完成内容：

- 新增 `src/game/economy/` 纯经济模块：
  - `types.ts`：统一资源、升级、永久升级、游戏状态类型。
  - `constants.ts`：集中维护存档 key、云层阈值、雨阶需求、基础倍率。
  - `formulas.ts`：集中计算点击收益、自动收益、生产者链收益和冷却。
  - `upgrades.ts`：集中升级定义、可见性、成本和效果文案。
  - `resets.ts`：集中雨阶 reset、季风 reset、云核收益和天空心脏进度。
  - `tick.ts`：集中每 tick 增长、冷却推进和自动雨阶。
  - `format.ts`：统一普通显示与小数显示模式。
- `App.tsx` 改为消费经济内核：
  - 删除本地重复的升级定义、公式、reset、tick 和格式化函数。
  - UI 仍保留现有结构，只做必要接线。
  - 暂停、小数显示、云层点击、升级购买、雨阶和季风逻辑继续工作。
- 两个模拟脚本改为同源公式：
  - `simulate-weather-reactor.mjs` 不再动态绕行导入雨阶需求。
  - `simulate-weather-strategies.mjs` 删除旧的复制公式，改为导入 `src/game/economy/index.ts`。
- `tsconfig.app.json` 开启 `allowImportingTsExtensions`，让 TypeScript 与 Node 模拟脚本都能明确复用 `.ts` 经济模块。

验证结果：

- `npm run typecheck`：通过。
- `npm run simulate:weather-strategies`：通过。
- `npm run simulate:weather`：通过。
- `npm run build`：通过。

当前观察：

- 当前同源模拟显示 12 雨阶前曲线偏慢：`simulate:weather-strategies` 的 2 小时窗口内仍未到 12 雨阶。
- 这是继承当前数值后的结果，本轮没有擅自改曲线。
- 下一轮重点应基于新经济内核重设数值表：点击初期反馈、自动化解放双手、雨阶倍率、生产者链切入点、季风目标和云核收益应统一重算。

## 本轮任务：修复生产链数值并补点击/天气倍率升级

日期：2026-05-14

目标：

- 修复第一次雨阶后未买 `雨滴生成` 也有自动天气增长的问题。
- 修复 `根系苏醒` 文案和实际收益不一致的问题。
- 修复 `云团孕育` 显示 `+0.0/秒` 且生产链资源难以获得的问题。
- 调低 `冷却气流` 成本曲线。
- 新增两个经典增量升级：点击翻倍、天气基础增长倍率。

本轮改动文件：

- `src/App.tsx`
- `scripts/simulate-weather-reactor.mjs`
- `scripts/simulate-weather-strategies.mjs`
- `docs/cloud-island-handoff.md`

完成内容：

- 存档 key 升为 `cloud-island-weather-reactor-v5`，避免旧公式存档干扰。
- 雨阶不再直接提供基础天气增长来源：
  - 未购买 `雨滴生成` 且没有雨滴资源时，天气活力自动增长为 `0/秒`。
  - 雨阶仍保留为对已有基础增长的倍率增强。
- `根系苏醒`：
  - 雨滴增长系数从 `0.06` 改为 `0.1`。
  - `Lv.4` 约为 `+0.4 雨滴/秒`。
- `云团孕育`：
  - 根系增长系数从 `0.028` 改为 `0.1`。
  - 不再显示 `+0.0/秒` 这种无意义反馈。
- `风眼牵引`：
  - 云团增长系数从 `0.024` 改为 `0.05`，避免后段同样显示过小。
- `冷却气流`：
  - 起始成本从 `140` 改为 `45`。
  - 成本成长从 `1.78` 改为 `1.35`。
  - 可见门槛从 `140 天气活力 / 2 雨阶` 前移到 `45 天气活力 / 1 雨阶`。
- 新增本轮升级：
  - `云层回响`：点击注入的天气活力变为原来的 `2 倍`，成本成长较陡。
  - `雨势增幅`：天气活力基础增长变为原来的 `1.2 倍`，成本成长较陡。

多策略模拟结果：

```text
current-auto      first rank: 1:56 | rank 12: 46:59 | first monsoon: 78:08
rain-rank-rush    first rank: 1:06 | rank 12: 44:59 | first monsoon: 113:48
droplet-only      first rank: 1:06 | rank 12: 44:59 | first monsoon: 113:48
balanced-run      first rank: 1:56 | rank 12: 43:02 | first monsoon: 65:12
```

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run simulate:weather-strategies`：通过。
- `npm run simulate:weather`：通过。
- `http://127.0.0.1:5173`：HTTP 200。

当前观察：

- 修复后单买 `雨滴生成` 的冲刺路线明显变慢，生产者链路线更有价值。
- 第一次季风仍偏长，尤其 `rain-rank-rush` 和 `droplet-only` 已经不适合作为目标路线。
- 下一轮若继续调数值，应优先让 `balanced-run` 更早进入第一次季风，而不是再加强雨阶本身。

## 本轮任务：修复点击收益耦合与升级可见性

日期：2026-05-14

目标：

- 修复购买 `雨滴生成` 后，单次点击收益从 2 跳到 6 的问题。
- 修复 `冷却气流` 已购买后，资源跌破解锁门槛时卡片又消失的问题。

问题定位：

- `getCloudTouchAmount()` 原本把 `getPassiveWeatherGain(state) * 2.2` 加进点击收益。
- 因此 `雨滴生成 Lv.1` 带来的 `+2/秒` 被折算进单次点击，导致点击收益异常增加。
- `isUpgradeVisible()` 只检查解锁门槛，没有检查该升级是否已经购买，导致资源下降时已买升级又被隐藏。

本轮改动文件：

- `src/App.tsx`
- `scripts/simulate-weather-reactor.mjs`
- `scripts/simulate-weather-strategies.mjs`
- `docs/cloud-island-handoff.md`

完成内容：

- 点击收益公式改为只受：
  - 基础点击值。
  - `云层触碰`。
  - `厚云降雨` 点击倍率。
  - `冷却气流` 的轻量联动倍率。
- `雨滴生成` 只影响每秒天气活力，不再影响单次点击。
- 所有渐进式披露升级增加“已购买则保持可见”的规则，避免资源消费后卡片闪退。
- 两个模拟脚本同步点击收益公式和可见性规则。

验证结果：

- `npm run simulate:weather-strategies`：通过。
- `npm run simulate:weather`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `http://127.0.0.1:5173`：HTTP 200。

当前观察：

- 修复后整体节奏明显变慢：
  - `current-auto` 第一次季风约 `112:10`。
  - `rain-rank-rush` 第一次季风约 `84:36`。
- 这是预期副作用，因为原先点击收益吃到了被动增长的错误红利。
- 下一轮如果继续数值调优，应在保持“点击/被动分离”的前提下，提高生产链或降低季风目标，而不是把被动增长重新塞回点击。

## 本轮任务：调整开局升级顺序与成本

日期：2026-05-14

目标：

- 让开局符合经典点击增量节奏：先买点击收益，再解锁自动增长。
- 修正右侧升级一开始显示 `雨滴生成 15`、`云层触碰 20` 导致自动增长优先级看起来更高的问题。

本轮改动文件：

- `src/App.tsx`
- `scripts/simulate-weather-reactor.mjs`
- `scripts/simulate-weather-strategies.mjs`
- `docs/cloud-island-handoff.md`

完成内容：

- `云层触碰`：
  - 起始成本从 `20` 改为 `10`。
  - 成本成长从 `1.48` 改为 `1.55`。
  - 在 `雨阶爬坡` 组中排到第一位。
- `雨滴生成`：
  - 起始成本保持 `15`。
  - 成本成长从 `1.42` 改为 `1.58`。
- 模拟脚本同步升级顺序和成本曲线。

多策略模拟结果：

```text
current-auto      first rank: 1:15 | rank 12: 26:54 | first monsoon: 47:22
rain-rank-rush    first rank: 0:48 | rank 12: 15:38 | first monsoon: 40:44
droplet-only      first rank: 0:52 | rank 12: 16:05 | first monsoon: 41:11
balanced-run      first rank: 1:15 | rank 12: 23:48 | first monsoon: 44:18
```

验证结果：

- `npm run simulate:weather-strategies`：通过。
- `npm run simulate:weather`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `http://127.0.0.1:5173`：HTTP 200。

当前观察：

- 开局现在先导向点击升级，符合 `1 点 / 2s` 的基础节奏。
- 只买雨滴生成的冲刺路线仍存在，但 12 雨阶约 `15-16` 分钟，未重新退回 3 分钟漏洞。
- 第一次季风仍约 `40-47` 分钟，后续如果想做更短小品，应单独压季风目标或提高生产链价值。

## 本轮任务：开局点击、初雨记忆与雨阶批量修正

日期：2026-05-14

目标：

- 修正开局点击数值过大、初始被动增长不为 0 的问题。
- 让 `初雨记忆` 购买后立刻给 1 雨阶，而不是等下一轮。
- 关闭未说明的雨阶批量获得，避免玩家误以为点一次只拿 1 阶却实际拿到多阶。
- 继续提高雨阶需求增长，避免雨滴生成速度明显压过雨阶需求。

本轮改动文件：

- `src/App.tsx`
- `scripts/simulate-weather-reactor.mjs`
- `scripts/simulate-weather-strategies.mjs`
- `docs/cloud-island-handoff.md`

完成内容：

- 开局手感调整：
  - 初始点击收益从约 20+ 改为 `1 天气活力`。
  - 初始被动天气增长改为 `0/秒`。
  - 基础点击 CD 从 `5s` 改为 `2s`。
  - `冷却气流` 每级从减少 `0.45s` 改为减少 `0.1s`。
  - `云层触碰` 每级点击加成从 `+9` 改为 `+1`。
- `初雨记忆`：
  - 购买后立即把当前雨阶至少提升到 `1`。
  - 后续新一轮仍会从 `1 雨阶` 开始。
- 雨阶 reset：
  - 手动/自动凝结雨阶现在一次只增加 `1` 雨阶。
  - 暂时不启用 bulk rain rank，因为 bulk 应该是后续明确 milestone，并需要 UI 提示。
- 雨阶需求：
  - 需求增长从 `1.58` 提高到 `1.68`。
  - 同步模拟脚本。

多策略模拟结果：

```text
current-auto      first rank: 1:05 | rank 12: 24:38 | first monsoon: 45:00
rain-rank-rush    first rank: 0:48 | rank 12: 14:51 | first monsoon: 40:01
droplet-only      first rank: 0:52 | rank 12: 15:27 | first monsoon: 40:37
balanced-run      first rank: 1:05 | rank 12: 22:32 | first monsoon: 42:23
```

验证结果：

- `npm run simulate:weather-strategies`：通过。
- `npm run simulate:weather`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `http://127.0.0.1:5173`：HTTP 200。

当前仍存在的问题：

- 现在开局更克制，但是否“太慢”需要实机重新试玩。
- `雨阶 bulk` 已关闭，后续如果要恢复，必须作为明确里程碑/天赋，并在按钮上显示“本次可获得 X 雨阶”。
- 第一次季风目前约 40-45 分钟，可能仍偏长，但比上一轮更可控。

## 本轮任务：雨阶数值重调与多策略模拟

日期：2026-05-14

目标：

- 处理玩家发现的早期最优解：只买 `雨滴生成`，能凝结雨阶就立刻凝结，可以约 3 分钟到 12 雨阶。
- 不引入软上限，先通过更难受的数值增长和拆分雨阶收益来压住单路线。
- 增加多策略模拟脚本，避免只用一种“笨自动购买策略”误判曲线。

本轮改动文件：

- `src/App.tsx`
- `scripts/simulate-weather-reactor.mjs`
- `scripts/simulate-weather-strategies.mjs`
- `package.json`
- `docs/cloud-island-handoff.md`

完成内容：

- 雨阶收益不再是单一爆炸倍率：
  - 原逻辑近似：`(rainRanks + 1) ^ 1.25/1.45`。
  - 新逻辑拆为：
    - 雨阶提供少量基础雨滴生产力。
    - 雨阶提供温和线性天气加成。
    - 雨阶提供一段较弱的曲线天气加成。
- 雨阶需求增长从 `1.52` 提高到 `1.58`。
- `rankCompression` 仍会降低雨阶需求增长，但幅度改为每级 `0.025`，下限 `1.24`。
- 新增脚本：
  - `npm run simulate:weather-strategies`
  - 覆盖策略：
    - `current-auto`：当前模拟的固定顺序自动购买。
    - `rain-rank-rush`：玩家漏洞策略，能雨阶就雨阶，只买雨滴生成。
    - `droplet-only`：只买雨滴生成，但买完才雨阶。
    - `balanced-run`：前 12 雨阶买早期四项，之后转生产链。

多策略模拟结果：

```text
current-auto      rank 12: 19:38 | first monsoon: 48:29
rain-rank-rush    rank 12: 12:56 | first monsoon: 56:31
droplet-only      rank 12: 13:09 | first monsoon: 56:44
balanced-run      rank 12: 18:20 | first monsoon: 46:56
```

验证结果：

- `npm run simulate:weather-strategies`：通过。
- `npm run simulate:weather`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `http://127.0.0.1:5173`：HTTP 200。

当前仍存在的问题：

- 早期漏洞已被压住，但第一次季风循环被推到约 47-56 分钟，可能偏长。
- 现在的“最优策略”和“均衡策略”差距不大，这是好事；但第一小时节奏需要单独再调。
- 如果要让第一次季风回到约 25-35 分钟，应优先调 `BASE_MONSOON_WEATHER_TARGET` 或提高 12 雨阶后的生产链价值，而不是再放大雨阶本身。

下一轮建议：

- 专门调 `12 雨阶 -> 第一次季风` 这一段。
- 目标可以设为：
  - 漏洞策略 12 雨阶不低于 10 分钟。
  - 均衡策略第一次季风约 30-40 分钟。
  - 雨滴单升路线能跑，但不是最快季风路线。

## 本轮任务：修正雨阶 reset 规则

日期：2026-05-14

目标：

- 修复 `凝结雨阶` 只清空天气活力、不清空右侧本轮升级的问题。
- 让所有 reset 都符合增量游戏直觉：重置本层内容，只保留更高层进度或本次 reset 产物。

问题定位：

- `performRainRankReset()` 原本只把 `resources.weather` 置为 0。
- 右侧升级、雨滴、根系、云团都被保留下来，导致玩家能在保留全部生产能力的情况下连续凝结多次雨阶。
- 这让雨阶从“reset”变成了“免费倍率叠加”，破坏了基础路线。

本轮改动文件：

- `src/App.tsx`
- `scripts/simulate-weather-reactor.mjs`
- `docs/cloud-island-handoff.md`

完成内容：

- `performRainRankReset()` 改为真正重开当前轮：
  - 清空天气活力、雨滴、根系、云团。
  - 清空本轮升级。
  - 清空点击冷却。
  - 保留并更新雨阶。
  - 保留云核、累计云核、季风循环次数、永久天赋、天空心脏状态。
  - 永久天赋仍会按规则给新一轮起始加成，例如 `云锚` 给 `雨滴生成 Lv.1`。
- 存档 key 从 `cloud-island-weather-reactor-v2` 升到 `cloud-island-weather-reactor-v3`，避免旧测试存档继续保留错误升级状态。
- 模拟脚本同步雨阶 reset 规则。

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run simulate:weather`：通过。
- `http://127.0.0.1:5173`：HTTP 200。

模拟观察：

- 第一次季风循环从原先约 3-4 分钟延后到约 `14:44`。
- 这是雨阶真正重置升级后的预期变化，说明原先曲线确实吃到了“升级不重置”的错误红利。

当前仍存在的问题：

- 经济曲线需要重新调。修正 reset 规则后，早期可能偏慢，尤其是反复重买基础升级会产生疲劳。
- `自动雨阶` 作为本轮升级会在雨阶 reset 后被清掉，功能意义偏弱。后续更合理的做法可能是把它上移为季风/云核天赋或雨阶里程碑。
- 模拟脚本现在能跑通，但 3 小时内未到天空心脏，需要重新确定“基础路线版”的目标时长。

下一轮建议：

- 先重新调第一小时：第一次雨阶、第一次 12 雨阶、第一次季风循环。
- 再决定 `自动雨阶` 是保留为本轮短效升级，还是移动到云核天赋。
- 控制早期重复重买的疲劳：可以降低基础升级成本、增加雨阶起始奖励，或做雨阶里程碑保留少量低层自动化。

## 本轮任务：基础增量路线重构

日期：2026-05-14

目标：

- 先把经典增量游戏的基础路线做好，再考虑 Cloud Island 的主题创新。
- 把当前玩法收束为一根清晰主柱：`天气活力`。
- 加入小 reset、大 reset、嵌套生产者链和终局目标，形成可持续几小时的试玩骨架。

设计判断：

- 当前轮先不做天气预报、气压、天气器官、挑战、卡牌、地块规划等创新玩法。
- 参考《质量增量》的早期结构：主资源自动增长，小 reset 压缩主资源，生产者链嵌套，第一次大 reset 立刻给 1 个升级点。
- Cloud Island 映射为：
  - `天气活力 = Mass`
  - `雨阶 = Rank`
  - `雨滴 / 根系 / 云团 / 风眼 = 生产者链`
  - `季风循环 = Rage Power reset`
  - `云核天赋 = 大 reset 升级`
  - `天空心脏 = 当前版本终局`

本轮改动文件：

- `src/App.tsx`
- `scripts/simulate-weather-reactor.mjs`
- `docs/cloud-island-handoff.md`

完成内容：

- `src/App.tsx` 重构为天气活力基础路线：
  - 主资源：`天气活力`。
  - 生产者链：`雨滴 -> 天气活力`、`根系 -> 雨滴`、`云团 -> 根系`、`风眼 -> 云团`。
  - 小 reset：`雨阶`，消耗当前天气活力并提高后续天气活力倍率。
  - 大 reset：`季风循环`，要求天气活力和雨阶达标，重置当前轮并获得 `云核`。
  - 永久升级：`初雨记忆`、`云锚`、`活土`、`季风透镜`。
  - 终局：累计季风循环和云核后唤醒 `天空心脏`。
- 右侧升级组调整为：
  - `I 雨阶准备`
  - `II 天气生产链`
  - `III 自动化`
  并继续使用渐进式披露。
- 升级文案保持规则式表达，例如“增加 9 点击注入的天气活力”“雨滴基础唤醒量增加 2”。
- `scripts/simulate-weather-reactor.mjs` 同步为新基础路线模拟脚本。
- 终局目标从 `42 云核` 调整为 `26 云核`，避免基础小品原型被拉到过长。
- 模拟脚本事件日志改为关键节点输出，后续调数值时更容易读。

模拟结果：

```text
3:42   第 1 次季风循环，+1 云核，总云核 1
9:00   第 2 次季风循环，+1 云核，总云核 2
15:54  第 3 次季风循环，+2 云核，总云核 4
24:43  第 4 次季风循环，+2 云核，总云核 6
37:26  第 5 次季风循环，+2 云核，总云核 8
54:11  第 6 次季风循环，+4 云核，总云核 12
76:20  第 7 次季风循环，+4 云核，总云核 16
106:30 第 8 次季风循环，+5 云核，总云核 21
140:54 第 9 次季风循环，+5 云核，总云核 26，天空心脏苏醒
```

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run simulate:weather`：通过。

当前仍存在的问题：

- 当前是理想化自动购买模拟，实机玩家会因为选择、阅读和等待节奏产生偏差。
- UI 文案和布局虽然已跟随新路线调整，但还没有做浏览器截图级视觉复查。
- 第一小时后的平台期是否“有目标但不枯燥”需要试玩验证。
- 当前中心小岛仍偏抽象，下一轮应优先让岛屿根据雨阶、季风、天空心脏进度改变状态，而不是继续堆新系统。

下一轮建议：

- 先开本地页面试玩 15-30 分钟，记录第一次雨阶、第一次季风、第一次永久升级、自动化出现的真实体感。
- 如果前 10 分钟太碎，就减少早期雨阶频率或把部分早期升级合并。
- 如果 60 分钟后太平，就在不新增资源的前提下补一个“季风里程碑”层，强化每次大 reset 后的新目标。

## 本轮任务：IMR 源码研究与天气增量创新方向

日期：2026-05-14

目标：

- 根据 `Incremental Mass Rewritten` 源码拆解其主流程、reset 层、升级解锁和 UI 披露。
- 将用户关于 Mass / Rank / Rage Power / Atom 解锁链的游玩感受沉淀为 Cloud Island 玩法方向。
- 重点记录经典玩法之外，Cloud Island 可基于“天气复苏”主题发展的创新玩法。

本轮改动文件：

- `docs/imr-source-study-weather-incremental-design.md`
- `docs/cloud-island-handoff.md`

完成内容：

- 新增 IMR 源码研究文档，记录读取到的关键源码模块：
  - `js/saves.js`
  - `js/main.js`
  - `js/ranks.js`
  - `js/buildings.js`
  - `js/upgrades.js`
  - `js/resources.js`
  - `js/tabs.js`
  - `js/atom.js`
  - `js/supernova/supernova.js`
  - `js/quantum/quantum.js`
- 确认 IMR 早期核心结构：
  - `Mass` 自动增长。
  - `Rank` 作为第一层小 reset。
  - `Muscler / Booster / Stronger` 形成嵌套生产链。
  - 第一次 `Rage Power` 大 reset 稳定引导玩家购买第一个 1 RP 升级。
  - `Rage Upgrades` 主要承担压缩旧流程、自动化、免重置和跨层反哺。
- 建议 Cloud Island 下一版核心映射：
  - `天气活力 = Mass`
  - `雨阶 = Rank`
  - `根系 / 云团 / 风眼 = Muscler / Booster / Stronger`
  - `季风循环 = Rage Power reset`
  - `云核升级 = Rage Upgrades`
  - `天空心脏长链 = Atom 解锁链`
- 记录主题创新方向：
  - 天气器官。
  - 天气预报作为每轮轻量选择。
  - 气压作为 softcap 的主题化表达。
  - 季风 reset 仪式。
  - 旧轮天气留下气候性格。
  - 中央岛面只表现复苏阶段，侧栏承载数值。

验证结果：

- 文档已写入并可用 UTF-8 正常读取。
- 本轮未改代码，未运行构建。

下一轮建议：

- 若继续玩法重构，优先把当前 `雨水 / 生命力 / 蒸腾 / 云层` 并排资源重构为 `天气活力 + 生产者链 + 雨阶小 reset`。
- 第一次季风循环必须稳定给 1 云核，并保证 1 云核能立刻买到压缩前期的升级。
- 不要先做复杂天气卡牌、地块规划或多层树 UI。

## 本轮任务：收敛点击层升级与提前自动细雨

日期：2026-05-14

目标：

- 修正点击层同时出现两个固定点击雨量升级的问题。
- 降低自动细雨的首次进入成本，让点击层更早走向半自动。

设计判断：

- 固定点击雨量只保留一个基座升级：`云层触碰`。
- `云层握持` 从本轮可见升级列表移除，旧存档字段保留但不再参与点击公式。
- 点击层后续职责应转为：缩短回拢、倍率放大、自动获得，而不是继续堆固定数值。
- 自动细雨应承担“点击开始半自动化”的第一步，成本不应晚到玩家已经进入天气闭环后才感觉值得买。

本轮改动文件：

- `src/App.tsx`
- `scripts/simulate-weather-reactor.mjs`
- `docs/cloud-island-handoff.md`

完成内容：

- `云层点击` 升级组从 5 个升级收敛为 4 个：
  - `云层触碰`
  - `冷却气流`
  - `厚云降雨`
  - `自动细雨`
- `getCloudTouchAmount()` 移除 `cloudGrip` 固定加成。
- `isUpgradeVisible()` 中 `cloudGrip` 永远不再可见。
- `自动细雨` 成本从 `180 雨水 + 60 生命力` 降为 `90 雨水 + 24 生命力`。
- `自动细雨` 成长系数从 `1.9` 降为 `1.7`。
- 模拟脚本同步移除 `cloudGrip` 购买项与点击公式。

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run simulate:weather`：通过。
- 当前模拟中 `自动细雨 Lv.1` 出现在约 `2:14`，比原先更适合承担第一段半自动化。
- 当前模拟中终局约 `43:43` 达成，删除 `云层握持` 后整体时长仍在可试玩范围内。

当前仍存在的问题：

- `cloudGrip` 仍保留在类型和存档兼容字段里，后续如果确认彻底废弃，可做一次存档版本迁移再删类型。
- 本轮只修局部成本，完整曲线还需要结合经典增量游戏的“升级分页、里程碑、reset 奖励、层级自动化”继续重排。

## 本轮任务：固定卡片与升级预期文案

日期：2026-05-14

目标：

- 将云层回拢状态从跳动秒数改为固定进度条。
- 将升级描述改为“本次购买会怎样改变数值”的直接规则。
- 固定资源卡、升级卡、目标卡等主要卡片高度和数字列宽，减少 UI 抽搐。

设计判断：

- 动态状态优先进入进度条，不用变化长度的文字撑开布局。
- 升级卡不再同时显示“描述句 + 当前值到下一级值”，避免右侧信息过重。
- 升级效果写成玩家可预期的规则，例如“增加 5 点击落下的雨水量”“效率变为原来的 1.2 倍”。
- 后续中心区域可以随阶段做空岛复苏动画，但侧边卡片应保持稳定。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

完成内容：

- 云层点击按钮新增固定宽度回拢进度条，冷却时不再显示 `4.3s / 4.5s` 这类跳动文本。
- 本轮升级卡正文改为动态规则文案：
  - 固定加成：显示“增加 X 点击落下的雨水量”。
  - 倍率加成：显示“变为原来的 X 倍”。
  - 转化类升级：显示“每秒将 X% 转为下一资源”或“效率提高 X%”。
- 移除升级卡中原先额外的 `当前值 -> 下一级值` 效果预览行。
- 固定资源卡高度、数字列宽、收益列宽，并使用等宽数字，降低生命力等资源跳数时的视觉抖动。
- 固定升级卡高度，并对长文案做两行截断。

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。

当前仍存在的问题：

- 冷却缩短升级目前没有等级上限，达到 1.5 秒下限后继续购买会变成低收益甚至无收益，后续应补 max level 或自动隐藏。
- 资源卡不再因数字变化撑高，但超大数值目前用省略处理，后续可接入统一大数格式。

## 本轮任务：完整目标、数值长度与简洁美术迭代

日期：2026-05-14

目标：

- 借鉴 `Idle Poly Jump` 的简洁美术语言：硬边卡片、触感按钮、清晰数值、可读状态填充。
- 继续吸收《质量增量》的核心经验：前期增长快，中期有平台期，后期有明确可期待目标。
- 做出一个更适合试玩的完整版本，而不是继续堆零散升级。

设计判断：

- 不吸收 `Idle Poly Jump` 的卡牌、抽卡、装备、分解系统；这些会让 Cloud Island 过早变复杂。
- 吸收它的 UI 优点：界面像游戏道具而不是普通表单，按钮有明确按压感，目标/进度条承担引导。
- 终局目标采用 `天空心脏`，让玩家知道自己不是无尽刷数，而是在把空岛天气系统彻底唤醒。
- 使用模拟脚本调第一轮曲线：允许前期较快 reset，但用多轮季风循环和云核记忆拉长中期。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `package.json`
- `scripts/simulate-weather-reactor.mjs`
- `docs/cloud-island-handoff.md`

完成内容：

- 新增终局目标：
  - `天空心脏`
  - 条件：完成 7 次季风循环，并累计凝结 42 云核记忆。
  - 达成后可点击“唤醒”，进入当前版本完成态。
- 新增长期进度字段：
  - `totalCloudCores`
  - `skyHeartAwakened`
- 左侧摘要改为显示 `云核/记忆`，区分可花费云核和累计云核。
- 季风循环目标改为随循环次数增长：
  - 基础目标：3000 生命力。
  - 每次季风循环后目标乘以 4。
- 中央区域新增 `终局目标` 卡片，显示天空心脏进度条和完成按钮。
- UI 视觉调整：
  - 面板、升级卡、按钮改为更硬朗的 2px 边框和触感阴影。
  - 可购买升级卡加入左侧色条和更明确的 ready 状态。
  - 终局卡使用淡紫色语义，和普通季风 reset 区分。
  - 仍保留明亮、空气感，不切暗色赛博风。
- 新增模拟脚本：
  - `scripts/simulate-weather-reactor.mjs`
  - `package.json` 新增 `npm run simulate:weather`

模拟结果：

普通自动购买策略大致节点：

```text
4:38  第 1 次季风循环，总云核 2
9:17  第 2 次季风循环，总云核 6
14:07 第 3 次季风循环，总云核 11
19:24 第 4 次季风循环，总云核 18
25:04 第 5 次季风循环，总云核 25
31:02 第 6 次季风循环，总云核 33
37:10 第 7 次季风循环，总云核 42，天空心脏苏醒
```

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run simulate:weather`：通过。

当前仍存在的问题：

- 模拟脚本是理想化自动购买策略，实际玩家可能更慢或更快，需要实机试玩。
- 中段是否“平台期好玩”还不能只靠数值确认，需要看玩家是否有明确升级目标可追。
- UI 已向游戏感靠近，但中央云岛仍偏抽象，下一轮可以做状态反馈而不是加新系统。

## 本轮任务：按层级职责补齐升级结构

日期：2026-05-14

目标：

- 继续吸收《质量增量》的升级安排经验。
- 让每一层升级不只是“解锁下一资源”，而是有基础产量、效率、跨层反哺、自动/下一层入口。
- 保持当前渐进式披露，不把所有未来升级一次性露出。

设计判断：

- 当前点击层已经有 5 个升级，结构相对完整。
- 雨水复苏层只有 `根系苏醒`，太像单个开关，缺少层内成长。
- 天气闭环层有主链条，但缺少“新层反哺旧层”的质量增量式咬合。
- 本轮只补升级职责和公式，不做完整经济平衡。

本轮改动文件：

- `src/App.tsx`
- `docs/cloud-island-handoff.md`

完成内容：

- 雨水复苏层新增：
  - `活根扩张`：提高雨水转生命效率。
  - `初雨回声`：生命力反哺云层点击雨量。
  - `蒸腾回流` 保持为进入下一层的入口。
- 天气闭环层新增：
  - `暖流积蓄`：提高生命力转蒸腾效率。
  - `云影滋养`：云层反哺雨水转生命效率。
- 现有层级结构变为：
  - `I 云层点击`：点击雨量、点击固定加成、冷却、点击倍率、自动细雨。
  - `II 雨水复苏`：雨水转生命、生命效率、生命反哺点击、解锁蒸腾。
  - `III 天气闭环`：蒸腾效率、云层凝结、自动降雨、云层反哺生命、自动降雨倍率。
- `getCloudTouchAmount()` 加入 `初雨回声` 乘区。
- `getVitalityConversion()` 加入 `活根扩张` 和 `云影滋养` 乘区。
- `getVaporConversion()` 加入 `暖流积蓄` 乘区。
- `isUpgradeVisible()` 补齐新升级的渐进式可见条件。
- `normalizeUpgradeRecord()` 补齐新升级字段，旧存档可自动补 0。

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。

当前仍存在的问题：

- 新增升级的成本和倍率只是第一版试玩曲线，需要实机确认是否太快或太慢。
- `下一目标` 仍只追踪主链条，不会提示所有层内升级；这有利于保持单一目标，但可能让玩家忽略反哺升级。
- 右侧升级仍是文字卡片；如果升级继续增加，应进一步改成图标节点 + 详情区。

## 本轮任务：参考质量增量重做升级披露

日期：2026-05-14

目标：

- 研究 `incremental-mass-rewritten` 如何组织升级数据与渐进式披露。
- 解决右侧一次展示大量升级、缺少阶段标识、认知负担过高的问题。
- 先做 UI 信息架构收束，不调数值曲线。

源码学习结论：

- 《质量增量》的升级是数据驱动的：升级定义集中在 `js/upgrades.js`，购买、成本、效果、自动购买、可见条件分离。
- 渐进式披露主要靠三层门控：
  - tab / subtab 的 `unl()` 控制系统层是否出现。
  - upgrade column 的 `unl()` 控制升级列是否出现。
  - individual upgrade 的 `unl()` 控制单个节点是否出现。
- UI 不把所有未来系统平铺出来；玩家只看到当前已解锁层、当前列、当前节点。
- 主升级采用图标/列结构，hover 或详情区解释效果；大量文本卡片不会同时挤满屏幕。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

完成内容：

- 新增 `UpgradeGroupDefinition` 与 `UPGRADE_GROUPS`。
- 本轮升级分成 3 个阶段：
  - `I 云层点击`
  - `II 雨水复苏`
  - `III 天气闭环`
- 右侧升级面板改为：
  - 顶部阶段按钮只展示已解锁升级组。
  - 当前组显示阶段说明。
  - 组内升级按当前里程碑逐步露出。
  - 未解锁组只显示一个“下一组”提示，不展示完整未来卡片。
- 新增 `isUpgradeVisible()`，为每个升级设置轻量可见条件。
- 新增 `getRecommendedUpgradeGroupId()`，用于标记当前最值得看的升级组。
- 保留上一轮规则：
  - 升级卡仍显示完整下一次成本。
  - 可购买仍靠卡片高亮表示。
  - 升级卡仍显示会影响哪个数值。

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run dev -- --host 127.0.0.1 --port 5173`：HTTP 200。
- Playwright 运行时检查未完成：本机可用的 bundled `playwright` 缺少 `playwright-core` 包，未继续临时安装依赖。

当前仍存在的问题：

- 阶段按钮只是第一版信息架构；后续如果升级数量继续增加，应把旧组做成更紧凑的图标节点或二级页签。
- 自动推荐组目前只做高亮提示，不会强制跳转，避免玩家正在看旧组时被打断。
- 数值节奏和第一轮 reset 时间还没有重新调。

## 本轮任务：点击层深化与整数化显示

日期：2026-05-14

目标：

- 小修数值显示，减少小数噪音。
- 将第一轮玩法重心收束到“点击云层降雨”这一层。
- 点击不再是无限连点，改为带 CD 的主动天气施放。
- 点击层先形成一组 5 个升级，为后续“每层从半自动转自动化”建立模板。

设计判断：

- 用户倾向点击内置 CD，而不是高频连点。
- 本轮采用 5 秒基础 CD。这样点击更像一次主动天气施放。
- 但不把点击做成长期全部重心；后续仍应通过自动细雨、自动降雨等升级逐步降低点击重要性。
- 这更符合“纯放置 + 多升级”的偏好，也避免把游戏变成鼠标宏平推。

本轮改动文件：

- `src/App.tsx`
- `docs/cloud-island-handoff.md`

完成内容：

- `ReactorState` 新增 `clickCooldownRemaining`。
- 点击云层后进入冷却，冷却中按钮不可点击并显示剩余时间。
- 新增点击层升级：
  - 云层触碰：提高每次点击雨水。
  - 云层握持：额外提高单次点击固定雨量。
  - 冷却气流：缩短点击 CD。
  - 厚云降雨：按倍率提高点击雨水。
  - 自动细雨：把部分点击雨量转为每秒自动雨水。
- 原后续链条仍保留：
  - 根系苏醒。
  - 蒸腾回流。
  - 云团凝结。
  - 自动降雨。
  - 风暴记忆。
- 升级效果预览改为更易读：
  - 点击类：显示 `点击雨水 当前 -> 下级`。
  - 冷却类：显示 `点击冷却 当前 -> 下级`。
  - 转化类：显示 `雨水转生命 x%/秒 -> y%/秒` 等。
  - 自动降雨倍率显示 `x1 -> x1.5` 这种形式。
- `formatNumber` 改为资源/成本基本整数显示。
- `formatRate` 改为半整数风格，尽量只出现整数或 `.5`，低于 1 的速率才保留 1 位小数。

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser in-app 检查：
  - 页面包含 `冷却气流`、`自动细雨`、`点击雨水`、`点击冷却`。
  - 右侧仍不出现“还需要”缺口成本短语。
  - console error 为 0。

当前仍存在的问题：

- 本轮没有调完整经济曲线，只处理点击层和显示。
- 点击实际 CD 手感、自动细雨解锁时机、第一轮 reset 时间仍需要手动试玩。
- 生命力层尚未按同样模板深化；下一轮可以做“雨水 -> 生命力”的半自动到自动化升级组。

## 本轮任务：天气反应堆 UI 逻辑修正

日期：2026-05-14

目标：

- 修复通知气泡出现 / 消失导致中部 UI 上下腾挪。
- 修正右侧升级卡显示逻辑：永远显示下一次升级完整成本，而不是缺口成本。
- 可购买状态只靠高亮表达，不把成本位置替换成一句操作文案。
- 让升级卡说明升级会改变左侧哪个数值。
- 去掉中部反应链和左侧资源面板的数值重复。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

完成内容：

- `.reactor-notice` 改为绝对定位浮层，不再参与 `island-reactor` grid 排版。
- 右侧本轮升级卡始终显示完整下一次成本，例如 `💧43.0`。
- 右侧本轮升级卡新增效果预览：
  - 点击类显示 `点击雨水 当前 -> 下级`。
  - 生产类显示对应资源的 `+x/秒 -> +y/秒`。
- 中央反应链节点改为状态说明：
  - 不再显示资源数量和每秒速率。
  - 左侧继续作为唯一数值仪表。

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser in-app 复查：
  - 有升级效果预览。
  - 右侧显示完整成本。
  - 不再出现“还需要”缺口成本短语。
  - 中央反应链显示状态文本。
  - 不再出现旧的 `数值 · +速率` 重复文本。
  - console error 为 0。

当前仍存在的问题：

- 数值节奏仍未调整，用户明确说暂时先不调。
- 还没做完整手动循环验证和季风循环 reset 手感验证。
- 中央视觉仍偏灰盒，下一步应围绕“空岛天气活力复苏”做状态反馈，而不是继续加面板。

## 本轮任务：天气反应堆核心柱重构

日期：2026-05-14

用户确定的新主题：

```text
从点击第一次云层降下雨水开始，重塑这个空岛的天气活力。
```

目标：

- 暂时忽略之前的地块经营玩法，把核心改成更经典的增量游戏主柱。
- 从 5x5 地块规划切换为“天气反应堆”直线生产链。
- 加入第一层 reset：季风循环，凝结云核。
- 保留云岛主题，但让岛屿成为天气系统复苏的反馈层，而不是棋盘。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

完成内容：

- `src/App.tsx` 已重构为天气反应堆原型。
- 新主柱：

```text
点击云层降雨
-> 雨水
-> 生命力
-> 蒸腾
-> 云层
-> 自动降雨
-> 季风循环
-> 云核
```

- 当前轮升级：
  - 云层触碰：提高点击雨水。
  - 根系苏醒：雨水生成生命力。
  - 蒸腾回流：生命力生成蒸腾。
  - 云团凝结：蒸腾生成云层。
  - 自动降雨：云层自动生成雨水。
  - 风暴记忆：强化自动降雨倍率。
- 第一层 reset：
  - 名称：季风循环。
  - 条件：自动降雨已形成，生命力达到 1000。
  - 效果：重置本轮基础资源和本轮升级，获得云核。
- 云核天赋：
  - 初雨记忆：开局获得 25 雨水。
  - 云锚：云团凝结速度提高。
  - 活土：生命力生成速度提高。
  - 季风透镜：季风循环额外获得 1 云核。
- `localStorage` 使用新 key：`cloud-island-weather-reactor-v1`。

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser in-app 打开 `http://127.0.0.1:5173/`：页面包含“天气反应堆 / 点击云层降雨 / 季风循环 / 云核天赋”。
- Browser in-app console error：0。
- Browser locator 点击验证本轮被 CDP timeout 卡住，未完成自动点击验证；需要下一轮或用户手动试玩确认点击、购买、reset 手感。

当前仍存在的问题：

- 数值曲线未经试玩，可能太快或太慢。
- 当前没有自动化测试覆盖季风循环 reset 和云核天赋。
- 页面视觉是新方向灰盒，还没有进一步打磨云岛复苏反馈。
- 旧 Phaser/Pixi 文件和依赖仍未清理，本轮没有碰技术债。

下一轮建议：

1. 先手动试玩 3-5 分钟，确认第一轮是否能顺利从点击进入自动降雨。
2. 补一个轻量模拟脚本或单元化逻辑测试，覆盖首次季风循环和云核天赋。
3. 根据试玩结果调：
   - 点击雨水数量。
   - 根系苏醒 / 蒸腾 / 凝结 / 自动降雨成本。
   - 生命力 1000 reset 门槛。
4. 再做空岛视觉反馈：雨落、绿意、蒸腾、云层厚度、季风循环动画。

## 本轮任务：三款增量游戏参考研究与玩法融合方案

日期：2026-05-14

目标：

- 深度研究《质量增量》《反物质维度》《模组树》这三类增量玩法参考。
- 把参考机制转译成适合《云上小岛》的玩法深化方向。
- 先写设计文档，不直接改代码。

本轮解释：

- 《质量增量》本轮按 `Incremental Mass Rewritten` 理解。
- 《反物质维度》参考 `Antimatter Dimensions`。
- 《模组树》参考 `The Modding Tree` / `The Prestige Tree` 系谱。

本轮产出：

- 新增 `docs/incremental-reference-study-cloud-island.md`。

核心结论：

- 需要修正上一版偏保守判断：Cloud Island 作为增量游戏，必须保留数值增长、瓶颈墙、reset/prestige、永久收益这些核心骨架。
- Cloud Island 不应照搬天文大数、多层复杂 reset、数学树或多标签页 UI。
- 但它应该做主题化的第一层 reset：`季风循环 / 云核凝结`。
- 应吸收三件事：
  - 新层自动化旧层。
  - 新层改变玩家操作方式。
  - 新节点回头改造旧循环。
- 最适合当前项目的深化结构是“三条天气链”，而不是完整 prestige tree：
  - 雨链：湿润、自动湿润、连锁湿润，解决作物成长。
  - 风链：云停留、天气周期、自动计时加速，解决时间节奏。
  - 光链：成熟、丰收、收获价值，解决收益转化。
- 第一层 reset 建议：
  - 完成阶段 4 后可进行“季风循环”。
  - 重置当前资源、地块、建筑、成长、阶段。
  - 保留 `云核`、季风循环次数、最高总产出和永久天气天赋。
  - 云核用于购买开局资源、天气施放强化、雨水收集器成本降低、开局麦田成长等永久天赋。

下一轮建议：

1. 先做 Batch B：雨链深化 + 云核预告。
2. 只改现有雨水收集器，不新增建筑或资源。
3. 建议内容：
   - 雨水收集器 Lv.3 自动湿润范围扩大。
   - 自动湿润优先未成熟麦田。
   - 左侧自动链摘要升级成“天气链”模块，但先只启用雨链。
   - 地图自动湿润反馈更强。
   - 阶段 4 完成后显示“季风循环 / 可凝结云核”的预告。
4. 第二批再做 Batch C：第一层 reset MVP，正式加入云核和季风循环。
5. 暂时不要做风链、光链、完整天气树 UI、第二层 reset 或挑战系统。

## 本轮任务：UI 重设计第一批与增量手感前置

日期：2026-05-14

目标：

- 根据 `docs/incremental-lessons-from-404.md` 和 `docs/cloud-island-v0-2-closed-loop-development-manual.md`，先重设计当前 React/HTML/CSS 灰盒 UI。
- 不新增资源、建筑、机器、剧情、next-day/tick 或新系统。
- 把“总产出、下一目标、瓶颈、第一条自动链状态”提前到第一屏。
- 让右侧建筑列表更像增量游戏购买决策面，而不是普通按钮清单。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

完成内容：

- 左侧新增经营摘要：岛屿总产出 / 秒、下一目标、自动链状态和自动链进度。
- 阶段目标改成“循环目标”视觉表达，增加阶段完成进度条。
- 资源区压缩为双列小 HUD，避免占满首屏。
- 中央顶部天气条增加当前下一目标和自动链短状态，施放 / 放置模式仍保留。
- 雨水收集器 Lv.2 在地图格内显示自动计量条，用于表达自动湿润倒计时。
- 右侧新增建议操作卡，根据当前阶段目标、麦田成熟、雨水收集器状态和资源缺口给出一个具体下一步。
- 建筑购买卡增加 `可建 / 接近 / 缺资源` 状态，高亮当前可买和接近可买项。

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- 本地 `http://127.0.0.1:5173/`：可访问，端口已有 Vite 服务在运行。
- Browser in-app 检查：页面包含“岛屿产出 / 循环目标 / 当前瓶颈 / 建议操作”，console error 为 0。
- Browser in-app 交互验证：选中麦田 -> 放置到中心地块 -> 选择下雨 -> 点击麦田，出现“成长 +28%”，console error 仍为 0。

当前仍存在的问题：

- 本轮只做 UI 信息架构和第一条自动链可视化，没有调整 10 分钟数值曲线。
- 截图中左侧仍需要内部滚动才能看到更下方的验证摘要和重置按钮，但核心摘要、资源和阶段目标已进入首屏。
- 当前仍是 React/HTML/CSS 格子灰盒，旧 Phaser/Pixi 残留没有清理。

下一轮建议：

1. 做手动 1 / 3 / 5 / 7 / 10 分钟试玩记录，确认当前 UI 是否真的让下一目标清晰。
2. 如果节奏仍偏快，优先调整建筑和升级成本，不新增系统。
3. 深化玩法时优先补“雨水收集器 Lv.2 自动湿润相邻麦田”的前后反馈和阶段目标，不先加新机器或新资源。

## 本轮任务：迁移 404 增量开发经验

日期：2026-05-14

目标：

- 把 `F:\Who_Live_in_404` 最近的增量化尝试经验迁移到本项目。
- 只迁移玩法判断、增量设计边界和 UI 语义经验。
- 不迁移 404 的题材、房间拼图、租客规则结算或桌游式 UI。

本轮结论：

- 404 更适合静态空间优化 / 轻解谜，不适合强行做传统增量。
- Cloud Island 更适合增量 / 放置，因为它天然有“云 -> 雨 -> 作物 -> 收获 -> 升级 -> 天气机器 -> 半自动循环”的增长线。
- 后续 Cloud Island 应避免手动推进天数 / 手动 tick，把重点放在自动增长、产速变化、瓶颈提示和第一条自动天气链。

本轮改动文件：

- `AGENTS.md`
- `docs/incremental-lessons-from-404.md`
- `docs/cloud-island-v0-2-closed-loop-development-manual.md`
- `docs/cloud-island-handoff.md`

新增约束：

- 不添加手动 next-day / next-round / tick-advance。
- 阶段解锁优先基于循环证明，例如收获、升级、自动湿润触发。
- 5x5 岛面只做轻量生产关系，不扩成空间优化谜题。
- 中央岛面表达成长、产出、天气影响和自动触发；侧栏负责摘要、购买和解释。
- 下一批如果做“增量手感”，优先做总产出摘要、下一目标、瓶颈提示和自动链可视化，不先加新资源、新机器或新面板。

验证：

- 本轮只改 Markdown 文档，未运行 `npm run typecheck` / `npm run build`。

原始技术栈：

- Vite
- React
- TypeScript
- PixiJS
- CSS
- localStorage

当前代码状态：

- 仓库中存在 Phaser 实验代码和 `phaser` 依赖，这是已归档伪 2.5D 网格岛路线的一部分。
- 当前 App 入口已实现 React/HTML/CSS 的 5x5 格子放置经营 Demo。
- 当前 App 不引用旧 Phaser/Pixi 场景；旧文件和依赖先保留，后续单独做技术债清理。
- 不要继续推进 Phaser 伪 2.5D 网格岛。

当前核心循环：

```text
点击云 -> 雨滴下落 -> 作物成长 -> 成熟收获 -> 获得资源 -> 购买升级 -> 解锁天气机器 -> 小岛出现半自动循环
```

当前禁止范围仍然有效：

- 不加剧情、NPC、战斗、敌人、卡牌、AI、登录、后端、多人。
- 不加真正 3D、真正 2.5D / 等距系统、WASD、复杂离线收益、转生、多岛屿、大科技树、天气灾害。
- 伪 2.5D / 等距 / 网格岛路线已归档，不作为默认方向。
- 不要继续新增 2.5D 坐标系统、网格摆放、自由建造、寻路、摄像机旋转或复杂遮挡。
- 技术栈处于待收敛状态：当前代码有 Phaser 实验，但新路线未决定最终保留 Phaser 还是回到 PixiJS。
- v0.1 polish 阶段不要扩展 v0.2 内容。

## 当前关键文档

- `AGENTS.md`：项目约束与阶段定义。
- `cloud_island_harness_development_manual (1).md`：Harness 开发手册。
- `docs/cloud-island-demo-technical-report.md`：当前 Demo 技术报告。
- `docs/cloud-island-handoff.md`：本持续交接文档。
- `docs/cloud-island-v0-2-closed-loop-development-manual.md`：完整闭环 Demo 开发手册，定义玩法可行性验证、系统关系、阶段目标、自动化方向和下一轮实现批次。
- `E:/Downloads_FromWeb/云上小岛闭环玩法设计文档.md`：新的闭环玩法设计依据，强调中央岛屿主角、天气主动操作、资源瓶颈、扩岛决策和逐步自动化。
- `docs/art-pass-0-plan.md`：Art Pass 0 执行计划，用于验证伪 2.5D 美术方向，不包含正式资源。
- `docs/art-pass-1/art-pass-1-report.md`：Art Pass 1 美术方向探索报告，包含当前截图分析、三张方向图、评分和推荐方向。
- `docs/art-pass-2-asset-first-plan.md`：Art Pass 2 资产优先计划，已将后续路线从整张概念图纠偏为游戏素材拆分。
- `docs/visual-route-archive-pseudo-2-5d.md`：伪 2.5D / 像素网格岛 / Phaser 网格实验归档文档。
- `docs/visual-route-2d-lightweight-plan.md`：新的轻量 2D 表现路线文档。
- `E:/Downloads_FromWeb/cloud_island_art_direction_2_5_d_visual_strategy.md`：外部 Art Direction / 伪 2.5D 视觉策略来源文档。

## 当前视角策略

当前路线已切换为：

```text
轻量 2D 漂浮小岛
清爽、明亮、简单、可读
固定作物/机器位置
天气反馈是主角
放置/增量玩法优先
```

已归档路线：

```text
像素风伪 2.5D 漂浮天气小岛
岛面投影坐标
网格化地块摆放
Phaser 网格岛实验
像经营手游主界面的 2.5D 网格岛参考
```

归档原因：

- 坐标系统和网格化成本过高。
- 资产角度一致性要求过高。
- 当前目标从“轻松放置反馈”偏向了“视觉架构工程”。
- Phaser 实验增加了依赖、bundle 体积和维护成本。

明确禁止：

- 默认继续伪 2.5D / isometric tile map。
- 3D 引擎。
- 自由建筑摆放。
- 建筑旋转、摄像机旋转。
- 角色移动或寻路。
- 多岛屿地图系统。
- 在非 Art Pass 任务中顺手调用 image generation。

## 当前代码入口

- `src/App.tsx`：React 根组件，持有 reducer 状态、经济 tick、存档、toast、UI 与当前场景回调连接；当前代码仍引用 Phaser 实验宿主。
- `src/game/GameCanvas.tsx`：Pixi 场景主文件，包含云、雨滴、作物、机器、命中检测和反馈。
- `src/game/createPixiApp.ts`：Pixi app 初始化与基础程序图形。
- `src/game/sceneLayout.ts`：当前固定 2D 舞台的构图锚点，集中管理云、岛、作物、机器和 debug overlay 坐标。
- `src/phaser/PhaserGameCanvas.tsx`：已归档 Phaser 网格岛路线的 React 宿主；当前代码仍引用它，但路线已决定废弃 2.5D，需要下一轮做技术收敛。
- `src/phaser/scenes/CloudIslandScene.ts`：已归档 Phaser 网格岛实验场景。
- `src/game/state/gameState.ts`：初始状态、reducer、机器购买逻辑。
- `src/game/state/gameTypes.ts`：资源、升级、解锁、作物与 action 类型。
- `src/data/upgrades.ts`：升级配置。
- `src/data/machines.ts`：天气机器配置。
- `src/game/systems/saveSystem.ts`：localStorage 存档。
- `src/ui/ResourceBar.tsx`：资源显示和变化高亮。
- `src/ui/UpgradePanel.tsx`：升级面板。
- `src/ui/MachinePanel.tsx`：天气机器面板。
- `src/ui/StatusToast.tsx`：状态提示。

## 最近一次开发任务

任务：按闭环设计文档补齐完整玩法验证体。

用户决策：

- 先直接按闭环玩法设计文档做完整体，之后由用户试玩，再集中修 BUG。
- 接下来不再由 Codex 自行跑浏览器试玩验证；Codex 只做命令级验证，试玩反馈由用户提供。

完成内容：

- 增加阶段 4：进入半自动循环。
- 阶段 4 目标覆盖自动湿润累计、Lv.2 建筑数量和总产出速度。
- 增加 localStorage 存档 / 读取，保存资源、地块、建筑、等级、成长、天气、阶段、自动化触发次数和用时。
- 重置验证版会清空当前存档并回到初始状态。
- 左侧增加“当前瓶颈”提示，用于引导玩家下一步做什么。
- 左侧增加轻量“验证摘要”，显示用时、阶段、建筑数、解锁数、总产出和自动链状态。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- 按用户要求，本轮未使用浏览器自动化验证；后续以用户试玩反馈为准。

当前判断：

- 当前 Demo 已覆盖设计文档里的完整玩法验证链：放置、产出、天气施放、成长、收获、升级、解锁、自动湿润、阶段推进、存档。
- 下一步优先等待试玩反馈，集中修 BUG、调数值节奏和处理阻塞点。

## 上一次开发任务

任务：按闭环玩法文档实现第一条半自动天气链。

设计依据：

- 参考 `E:/Downloads_FromWeb/云上小岛闭环玩法设计文档.md`。
- 使用 `game-design-direction` 和 `game-design-critique` 思路做范围约束：本轮只补“从手动天气到半自动天气循环”的关键后果，不扩新资源、新建筑或新系统。

完成内容：

- 增加雨水收集器 Lv.2 自动湿润相邻麦田的半自动链。
- 自动湿润每 20 秒触发一次，相邻麦田成长 +18%。
- 自动触发时中央地图显示“自动湿润”和“成长 +18%”跳字。
- 雨水收集器 Lv.2 在格子内显示“自动”状态标签。
- 阶段 3 目标改为要求“雨水收集器 Lv.2 自动湿润 1 次”，让阶段目标验证半自动闭环。

本轮改动文件：

- `src/App.tsx`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Bundled Playwright 实测：麦田与雨水收集器相邻放置后，雨水收集器升级到 Lv.2；约 20 秒后自动触发“自动湿润 / 成长 +18%”；麦田成长从 0% 到 18%；console error 为 0。

当前判断：

- `Batch 2：第一条半自动链` 已完成最小可玩版本。
- 下一步应进入 `Batch 3：节奏调优`，重点验证 10-15 分钟内是否能自然到达这条半自动链。

## 上一次开发任务

任务：修复放置后选中残留、天气按钮误高亮和建筑点击反馈。

完成内容：

- 建筑放置后自动回到指针态，但不会立刻弹出升级 / 删除气泡。
- 底部天气按钮只在“施放工具模式”高亮；当前全局天气仍由顶部天气条表达。
- 地图操作气泡改为更紧凑的按钮结构，升级成本不再把按钮撑成多行碎块。
- 指针模式点击非麦田建筑会获得一次轻量即时产出，并显示地图跳字。
- 保留原有放置、升级、删除、解锁、天气施放和麦田收获逻辑。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Bundled Playwright 实测：放置后不弹气泡，再点建筑才弹气泡；天气施放高亮可被指针清除；伐木场点击出现资源跳字；console error 为 0。
- in-app browser CDP 端口本轮不可连，改用 headless Chromium 验证本地 `http://127.0.0.1:5173/`。

## 上一次开发任务

任务：修复工具互斥与地图气泡操作。

完成内容：

- 增加底部“指针”模式，指针、天气施放、建筑放置三种工具互斥。
- 右侧建筑选择会取消天气施放；天气按钮会取消建筑放置选择。
- 删除右下角操作面板，右侧只保留建筑列表和简短提示。
- 指针模式点击已放置建筑，会在地图格子上方出现升级 / 删除气泡。
- 指针模式点击可解锁格子，会在地图格子上方出现解锁气泡和需求。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser-use 实测：指针按钮可用，建筑选择与天气模式互斥，放置模式提示可见，升级 / 删除 / 解锁气泡可用，console error 为 0。
- 最新截图捕获时浏览器 CDP 超时，但交互和 DOM 验证通过。

## 上一次开发任务

任务：实现完整闭环 Demo 手册 Batch 1：玩法闭环补强。

完成内容：

- 阶段目标从纯数字推进调整为包含麦田收获、下雨参与、雨水收集器、即时天气收益和建筑总等级。
- 增加资源不足、不可放置、不可升级、不可解锁等短提示，提示以地图浮层呈现。
- 天气施放模式增加目标与相邻格子的范围预览。
- 麦田成长、成熟、收获继续保留，并接入阶段目标统计。
- 修复通知浮层导致底部天气按钮被拉高的布局回归。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser-use 实测：放置、下雨施放、麦田成熟收获、资源不足提示、升级入口、删除、解锁入口均可用，console error 为 0。

设计约束：

- 本轮开始明确使用 `ui-ux-pro-max`、`game-art-direction`、`game-art-critique` 作为前端审美和游戏美术约束参考。

## 上一次开发任务

任务：编写《云上小岛》完整闭环 Demo 开发手册。

完成内容：

- 新增 `docs/cloud-island-v0-2-closed-loop-development-manual.md`。
- 明确当前路线为先做玩法可行性验证，再做美术迭代。
- 定义完整闭环：放置建筑、天气施放、麦田成长/收获、升级、解锁、阶段目标、半自动天气链。
- 给出 v0.2 实现批次：闭环补强、第一条半自动链、节奏调优、存档交付。
- 更新本 handoff 的关键文档索引。

本轮改动文件：

- `docs/cloud-island-v0-2-closed-loop-development-manual.md`
- `docs/cloud-island-handoff.md`

验证结果：

- 本轮只改文档，未运行 typecheck/build。

## 上一次开发任务

任务：小互动闭环 v0.1.5，恢复中央地图直接操作反馈。

完成内容：

- 底部晴天、下雨、微风按钮改为天气施放模式，同时保留全局天气倍率。
- 点击地图格子会对目标和相邻格触发轻量天气反馈、格子高亮和跳字。
- 麦田增加 0-100% 成长进度，下雨/晴天可推动成长，成熟后点击可收获食物并重置成长。
- 下雨可让雨水收集器立即产出雨水；晴天可让阳光棱镜产出阳光；微风可给伐木场/采石场/金币相关建筑即时收益。
- 建筑格仍保持 icon-first，不把完整建筑名塞回地图格子。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser-use 实测：下雨点麦田可见成长反馈，麦田成熟后可收获食物；晴天/微风有轻量反馈；放置、升级、删除、解锁入口仍可用，console error 为 0。

## 上一次开发任务

任务：地图信息减负、建筑显示修复、轻量资产化准备。

完成内容：

- 建筑数据补充 `fullName`、`shortLabel`、`iconKey` 字段，方便后续接入 sprite 资产。
- 地图格子内移除完整建筑名，只保留建筑图标、产出 chip 和 Lv 标签。
- 右侧建筑列表和操作详情继续显示完整建筑名。
- 右侧建筑卡片调整为可容纳长名称的布局，避免关键名称被截断。
- 弱化中央地图巨大绿色范围圆，改为更轻的岛面/选中提示。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser-use 实测：雨水收集器放入地图后格子只显示图标、产出和 Lv；右侧仍显示完整建筑名；天气、删除、升级入口可用，console error 为 0。

## 上一次开发任务

任务：2D 云岛放置经营 v0.1 最小截图级 polish。

完成内容：

- 中央地图增加天空层次、浅色岛屿底、云雾边缘和柔和阴影。
- 地块状态强化为更游戏化的草地、锁定、可解锁、选中、已占用视觉。
- 建筑落位后显示图标、名称、产出提示和等级。
- 晴天、下雨、微风切换时中央舞台有轻量视觉差异。
- 左右面板弱化网页卡片感，滚动条样式更轻。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser-use 实测：资源、放置、天气、解锁、升级入口均仍可用，console error 为 0。

## 上一次开发任务

任务：调整 2D 验证版 UI 信息分区和建筑选择交互。

完成内容：

- 移除右侧冗余的“选中格子”详情卡。
- 左侧新增“地块 / 解锁”信息，与资源列表和阶段目标归在同侧。
- 右侧保留建筑购买和地块操作，集中承载放置、升级、删除、解锁等资源消耗操作。
- 右侧建筑按钮支持再次点击取消选中。
- 底部天气按钮显示三种天气的资源影响说明。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser-use 实测：建筑可选中 / 取消，选建筑后点空地可直接放置，旧详情卡已移除，三种天气说明可见，console error 为 0。

## 上一次开发任务

任务：修复格子尺寸变化，并优化放置 / 删除交互。

完成内容：

- 修复选中格子和放置建筑后格子被内容撑高、视觉变形的问题。
- 将地图网格固定为 5x5 等分行列，格子尺寸不再受边框或建筑内容影响。
- 改为先点右侧建筑，再点空地即可直接放置。
- 增加删除建筑按钮，删除后格子回到空地，不返还资源。
- 保留底部放置按钮作为兜底操作，原升级、天气、解锁、阶段逻辑不变。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser-use 实测：点建筑 -> 点空地可直接放置；删除按钮可移除建筑；console error 为 0。

## 上一次开发任务

任务：实现“2D 云岛放置经营闭环验证版 v0.1”。

完成内容：

- 用 React/HTML/CSS 实现 5x5 中央格子地图。
- 实现 `locked` / `empty` / `occupied` / `selected` / `unlockable` 格子状态。
- 实现食物、木头、石头、雨水、阳光、金币 6 类资源。
- 实现麦田、伐木场、采石场、雨水收集器、阳光棱镜 5 类建筑的放置、升级和每秒产出。
- 实现晴天、下雨、微风天气倍率，相邻格解锁，以及 3 个阶段目标推进。

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser-use 实测：放置建筑、资源增长、升级建筑、切换天气、解锁格子、阶段 1 推进到阶段 2 均可用。
- 浏览器 console error：0。

当前限制：

- 无存档、无离线收益、无完整美术资产、无响应式适配。
- 旧 Phaser/Pixi 文件和依赖仍保留但当前 App 不引用。

## 上一次开发任务

任务：文档归档伪 2.5D 路线，并新开轻量 2D 表现路线。

背景：

- 用户明确决定废弃当前 2.5D 表现路线。
- 用户希望改为尝试轻量 2D 效果，仍以轻松放置玩法为核心。
- 本轮只改文档，不改代码、不删依赖、不清理 Phaser/Pixi 文件。

完成内容：

- 新增 `docs/visual-route-archive-pseudo-2-5d.md`：
  - 归档伪 2.5D、像素网格岛、Phaser 网格岛实验。
  - 说明归档原因：坐标系统成本、资产角度成本、项目焦点偏移、Phaser 体积和维护成本。
  - 标记该路线仍有可复用经验，但不继续作为当前方向。
- 新增 `docs/visual-route-2d-lightweight-plan.md`：
  - 定义新的轻量 2D 表现路线。
  - 明确目标是清爽、可读、愿意上手玩的 2D 放置小岛。
  - 明确不做 2.5D 网格、自由建造、新资源、新机器、大型 UI。
  - 提出下一轮应先做技术收敛：回 PixiJS 还是保留 Phaser 做纯 2D。
- 更新 `AGENTS.md`：
  - 将伪 2.5D 从推荐未来方向改为已归档探索。
  - 写入当前新方向为轻量 2D floating island。
  - 写入当前仓库存在 Phaser 实验，下一轮需做技术栈收敛。
- 更新 `cloud_island_harness_development_manual (1).md`：
  - 将“后续采用像素风伪 2.5D”改为“当前重新转向轻量 2D 表现”。
  - 更新 Art Pass 规则为轻量 2D 资产。
  - 明确伪 2.5D / Phaser 网格岛路线已归档。
- 更新本 handoff：
  - 将当前视角策略改为轻量 2D。
  - 将 Phaser 代码标记为已归档路线残留，等待下一轮技术收敛。

本轮改动文件：

- `AGENTS.md`
- `cloud_island_harness_development_manual (1).md`
- `docs/cloud-island-handoff.md`
- `docs/visual-route-archive-pseudo-2-5d.md`
- `docs/visual-route-2d-lightweight-plan.md`

未做内容：

- 未改代码。
- 未删除 Phaser 依赖。
- 未恢复 PixiJS 引用。
- 未生成新资产。
- 未做 UI 重构。
- 未新增玩法、资源、机器。

验证：

- 本轮只改 Markdown 文档，未运行 `typecheck/build`。
- 已确认核心文档中不再把像素伪 2.5D 写成默认未来方向。

下一轮建议：

1. 先做 `2D Route Technical Reset SPEC`。
2. 决定回到 PixiJS 还是保留 Phaser 做纯 2D。
3. 清理或隔离已归档 Phaser/Pixi 历史路线。
4. 设计一个最小 2D 舞台布局：云、岛、3 块作物、3 台机器、轻量 HUD。
5. 再开始代码实现。

## 上一次开发任务

任务：按用户确认切换中央游戏舞台为 Phaser 引擎，复用已有像素资产，暂不继续 Pixi 布局修补。

背景：

- 用户认为轻量 2.5D 网格经营表现更符合预期，但不追求商业级美术。
- 用户明确提出“先用 Phaser 引擎去做，已有适合的资产可以复用”。
- 本轮视为明确批准从 Pixi 渲染层切换到 Phaser。React UI、reducer、存档、资源、升级和机器配置仍保留。

完成内容：

- 新增 Phaser 依赖：`phaser`。
- 新增 `src/phaser/PhaserGameCanvas.tsx`：
  - React 宿主组件。
  - 负责创建/销毁 Phaser.Game。
  - 通过 ref 把 React-owned `gameState` 和回调传给 Phaser 场景。
- 新增 `src/phaser/scenes/CloudIslandScene.ts`：
  - 加载现有 `ART_ASSETS` PNG 像素素材。
  - 渲染天空、远景云、浮岛、轻量 5x4 岛面网格。
  - 固定 3 个 crop cell。
  - 固定 3 个 machine cell。
  - 点击云生成 Phaser 雨滴。
  - 雨滴命中作物/收集器/地面后回调 React reducer。
  - 作物可点击收获，成熟时有 glow，收获有飞字。
  - 机器可见性由 React `unlocks` 决定，风车叶片旋转，棱镜有光效。
- `src/App.tsx` 已从 `GameCanvas` 切到 `PhaserGameCanvas`。
- `src/styles/app.css` 增加 `.phaser-host`，并强制 canvas 在 GameStage 内裁切。
- 保留旧 Pixi 文件，作为回滚参考；当前 App 不再引用 Pixi `GameCanvas`。

本轮改动文件：

- `package.json`
- `package-lock.json`
- `src/App.tsx`
- `src/styles/app.css`
- `src/phaser/PhaserGameCanvas.tsx`
- `src/phaser/scenes/CloudIslandScene.ts`
- `docs/cloud-island-handoff.md`

验证：

```bash
npm run typecheck
npm run build
```

结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `http://127.0.0.1:5173`：可访问。
- Browser-use 打开页面：canvas 数量为 1，console error 数量为 0。
- Phaser 截图已保存：`docs/layout-debug/phaser_grid_demo.png`。

注意：

- Phaser 主 bundle 当前约 `1,877 KB`，Vite 仍给出 chunk size warning。这是 Phaser 引擎体积带来的成本，不是构建失败。
- 当前 Phaser 场景只是最小可玩重建，不是最终视觉定稿。
- 当前 grid overlay 较轻，主要用于让地块/机器读成格位对象；后续可继续调整格位密度、地块姿态和 HUD 游戏感。
- 旧 Pixi 文件仍在仓库中，后续若 Phaser 方向确认稳定，可以再做清理；当前不建议立刻删除。

当前建议：

- 下一轮先做 Phaser 场景的截图级视觉评审。
- 重点看：
  - 岛是否像一个轻量网格经营场景。
  - 三块作物是否真正像格子对象。
  - 机器是否有清楚的固定格位。
  - HUD 是否还过于网页化。
- 不要急着加新系统或扩内容。

## 上一次开发任务

任务：建立伪 2.5D 岛面坐标系，把作物和机器从裸坐标改为岛面投影锚点。

背景：

- 用户指出当前布局仍像素材堆叠，关键问题是没有“游戏引擎式”的坐标系统。
- 本轮只处理坐标系与布局投影，不新增玩法、不新增素材、不改资源/升级/机器数值。

完成内容：

- 在 `src/game/sceneLayout.ts` 中建立固定岛面四边形：
  - `backLeft`
  - `backRight`
  - `frontRight`
  - `frontLeft`
- 新增 `projectIslandPoint({ u, v })`：
  - `u = -1` 表示岛面左侧，`u = 1` 表示岛面右侧。
  - `v = -1` 表示岛面后侧/上方，`v = 1` 表示岛面前侧/下方。
  - 使用双线性插值把岛面坐标投射到 Pixi 舞台 `x/y`。
- 作物锚点改成语义化岛面点：
  - `crop-1`: `left-front`
  - `crop-2`: `center-back`
  - `crop-3`: `right-front`
- 机器锚点改成语义化岛面点：
  - rain collector: `right-front-edge`
  - windmill: `left-back-edge`
  - sun prism: `right-back-edge`
- `gameState.ts` 继续保存普通 `x/y`，但初始值来自投影结果，保持存档模型简单。
- `GameCanvas.tsx` 继续使用普通 Pixi `x/y`，不引入真正 2.5D、等距地图或深度排序系统。
- `?debugLayout=1` overlay 改为显示真实岛面投影 polygon：
  - 红色圆点：作物锚点。
  - 蓝色方点：机器锚点。
  - 黄色四边形：当前岛面投影平面。

本轮改动文件：

- `src/game/sceneLayout.ts`
- `src/App.tsx`
- `src/styles/app.css`
- `docs/cloud-island-handoff.md`

验证：

```bash
npm run typecheck
npm run build
```

结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- Browser-use 打开 `http://127.0.0.1:5173?debugLayout=1`：Pixi canvas 存在，debug overlay 存在，console error 数量为 0。
- Browser-use 打开 `http://127.0.0.1:5173`：Pixi canvas 和 HUDPanel 存在，console error 数量为 0。
- debug 截图已保存：`docs/layout-debug/layout_projected_plane_debug.png`。

当前观察：

- 作物和机器现在服从同一套岛面投影坐标，而不是单独调 `x/y`。
- 这仍然是固定 2D Pixi 舞台，不是 isometric tile map，也没有自由摆放或摄像机系统。
- 下一轮如继续视觉调整，应优先调 `src/game/sceneLayout.ts` 里的岛面四角和 `u/v` 锚点，而不是直接改各对象 `x/y`。

## 上一次开发任务

任务：v0.1 visual/layout polish：只重构页面布局骨架，不改玩法、不改资源、不加系统、不替换美术。

完成内容：

- 将根页面从松散 dashboard 两列改为固定游戏截图式 `game-shell`。
- 左侧 `GameStage` 成为主视觉，占 shell 主要宽度。
- 右侧 `HUDPanel` 固定宽度，顶部与舞台对齐，内容过多时面板内部滚动。
- 弱化 Pixi 容器的网页卡片感，保留浅天空背景。
- 修复 Pixi canvas 被内联 `800x520` 尺寸压住的问题，CSS 强制 canvas 填满 stage。
- 新增 `src/game/sceneLayout.ts`，集中管理云、岛、作物、机器和 debug overlay 锚点。
- 作物锚点调整到岛的斜向顶面上，仍保持 3 块地，不新增作物系统。
- 新增 `?debugLayout=1` 临时 layout overlay，显示：
  - game shell 边界
  - GameStage 边界
  - HUDPanel 边界
  - GameStage 中心线
  - island 目标 bounding box
  - crop plot anchors

本轮改动文件：

- `src/App.tsx`
- `src/styles/app.css`
- `src/game/sceneLayout.ts`
- `src/game/createPixiApp.ts`
- `src/game/GameCanvas.tsx`
- `src/game/state/gameState.ts`
- `docs/cloud-island-handoff.md`

验证：

```bash
npm run typecheck
npm run build
```

结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `http://127.0.0.1:5173`：已启动并可访问。
- Browser-use 打开普通页面：DOM 中确认 Pixi canvas 和 HUDPanel 存在，console error 数量为 0。
- Browser-use 打开 `http://127.0.0.1:5173?debugLayout=1`：console error 数量为 0。
- debug 截图已保存：`docs/layout-debug/layout_debug.png`。
- 普通页面截图在 browser-use 截图调用中超时，但页面加载、DOM 和 console 检查正常；debug 截图可作为本轮布局验收依据。

未做内容：

- 未修改玩法逻辑。
- 未修改升级/机器/资源数值。
- 未新增资源、机器、剧情或 UI 系统。
- 未替换现有 Pixi 图形或接入正式资产。
- 未调用 image generation。
- 未引入新依赖。

当前观察：

- 小岛已成为舞台主视觉，作物锚点与斜向岛面基本对齐。
- 右侧 HUD 已固定宽度，不再随屏幕无限拉伸。
- debug overlay 默认关闭，只通过 `?debugLayout=1` 开启。
- 右侧 HUD 仍保留较多网页表单感，后续可做 HUD 视觉 polish，但不应在布局骨架任务里继续扩大范围。

## 最近一次完成任务

任务：执行 Art Pass 1：项目内美术探索。

完成内容：

- 读取项目文档与当前真实 Demo 状态。
- 通过 Chrome headless 截取当前运行画面。
- 基于当前真实布局生成 3 张伪 2.5D 主画面方向验证图。
- 使用 Codex 自带 `imagegen`，未继续使用 provider gateway 脚本。
- 新增 Art Pass 1 报告，完成现状分析、候选方向、prompt、自评和推荐方向。
- 本轮未改 gameplay 代码，未替换 Pixi 图形，未接入正式资产。

生成文件：

- `docs/art-pass-1/current_demo_screenshot.png`
- `docs/art-pass-1/art_direction_a_cozy_pixel.png`
- `docs/art-pass-1/art_direction_b_clean_stylized.png`
- `docs/art-pass-1/art_direction_c_hybrid_chunky.png`
- `docs/art-pass-1/prompt_a_cozy_pixel.txt`
- `docs/art-pass-1/prompt_b_clean_stylized.txt`
- `docs/art-pass-1/prompt_c_hybrid_chunky.txt`
- `docs/art-pass-1/art-pass-1-report.md`

初步评估：

- A Cozy Pixel 2.5D：游戏感强，但像素风会牵动 UI、字体、粒子和资产管线，暂不推荐作为主方向。
- B Clean Stylized 2D：清爽安全，和当前 React UI 兼容好，可作为备选方向。
- C Hybrid Chunky 2.5D：推荐继续迭代，岛屿厚度、天气层级、机器存在感、UI 留白和 sprite 拆分潜力最均衡。

原推荐方向：

```text
C Hybrid Chunky 2.5D
```

注意：该推荐已被后续用户决策覆盖。当前 Art Pass 主方向改为像素风资产拼接。

当前边界：

- 三张方向图只是探索图，不是正式素材。
- 尚未接入任何 PNG/SVG 资产。
- 当前 Demo 仍使用 Pixi Graphics 程序图形。
- 不应直接把整张方向图当背景接入游戏。

下一步建议：

1. 路线已纠偏：不要继续生成完整主画面概念图。
2. Art Pass 2 应按游戏资产思路生成素材板：岛、云、地块、作物阶段、雨水收集器、风车、太阳棱镜、少量特效参考。
3. 第一批建议只做 `island_base + plot tiles` 和 `weather machines` 两张资产验证图。
4. 仍然不要接入正式资产，直到单体拆分、透明背景、manifest 和 fallback 方案确认。

## 最近一次路线修正

用户反馈：Art Pass 不应继续描述“生成什么样的图像”，而应该按游戏资产思路直接生成可拆分素材。随后进一步确认：一切改为像素风，因为像素风更适合素材拼接。

已完成：

- 新增并更新 `docs/art-pass-2-asset-first-plan.md`，主方向改为 pixel-art pseudo-2.5D。
- 更新 `docs/art-pass-1/art-pass-1-report.md`，补充“从概念图转向游戏资产”的路线修正。
- 更新 `AGENTS.md` 与 `cloud_island_harness_development_manual (1).md`，写入像素风 Art Pass 决策。
- 更新 `docs/art-pass-2/prompt_island_plot_tiles.txt` 和 `docs/art-pass-2/prompt_weather_machines.txt`，改为像素风 sprite sheet prompt。
- 更新本 handoff，明确下一轮 Art Pass 2 不继续做大主画面图。

当前停止点：

- Art Pass 2 在用户叫停前已生成 `docs/art-pass-2/asset_board_island_plot_tiles.png`。
- 这张图是 hybrid chunky / 高清插画倾向，不符合新的像素风决策。
- 保留它作为“错误方向参考”，不要继续基于它拆图或接入。
- 第二张 `weather machines` 未生成。

新的 Art Pass 2 方向：

```text
生成像素风游戏素材，而不是生成概念图。
资产组：岛、云、地块、机器、作物阶段、特效。
先验证 pixel-art asset board / sprite sheet，再考虑正式拆分和接入。
```

仍然禁止：

- 不改代码。
- 不接入素材。
- 不新增玩法、资源、机器、作物系统。
- 不把整张生成图当游戏背景。

## 上一次文档任务

任务：生成 Art Pass 0 执行计划，用于验证伪 2.5D 美术方向。

完成内容：

- 新增 `docs/art-pass-0-plan.md`。
- 明确 Art Pass 0 只验证方向，不生成正式资源、不接入素材、不改代码。
- 定义 3 张验证图：
  - 主画面概念图。
  - 资产风格板。
  - 伪 2.5D 锚点草图。
- 为每张验证图写入 image generation prompt。
- 为每张验证图写入验收标准和拒收条件。
- 明确后续适合拆成 PNG sprite 的对象，以及继续使用 Pixi Graphics 的动态反馈元素。
- 保持不扩展玩法、不新增资源、不新增机器、不新增作物系统。

本轮改动文件：

- `docs/art-pass-0-plan.md`
- `docs/cloud-island-handoff.md`

未做内容：

- 未改代码。
- 未生成正式资源。
- 未接入素材。
- 未调用 image generation。
- 未新增玩法、资源、机器、作物系统。
- 未写长期商业美术计划。

验证：

- 本轮只改 Markdown 文档，未运行 build/typecheck。
- 已确认 Art Pass 0 文档包含目标、三张验证图、生成提示词、验收标准、后续资产拆分建议和不做事项。

## 上一次文档任务

任务：同步 Art Direction / 伪 2.5D 视角策略到项目规范文档。

完成内容：

- 更新 `AGENTS.md`：将“禁止 2.5D”修正为“禁止真正 2.5D/isometric 系统”，允许后续伪 2.5D 美术方向。
- 更新 `AGENTS.md`：补充 View Strategy，明确视觉、逻辑、UI、玩法分工。
- 更新 `AGENTS.md`：明确 image generation 只能在用户批准的 Art Pass 中使用，不能混入 gameplay / bugfix / polish / balance。
- 更新 `cloud_island_harness_development_manual (1).md`：加入两阶段视角策略，区分 v0.1 greybox 与后续 Art Pass / Visual Upgrade。
- 更新 `cloud_island_harness_development_manual (1).md`：补充伪 2.5D Art Pass 规则、允许范围、禁止范围和推荐 Pixi 层级。
- 更新本 handoff：新增当前视角策略和恢复上下文。

本轮改动文件：

- `AGENTS.md`
- `cloud_island_harness_development_manual (1).md`
- `docs/cloud-island-handoff.md`

未做内容：

- 未改游戏代码。
- 未新增资产。
- 未调用 image generation。
- 未新增玩法、资源、机器或 v0.2 系统。
- 未改技术栈。

验证：

- 本轮只改 Markdown 文档，未运行 build/typecheck。
- 已确认三份文档均写入“伪 2.5D 视觉允许、真正 2.5D 系统禁止”的边界。

## 上一次开发任务

任务：v0.1 polish 第二批，只做构图、云运动、机器反馈、10 分钟节奏验证。

完成内容：

- 小岛整体视觉规模放大，当前成为画面主视觉。
- 小岛主体移动到画布下方约 60%-65% 区域。
- 天空层级调整：太阳位置上移，增加远景云层/天空色带。
- 中央画布白边框弱化，减少灰盒容器感。
- 云从画布外完整进入/离开，接近边缘时淡出，避免明显半朵云裁切。
- 云视觉范围与点击容器保持一致。
- 小水槽放大，并保留命中闪光/水位表现。
- 风车放大，叶片旋转速度提高。
- 风车解锁后显示轻微风线，强化“云被风影响”的反馈。
- 太阳棱镜激活时，小岛区域出现暖色光照 wash。
- 新增轻量 10 分钟模拟脚本：`npm run simulate:ten-minute`。
- 模拟脚本输出 1/3/5/7/10 分钟资源、升级数量和机器解锁状态。

本轮改动文件：

- `src/game/GameCanvas.tsx`
- `src/game/createPixiApp.ts`
- `src/game/state/gameState.ts`
- `src/game/systems/saveSystem.ts`
- `src/styles/app.css`
- `package.json`
- `scripts/simulate-ten-minute.mjs`
- `docs/cloud-island-handoff.md`

未做内容：

- 未新增玩法系统。
- 未新增资源。
- 未新增机器。
- 未新增剧情。
- 未新增美术资产。
- 未调用 image generation。
- 未改技术栈。
- 未改玩法功能、资源类型、机器类型。

## 最近一次验证

已执行：

```bash
npm run typecheck
npm run build
npm run simulate:ten-minute
```

结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run simulate:ten-minute`：通过。
- `http://127.0.0.1:5173`：返回 `200`。
- Chrome headless runtime 粗查：未捕获明显 `Uncaught / TypeError / ReferenceError / SyntaxError / Failed to load resource / ERR_`。
- 截图可见放大后小岛、远景云层、弱化边框、作物进度条和“下一目标”UI。
- `src/game/GameCanvas.tsx` 仍确认没有 `removeChildren`。

模拟结果摘要：

```text
1:00  | water=2.2    cloudCotton=11.0 sunlight=2.5  | upgrades=4  | machines=none
3:00  | water=129.4  cloudCotton=3.0  sunlight=12.0 | upgrades=12 | machines=rainCollector, windmill
5:00  | water=686.0  cloudCotton=7.0  sunlight=14.5 | upgrades=12 | machines=rainCollector, windmill, sunPrism
7:00  | water=1295.3 cloudCotton=37.0 sunlight=20.0 | upgrades=12 | machines=rainCollector, windmill, sunPrism
10:00 | water=2209.4 cloudCotton=25.0 sunlight=15.6 | upgrades=12 | machines=rainCollector, windmill, sunPrism
```

模拟结论：

- 当前脚本在保守命中模型下仍显示升级/机器节奏偏快，3 分钟已接近买满核心升级并解锁收集器/风车。
- 这只是估算脚本，不是实机自动测试；下一轮若继续 polish，应优先做手动试玩计时，判断是否需要调高机器成本或降低收益。

注意：

- 当前目录不是 git repository，`git status` 不可用。
- 本轮没有做完整交互自动化测试，只做了类型、构建、模拟脚本、服务和 headless 运行检查。

## 2026-05-14 天气反应堆数值调试记录

- 新增暂停按钮：暂停后经济 tick 停止，云层点击也暂停；升级购买仍可操作，方便玩家停住状态读数值。
- 新增“小数显示”模式：主资源、速率、升级收益描述、升级花费、缺口提示都走原始 JavaScript 数字字符串，不做整数化、半步化或倍率尾零压缩。
- 删除 `云层回响 / cloudBurst`：该升级与冷却倍率、厚云倍率叠加后会让“变为几倍”的显示随当前状态浮动，调试体验差。
- 雨阶现在同时加成点击收益：点击公式改为 `基础点击 * 雨阶点击倍率 * 厚云倍率 * 冷却倍率`，用雨阶本身压缩 reset 后重复买点击升级的折磨感。
- 模拟脚本已同步删除 `cloudBurst`，当前 `npm run simulate:weather-strategies` 结果：balanced-run 到 12 雨阶约 41:17，第一次季风循环约 65:25；current-auto 到 12 雨阶约 47:51。

## 2026-05-15 雨阶倍率与小数显示修正

- 小数显示不再输出完整 JavaScript 浮点尾巴，统一四舍五入到最多 3 位；极小值才使用科学计数法。
- 雨阶改为 IMR Rank 风格的全局产出乘区：每 1 雨阶让所有天气活力收入乘以 `1.25`，包括点击、雨滴生产和自动细雨。
- 删除上一版“雨阶只补点击”的曲线，原因是玩家直觉更接近“reset 货币/等级提升整轮主资源产出”。
- 雨阶需求增长从 `1.68` 提高到 `2.15`，用于抵消 `1.25^雨阶` 全局倍率带来的加速。
- 升级卡片改为描述在上、成本在下方右对齐，避免小数模式下成本挤到描述后面。
- 模拟脚本新增 `value-greedy` 策略：用 45 秒投影估算每个可买升级的天气收益/成本，用来接近熟练玩家的购买节奏。当前结果：balanced-run 到 12 雨阶约 49:14，value-greedy 到 12 雨阶约 22:20。

## 当前已知问题

1. 10 分钟节奏可能偏快  
   影响：中到高  
   建议时机：v0.1 polish  
   说明：模拟脚本显示 3-5 分钟已完成大量升级和机器解锁。需要用实机计时验证，再决定是否调整成本或收益。

2. `GameCanvas.tsx` 仍然偏大  
   影响：中  
   建议时机：v0.1 polish  
   说明：云、雨滴、作物、机器、飞字、命中检测都在一个文件里。下一轮如果继续 polish，可考虑只做轻量拆分，但不要大重构。

3. UI 仍然每 100ms 随经济 tick 更新  
   影响：中  
   建议时机：v0.1 polish  
   说明：当前规模可接受，后续 UI 增多后可能浪费。

4. 自动化感仍偏弱  
   影响：中  
   建议时机：v0.1 polish 或 v0.2  
   说明：机器会辅助，但云仍需手动点击，作物仍需手动收获。不要在当前 polish 轮直接加自动下雨或自动收获，除非用户明确批准。

5. 存档没有版本号  
   影响：中  
   建议时机：v0.1 polish  
   说明：未来改状态结构时需要加 save version / migration。

6. 当前没有真实 SVG/PNG 美术资产  
   影响：低到中  
   建议时机：用户明确要求 art pass 时  
   说明：目前全部是 Pixi Graphics 程序图形。用户已明确上一轮不要做 image art pass。

## 下一轮建议

优先级从高到低：

1. 做一次实机手动试玩计时，记录 1、3、5、7、10 分钟节点，并和 `npm run simulate:ten-minute` 对照。
2. 如果实机也偏快，优先微调机器成本/升级成本，不要新增系统。
3. polish 作物成熟提示和收获节奏，让“该点作物了”更明显。
4. 减少 React UI 的 tick 刷新压力，必要时把显示刷新频率降到 250ms 或拆出 memo。
5. 给 localStorage 存档加 version 字段和迁移兜底。

暂时不要做：

- 不要扩 v0.2 内容。
- 不要新增新资源。
- 不要新增新机器。
- 不要做大 UI 重构。
- 不要做 image generation。

## 新窗口恢复提示词

```text
请在 F:\Cloud_Farm 继续《云上小岛》v0.1。先读取：
1. AGENTS.md
2. cloud_island_harness_development_manual (1).md
3. docs/cloud-island-handoff.md
4. docs/visual-route-archive-pseudo-2-5d.md
5. docs/visual-route-2d-lightweight-plan.md
6. docs/cloud-island-demo-technical-report.md

当前项目已完成 v0.1 核心玩法闭环，但视觉路线经历了多次探索。

重要路线决策：伪 2.5D / 像素网格岛 / Phaser 网格岛路线已经归档废弃，不要继续沿这条线修补。当前新方向是轻量 2D 漂浮小岛，重点是清爽、可读、愿意上手玩的轻放置体验。

当前代码里仍存在 Phaser 实验：
- package.json 里有 phaser 依赖。
- src/phaser/PhaserGameCanvas.tsx
- src/phaser/scenes/CloudIslandScene.ts
- App.tsx 当前可能仍引用 PhaserGameCanvas。

这些是已归档路线残留，不代表未来方向。下一轮必须先做 2D Route Technical Reset SPEC，决定：
1. 回到 PixiJS，还是保留 Phaser 但只做普通 2D 舞台。
2. 是否删除或隔离 src/phaser。
3. 如何恢复/保留现有 v0.1 玩法闭环。
4. 新 2D 舞台的最小布局：云、岛、3 块作物、3 台机器、轻量 HUD。

继续时不要加新系统、新资源、新机器、新剧情，不要做 image art pass，除非我明确要求。每轮结束后更新 docs/cloud-island-handoff.md。
```
# 2026-05-15 Weather Reactor v11 公式解耦与交接文档

本轮目标是把当前玩法状态整理成可交接给外部 GPT 深度讨论的资料，同时修掉两类直接阻碍讨论的问题：升级文案倍率浮动、大数显示溢出。

已改代码：

- `src/game/economy/constants.ts`：经济版本更新为 `Batch 1 / economy v11`，存档 key 更新到 `cloud-island-weather-reactor-v11`；季风雨阶要求改为 `10`。
- `src/game/economy/format.ts`：大数显示改为科学计数法，普通显示不再使用 `M/B/T` 或更高字母后缀；精确显示最多 3 位小数，大数用科学计数法。
- `src/game/economy/upgrades.ts`：升级描述改为显示升级自身的局部倍率，不再用全局总收益比值，避免 `雨滴生成 x4` 显示成 `3.946` 这类状态相关倍率。
- `src/game/economy/resets.ts`：季风循环、云核收益检查统一使用 `10` 雨阶要求。
- `src/App.tsx`：季风按钮、下一目标、提示文案统一改为 `10` 雨阶。
- `scripts/simulate-weather-strategies.mjs`、`scripts/simulate-weather-reactor.mjs`：模拟脚本同步 10 雨阶和科学计数法。

新增文档：

- `docs/weather-reactor-current-gameplay.md`
- `docs/weather-reactor-economy-curves.md`
- `docs/weather-reactor-technical-implementation.md`
- `docs/weather-reactor-upgrade-reset-reference.md`
- `docs/weather-reactor-external-discussion-brief.md`

当前模拟结论：

- 第 1 雨阶：约 5 到 15 分钟，取决于策略。
- 第 10 雨阶：稳定策略约 72 分钟，贪心策略可能更久。
- 第一次季风：约 134 到 156 分钟。
- 当前 10 雨阶仍偏长，第一次季风也偏远。下一轮应整体重做雨阶需求表、季风目标和生产者链成本，不建议继续用零碎小修追平衡。

仍需注意：

- 公式仍使用 JavaScript `number`，不是 Decimal。当前量级可跑，但长期内容需要封装大数层。
- 生产者链里 `dropletSeedRate + droplets`、`rootWakeRate + roots` 是设计上的 producer 耦合，但不能拿全局总收益比值去写升级文案。
- `cooldownDraft` 仍保留在类型和定义中但不显示，后续可在经济内容配置重构时删除。
