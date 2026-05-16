# Weather Reactor Simulation Strategy Notes

更新时间：2026-05-16

本文记录 `patient-multiplier-human` 继续拟合真人策略的讨论结论与第一版实现结果。它不是最终平衡表，但现在已经作为一版可解释策略写入 `scripts/simulate-weather-strategies.mjs`，后续继续用模拟结果和人工试玩反馈小步校准。

## 1. 当前目标

目标是让 `patient-multiplier-human` 成为主要真人基准策略。

预期关系：

```text
patient-multiplier-human 应该最快或接近最快
guided-human / comfort-first / bad-but-plausible / new-player-visible 应该慢于 patient
roi-greedy 继续作为漏洞探针，不作为正常真人基准
```

原因：

- 真实玩家会粗略比较等待关键倍率、当前可买升级、立即 reset 的收益。
- 固定 UI 顺序购买不应比有判断的真人策略更快。
- 当前 `patient-multiplier-human` 还偏固定顺序，只带少量等待规则。

## 2. 截图讨论纳入

截图中建议的策略建模路线：

1. 决策树 / 行为树
   - 适合当前阶段。
   - 可解释、可调试。
   - 能回答“为什么此时等 `weatherAmplifier`，而不是买 `dropletSeed`”。

2. 启发式评分 + 短 rollout
   - 对每个可选动作估算：
     - 等待时间。
     - 购买后的被动提升。
     - 是否推进下一雨阶 / 季风 / 风暴前线 / 气候改写。
     - 是否会牺牲关键倍率。
   - 向前模拟约 `30-180` 秒，选择收益最高的动作。

3. 决策树学习 / 监督学习
   - 可先让强化启发式策略跑多局，再用决策树拟合。
   - 得到的策略仍可读，适合作为后续研究方向。

4. 强化学习神经网络
   - 理论上可行。
   - 当前成本高、解释性差，容易学会利用数值漏洞。
   - 不适合作为第一版平衡依据。

推荐的主策略结构：

```text
状态特征：
当前资源 log、被动/s log、点击等效/s log、各升级等待秒数、各升级买后收益、
当前 milestone、是否可 reset、reset 后收益

动作：
买某升级、等待 N 秒、凝雨阶、季风、风暴前线、气候改写、天空脉冲

决策：
优先比较“等待关键倍率” vs “买当前可买升级” vs “立即 reset”
```

最稳的下一步：

```text
先做一个可解释的真人策略引擎，本质是决策树 + ROI 评分 + 短期预测。
神经网络可作为后期压力测试工具，不作为第一版平衡依据。
```

## 3. 目前代码里 patient 的主要偏差

当前模拟动作顺序大致是：

```text
大 reset
永久升级
气压 / 风暴 / 气候层升级
雨阶前保护性首级本轮升级
patient 等待关键本轮升级
按 patient 固定顺序买本轮升级
雨阶 reset
```

主要偏差：

- 对雨阶 reset 之前是否买升级的判断已被特殊处理，但大 reset 仍优先级很高。
- `patient` 等待逻辑只覆盖 `weatherAmplifier / windEye / heavyRain / monsoonPull`。
- 本轮升级仍是阶段固定顺序，不是真正逐项比较。
- 气压、风暴、气候层决策不是基于短期收益和 reset 推进的评分。

## 4. 真人决策：雨阶 reset

用户确认：

- 雨阶也是关键 reset。
- 雨阶 reset 后本轮升级不保留。
- 因此达到雨阶后，正常策略应立刻 reset。

结论：

```text
canClaimRainRank(state) 为 true 时，patient 应优先凝雨阶。
不应为了购买本轮升级而延迟雨阶。
```

适用范围：

- `weatherAmplifier` 不应阻止雨阶 reset。
- `windEye` 不应阻止雨阶 reset。
- `heavyRain` 不应阻止雨阶 reset。
- `monsoonPull` 不应阻止雨阶 reset。

理由：

```text
本轮升级在雨阶 reset 后清空，没有后效性。
如果已经能 reset，继续买本轮升级通常是浪费。
```

## 5. 真人决策：点击升级

用户给出的判断例子：

```text
点击：125 / click
点击约等效：64 / s
被动：128 / s
点击升级成本：10000，买后 625 / click，约 313 / s
天气增幅成本：10000，买后被动 128 * 4 = 512 / s，实际约 672 / s
```

结论：

- 当被动已经明显超过点击等效收益时，点击升级会逐渐退出优先级。
- 即使点击升级和天气增幅成本相同，天气增幅带来的被动收益通常更优。
- 真人判断不是精确公式，而是数字敏感直觉：看到同成本下 `x4` 被动收益明显更大，就不再买点击。

可转化为模拟规则：

```text
clickEquivalentPerSecond = clickAmount / clickCooldown
如果 passivePerSecond >= clickEquivalentPerSecond 附近，
并且 weatherAmplifier 的等待时间与 cloudTouch 接近，
则 patient 优先 weatherAmplifier。
```

待确认：

- 点击等效是否继续使用 `/2`，还是用实际 `getClickCooldownSeconds()`。
- `cloudTouch` 退出阈值是 `passive >= clickEquivalent`，还是需要更保守，例如 `passive >= 0.7 * clickEquivalent`。

## 6. 真人决策：等待天气增幅

用户给出的判断例子：

```text
当前资源：400
当前被动：20 / s
下一个天气增幅成本：1000
等待到 1000 需要 30s
买后被动：80 / s
买后回到 1000 只需要 12.5s
同样 30s 能获得 2400
因此等待天气增幅很赚
```

结论：

- 真人会比较“现在等待关键倍率”与“买后回本速度”。
- 没有固定阈值，但如果买后同等时间能显著超过当前资源，就会等待。
- 这更像短期 rollout，不只是 ROI 公式。

可转化为模拟规则：

```text
对于 weatherAmplifier：
1. 估算 waitToCost。
2. 假设等待并购买。
3. 估算购买后同等 waitToCost 时间内可获得的资源。
4. 如果购买后收益显著高于不买时收益，则等待。
```

建议先用保守参数：

```text
waitToCost <= 90s
postBuyGainDuringSameWait >= currentResource 或明显超过 noBuyGain
```

## 7. 真人决策：生产者 log 链

用户确认：

- `rootWake / cloudBloom / windEye` 的头几次解锁能买就买。
- 主要中心仍是直接被动倍率，也就是 `weatherAmplifier` 这类直接乘区。
- 生产者 log 链是第二优先级。
- 到后面大概攒到当前成本的 `100x` 左右，会批量购买这些 log 乘区升级。

可转化为模拟规则：

```text
若 rootWake / cloudBloom / windEye 未解锁，且可买，则买首级。
若已解锁：
  不应频繁用小钱阻断 weatherAmplifier / heavyRain / monsoonPull。
  当 currentWeather >= nextProducerCost * 100 左右，可以连续补买 log 链。
```

待确认：

- `100x` 是对每个生产者升级各自成本，还是对当前阶段最便宜的一组生产者成本。
- 批量购买时是否按 `windEye -> cloudBloom -> rootWake`，还是按当前最便宜 / 最缺的生产链补齐。

## 8. 真人决策：季风牵引

用户确认：

- 如果 `monsoonPull` 还差约 `1min`，会倾向等待。
- 如果还差约 `2min`，会先看是否有新的倍率升级可以买。
- 如果买新倍率后能把等待压缩到 `1min` 内，就先买倍率。
- 如果没有这种升级，就继续等 `monsoonPull`。

可转化为模拟规则：

```text
如果 monsoonPull wait <= 60s:
  等 monsoonPull
如果 monsoonPull wait <= 120s:
  检查 weatherAmplifier / heavyRain / 关键倍率是否可买或短等
  如果买后 monsoonPull wait <= 60s:
    先买该倍率
  否则等 monsoonPull
```

## 9. 真人决策：季风 reset

用户确认后的当前理解：

- 第一次季风前没有云核永久升级可买。
- 季风后永久升级消耗云核，不消耗天气活力。
- 云核本身当前没有像雨阶那样的直接全局倍率。
- 因此默认不应为了“榨干本轮天气活力”而延迟季风。
- 如果云核攒一攒能买到下一轮永久升级，可以考虑短等。
- 如果要等很久，不如立刻多次季风 reset，小量多次攒云核。

当前代码事实应作为后续确认点：

```text
云核本身当前不提供隐藏线性倍率或隐藏指数倍率。
云核主要通过永久升级成本与解锁产生作用。
```

当前模拟规则建议：

```text
canRunMonsoon(state) 为 true 时，默认立刻季风。
只有当极短等待能让本次季风多拿 1 个云核，
并且这个云核刚好解锁关键永久升级时，才考虑等待。
```

当前实现：

```text
第一版先保持 canRunMonsoon(state) 直接季风。
短等 +1 云核的例外尚未实现。
```

## 10. 尚未回答的问题

用户尚未试玩 9 以后的气压 / 风暴 / 气候层，因此以下暂不固化：

- 气压层优先 `lowPressure / updraft`，还是 `pressureGauge`。
- 风暴层优先自动化/保留，还是直接推进速度。
- 气候法则优先最强法则，还是便宜优先。

临时处理：

```text
先不要让这些后期层级的 patient 策略过度拟合。
等用户试玩到对应阶段，或我们从模拟输出中定位明显错误后再调整。
```

## 11. 下一步候选实现顺序

第一版已按以下顺序实现到 `scripts/simulate-weather-strategies.mjs`：

1. 修正雨阶 reset 优先级
   - patient 达到雨阶后直接 reset。
   - 删除或限制雨阶前 `buyFirstMissingRunUpgrade` 对 patient 的影响。

2. 增加 `weatherAmplifier` 短 rollout 等待
   - 用等待时间、买后同等时间收益、当前可买升级收益比较。

3. 改写点击退出逻辑
   - 用被动/s 与点击等效/s 的比较决定是否继续买 `cloudTouch`。

4. 增加生产者 log 链批量补买规则
   - 首级可买就买。
   - 后续等资源达到成本约 `100x` 再补。

5. 增加 `monsoonPull` 等待与“先买倍率压缩等待”的规则。

6. 季风 reset 默认立即执行。

尚未实现：

- 季风前短等 `+1` 云核并刚好购买关键永久升级的例外。
- 气压 / 风暴 / 气候层的真人决策拟合。
- 让 `patient-multiplier-human` 稳定快于 `comfort-first` / `bad-but-plausible` 的后续策略调优。

## 12. 第一版实现后的模拟结果

命令：

```text
npm run simulate:weather-strategies
```

结果：

```text
patient-multiplier-human:
  第 10 雨阶：34:29
  第一次季风：36:22
  第一风暴前线：1:19:05
  第一次气候改写：2:33:14
  天空心脏：2:46:19
  最长静默：3:55
```

## 13. P0-E：guided 过快与 new-player 卡死的诊断

本轮先检查两条异常路线：

```text
guided-human:
  终局 1:07:55
  仍然过快，且简单改成雨阶优先 reset 没有实质改善。

new-player-visible:
  原状态卡在第二风暴前线附近。
  修改风暴层顺序后可跑通，但终局提前到 1:25:49。
```

关键发现：

- `buyLayerUpgrade()` 是按顺序买“第一个当前买得起的层级升级”，所以 `stormOrder` 会强烈决定第一次 4 个风暴胞的支出。
- 原 `new-player-visible` 会买成 `frontMemory + rainOverload x2`，没有买到 `thunderUpdraft`，因此第二风暴前线前缺生产者 orders。
- 改成 `frontMemory -> thunderUpdraft -> rainOverload` 后，新手路线不再卡死，但会明显快于 patient。
- 因此 `thunderUpdraft` 不是单纯 UI 引导问题，它暴露出风暴后曲线对生产者 orders 过敏。
- `guided-human` 目前不适合作为推荐路线基准。它应继续作为“强提示 / 压力路线”告警；真正推荐路线后续应基于真人决策树或短 rollout 重写。

当前保留的模拟器口径：

```text
patient-multiplier-human 仍是主要 hard gate。
new-player-visible 增加 ending too fast warning。
guided-human 继续只作为 warning 诊断路线。
```

## 14. P0-F：统一风暴主干后的诊断

本轮将所有策略的 `stormOrder` 临时统一为：

```text
frontMemory -> thunderUpdraft -> rainOverload -> stormBatch -> windEyeRelic -> frontScar -> stormPrism
```

目的：

```text
验证“第一风暴后按最优解购买”是否只是无后效性的局部优化。
```

结果：

| 策略 | 旧终局 | 统一风暴主干后 | 变化 |
|---|---:|---:|---:|
| patient-multiplier-human | 2:46:19 | 2:09:09 | 快 37 分 |
| comfort-first | 2:14:59 | 1:33:00 | 快 42 分 |
| bad-but-plausible | 2:18:51 | 1:37:11 | 快 41 分 |
| new-player-visible | 1:25:49 | 1:25:49 | 基本不变 |
| guided-human | 1:07:55 | 1:04:27 | 小幅变快 |

关键结论：

- 第一风暴后的风暴图谱顺序不是无后效局部选择，而是永久路线分叉。
- `thunderUpdraft` 当前同时给生产者公共乘区和风暴指数奖励，导致它成为隐藏必选项。
- 若玩家没有优先点到 `thunderUpdraft`，可能被惩罚几十分钟；这有“研究树最优解”风险。
- 用户当前倾向把第一风暴后的必需组合改成显式主干或第二风暴前置条件。
- 后续调参应以“所有玩家都完成风暴主干”为共同基线，再拉长第二风暴后到终局。

模拟器显示口径也已调整：

```text
旧：rate 1e11.88/s
新：rate 7.6e11/s
```

结论：

- 新 patient 策略仍能通关，并且没有长静默。
- 第一次季风略早于当前目标窗口。
- P0-D 后，气候改写到终局从约 3 分钟拉长到约 13 分钟。
- 新 patient 更像真人，但暂时慢于 `comfort-first`，后续需要继续调整策略评分和数值曲线。

## 13. 风险

- 如果先调数值曲线，再修策略，容易把曲线调歪。
- 如果 patient 过度聪明，可能变成隐藏的 ROI greedy。
- 如果 patient 仍按固定顺序，它不可能稳定代表真人最优策略。
- `roi-greedy` 可以继续暴露漏洞，但不能替代真人策略。
