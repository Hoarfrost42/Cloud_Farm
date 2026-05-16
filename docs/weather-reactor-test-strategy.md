不要把可玩性验证建立在“你亲自完整玩很多遍”或“AI/脚本像熟练玩家一样聪明”上。你要把游戏改造成：低智能脚本也能验证、玩家走错路也不会死、上线后能快速定位问题、数值可以小步热修。

你现在的风险点很明确：第一季风前已经有可用基线，当前 v12 Formula C 的模拟结果和你的人类试玩已经同量级；但是季风后的自动化和后续曲线还没有充分试玩，且文档也指出如果继续做到长线，需要处理 JS number 的上限问题。 当前经济核心已经从 App.tsx 拆到 src/game/economy，并且已有模拟脚本入口，这正好说明你现在应该补的是“验证基础设施”，不是继续靠手玩。

结论先说

你需要做四件事：

1. 冻结第一季风前内容，不再大改。
2. 把后续内容设计成阶段化、保底化、可跳点测试的结构。
3. 做一个“引导路线 bot”，而不是试图做最优 bot。
4. 上线前加入调试报告、存档导出、阶段保护、永久升级免费重置。

更直接一点：

你没有时间充分测试，那游戏设计本身就必须更“抗坏路线”。

不要让玩家必须靠正确路线才能推进。短期推出的小品级增量游戏，宁可路线略宽、奖励略慷慨、终局略短，也不要出现“玩到 2 小时后才发现自己路线错了”的情况。

1. 你现在不该追求“聪明模拟”，而该追求“游戏内推荐路线 = 测试路线”

你担心脚本不够聪明，这个担心是对的。但解决方法不是写一个懂所有策略的 bot，而是把游戏设计成：

玩家看到的推荐行动
=
模拟器执行的行动
=
你认为普通玩家应该走的路线

也就是说，你需要实现一个核心函数：

getRecommendedAction(state)

它不需要完美，只需要稳定。它的职责是告诉玩家：

当前推荐：购买 云团孕育 Lv.3
原因：预计 68 秒回本，并且能明显提高根系积累速度

模拟器就执行这个推荐行动。

这样你得到的不是“最优玩家模拟”，而是“被游戏正确引导的普通玩家模拟”。这比最优 bot 更有价值。

推荐结构：

type RecommendedAction =
  | { type: "buy-upgrade"; upgradeId: UpgradeId; reason: string }
  | { type: "rain-reset"; reason: string }
  | { type: "monsoon-reset"; reason: string }
  | { type: "storm-reset"; reason: string }
  | { type: "wait"; seconds: number; reason: string };

function getRecommendedAction(state: GameState): RecommendedAction {
  const candidates = getAvailableEconomicActions(state);

  return candidates
    .map(action => scoreAction(state, action))
    .sort((a, b) => b.score - a.score)[0].action;
}

评分不需要复杂。先用这个：

score =
  经济收益分
  + 里程碑推进分
  + 自动化舒适分
  - 回本时间惩罚
  - 过早 reset 惩罚

核心是：你的 UI 和模拟器必须共用同一个推荐逻辑。
如果推荐 bot 能通关，玩家照着 UI 大概率也能通关。
如果推荐 bot 卡住，说明不是 bot 不聪明，而是你的游戏指导失败。

2. 不要从头玩完整流程；做“状态书签”

你现在最大的问题是没有时间一遍遍从 0 玩到 1e308。所以你需要在开发版里加入状态书签。

至少做这些按钮：

跳到：第一次季风前
跳到：第一次季风后，拥有 4 云核
跳到：第二季风后
跳到：第一风暴前线开始
跳到：第一风暴前线后
跳到：第一次气候改写前
跳到：第一次气候改写后
跳到：天空心脏前

每个书签不是随便塞资源，而是用标准状态生成器：

function createMilestoneState(id: MilestoneId): GameState

例如：

createMilestoneState("after-monsoon-1") {
  return {
    weather: 0,
    rainRanks: 1,
    monsoonCycles: 1,
    cloudCores: 4,
    totalCloudCores: 4,
    permanentUpgrades: [],
    upgrades: {},
    resources: emptyResources(),
    bestWeather: 1e20,
  };
}

这会让你每次改后期时，不需要重新玩前 40 分钟。

你要养成一个开发习惯：

改第一季风后系统 -> 从 after-monsoon-1 书签测
改风暴前线 -> 从 storm-front-entry 书签测
改天空心脏 -> 从 sky-heart-entry 书签测

这比“再完整玩一遍”有效得多。

3. 做“录制 / 回放”，让你的一次人类试玩复用很多次

你不需要一直玩。你需要把你玩过的一次路线记录下来。

开发版记录每个玩家动作：

type PlayTraceEvent = {
  time: number;
  action:
    | "click-cloud"
    | "buy-upgrade"
    | "rain-reset"
    | "monsoon-reset"
    | "buy-permanent"
    | "storm-reset"
    | "climate-reset";
  payload: Record<string, unknown>;
  stateHashBefore: string;
  stateHashAfter: string;
};

导出成 JSON：

trace-first-monsoon-skilled.json
trace-after-monsoon-guided.json
trace-sky-heart-test.json

然后写一个 replayer：

replayTrace(initialState, trace)

它不需要等真实时间，只要按 trace 的时间间隔快进 tick。这样你改 bug 或改 UI 后，可以自动验证：

同一条人类路线是否还能到达同一里程碑？
每个动作后状态是否没有 NaN / Infinity / 负数？
reset 保留项是否正确？

这件事非常重要。

你作为熟练玩家只需要认真玩几段，不需要每次都完整重玩。

4. 脚本不够聪明时，至少跑 5 条“低智能但有用”的路线

不要只跑一个策略。也不要试图一开始就写最优策略。

你需要这 5 条：

策略	作用
guided	执行 getRecommendedAction，代表被 UI 正确引导的普通玩家
roi-greedy	买预计回本最快的东西，代表效率玩家
visible-button	买当前看起来最显眼/最便宜的东西，代表新手
comfort-first	优先自动化、永久舒适升级，代表休闲玩家
bad-but-plausible	会犯一些常见错误，但不应彻底卡死

其中最重要的是 guided 和 bad-but-plausible。

验收标准：

guided 必须稳定通关。
roi-greedy 可以更快，但不能快到击穿全部内容。
visible-button 可以慢，但不能永久卡死。
comfort-first 可以慢，但必须明显更舒服。
bad-but-plausible 可以落后，但必须能靠保底机制恢复。

你当前文档里已经有多策略模拟，且 auto-rush 会卡住，这正说明“只跑一种策略”不够。 接下来要做的不是让 auto-rush 也变成高手，而是确认 UI 不会诱导玩家走 auto-rush 那种死路。

5. 给游戏加“阶段保护”，防止玩家被坏数值困死

因为你没有太多测试时间，所以必须设计保护机制。这个机制不是作弊，而是增量游戏里很合理的“防卡死保险”。

5.1 每个阶段有最大等待时间

例如：

const STALL_LIMITS = {
  rainRankEarly: 8 * 60,
  rainRankLate: 12 * 60,
  firstMonsoonPush: 10 * 60,
  postMonsoonReturnToRainRank6: 8 * 60,
  stormFrontPush: 18 * 60,
  climateRewritePush: 25 * 60,
  skyHeartPush: 30 * 60,
};

如果玩家在某阶段超过预期时间还没有推进，就逐步出现一个主题化的补救机制：

气压正在聚集……
当前阶段推进速度 +10%

再卡一段时间：

风暴不稳定度上升……
当前目标需求 -10%

再卡：

天空回声出现……
推荐下一个关键升级，并临时提高其收益

你可以把它包装成“天气系统自我纠偏”，不要叫“动态难度”。

5.2 公式示例
function getStallAssistMultiplier(stageElapsed: number, targetSeconds: number): number {
  const over = stageElapsed - targetSeconds;
  if (over <= 0) return 1;

  const steps = Math.floor(over / 300); // 每 5 分钟一档
  return Math.min(10, 1 + steps * 0.5);
}

或者更适合大数的写法：

function getStallAssistExponent(stageElapsed: number, targetSeconds: number): number {
  const over = stageElapsed - targetSeconds;
  if (over <= 0) return 0;

  return Math.min(8, Math.floor(over / 300) * 1);
}

然后：

stallAssistMultiplier = 10 ** getStallAssistExponent(...)

也就是最多给 1e8 的阶段救援，不会无限炸穿。

这对短期上线非常有价值。因为哪怕你某一段数值调得偏硬，玩家也不会彻底死在那。

6. 所有永久升级必须允许免费重置

你后续会加入季风后、中间层、终局系统。玩家一定会买错永久升级。

如果永久升级不可重置，你就必须把每条路线都测得非常严。你没有这个时间。

所以短期上线版建议：

永久云核天赋：可免费重置
风暴图谱：可免费重置
气候法则：可免费重置

至少在主线通关前免费重置。

通关后如果你想保留“构筑感”，可以再加限制。但小品级主线期间不要惩罚玩家。

这会极大降低平衡风险：

玩家买错 -> 重置永久点 -> 继续玩

而不是：

玩家买错 -> 卡死 -> 退游
7. Reset 收益必须有保底，不能只奖励最优玩家

后续层级要遵守这个规则：

第一次完成某层 reset，至少能买到 2–3 个关键永久升级。

不要让玩家辛苦一小时只拿到 1 点，然后还不知道买什么。

你现在第一季风至少给 4 云核，这个方向是对的。 后续也应该这样。

例如：

风暴前线 reset
stormCellsGain =
  2
  + stormFrontClears
  + floor((bestWeatherExp - targetExp) / 25);

最低 2。

气候改写 reset
climateThreadsGain =
  1
  + floor((bestWeatherExp - targetExp) / 40);

最低 1，但第一条气候法则必须足够强。

天空心脏终局

不要再要求 reset。
最后一段应该是明确的终局冲刺，不要让玩家在 1e250 后又被迫大重置一次。

8. 后续内容尽量做成“表驱动”，不要做复杂 emergent sandbox

你没有充分测试时间，所以不要让后半段变成复杂自由组合经济。

后续阶段应该高度表驱动：

const MAIN_MILESTONES = [
  { id: "monsoon-1", targetExp: 20, expectedMinutes: 40 },
  { id: "storm-front-1", targetExp: 70, expectedMinutesAfterPrevious: 35 },
  { id: "storm-front-2", targetExp: 115, expectedMinutesAfterPrevious: 45 },
  { id: "climate-1", targetExp: 160, expectedMinutesAfterPrevious: 50 },
  { id: "climate-2", targetExp: 230, expectedMinutesAfterPrevious: 60 },
  { id: "sky-heart", targetExp: 308, expectedMinutesAfterPrevious: 45 },
];

然后每个阶段只做少量关键升级：

每阶段 3–5 个新按钮
每阶段 1 个新永久资源
每阶段 1 个明显公式改写
每阶段 1 个 reset 或终局动作

这比做 20 个交织系统安全得多。

短期上线版不要追求“每个系统都很深”。
你要追求：

每个阶段都有新东西；
每个 reset 后旧流程明显变短；
每个阶段都不容易卡死；
最终能稳定到 1e308。
9. 1e308 终局前必须先做 log-safe 或 Decimal

这个是硬要求。

如果你的终局是 1e308，继续裸用 JS number 会非常危险。文档已经指出当前仍使用 JS number，后期如果超过 1e308 需要 Decimal 或自定义数值封装。

即使你不超过 1e308，下面这些计算也可能提前炸：

weatherPerSecond * seconds
multiplierA * multiplierB * multiplierC
10 ** 320
weather / target

短期方案有两个：

方案 A：直接引入 Decimal

这是最稳的。代价是要改较多代码。

方案 B：只对天气活力主线用 log 数值

如果你时间紧，可以先做一个半封装：

type LogValue = {
  exp: number; // 表示 10 ^ exp
};

主资源 weather、bestWeather、主要目标门槛用 log10 存。小资源如雨滴、根系、云团暂时继续用 number。

最小工具：

function logAdd(a: number, b: number): number {
  if (!Number.isFinite(a)) return b;
  if (!Number.isFinite(b)) return a;

  const max = Math.max(a, b);
  const min = Math.min(a, b);

  if (max - min > 16) return max;

  return max + Math.log10(1 + 10 ** (min - max));
}

function logMul(...exps: number[]): number {
  return exps.reduce((sum, x) => sum + x, 0);
}

function pow10Clamped(exp: number): number {
  if (exp >= 308) return 1e308;
  return 10 ** exp;
}

你不一定要马上把所有资源都变成 Decimal，但至少：

天气活力
最高天气活力
阶段目标
主要 W/s

必须 log-safe。

10. 上线前的最小自动测试清单

你不需要写很复杂的测试，但必须写这些。

10.1 公式测试
所有倍率 >= 0
所有成本 > 0
所有收益不是 NaN
所有收益不是 Infinity，除非明确达到终局
购买升级后资源不会变负
10.2 reset 测试

每个 reset 都测：

该清空的资源是否清空
该保留的永久项是否保留
计时器是否正确
升级是否按规则清除
永久升级是否继续生效

你当前雨阶 reset 和季风 reset 已经有明确规则，后续新增层级也要用同样方式测。

10.3 存档测试
空存档能加载
旧存档能 normalize
非法字段不会崩
缺失字段能补默认值
NaN 存档能修复或拒绝
10.4 终局测试

至少跑一次：

guided bot 从 0 到 1e308

再跑一次：

bad-but-plausible 从 0 到至少第一次气候改写

不用真实时间跑。用经济 tick 快进。

10.5 随机动作 fuzzer

这个很有用，哪怕很笨。

for 10_000 steps:
  随机等待
  随机点击
  随机购买一个可买升级
  随机触发可用 reset
  检查状态合法

它不是用来验证数值好不好玩，而是抓：

NaN
Infinity
负数资源
reset 保留错误
按钮条件错误
存档崩溃
11. 加一个“开发者诊断面板”

不要只靠肉眼看数字。

开发版右侧或隐藏快捷键打开：

当前阶段
当前目标
当前目标缺口
当前 W/s
预计到目标时间
当前最大乘区来源
当前推荐行动
购买后 W/s 预览
回本时间
最近一次 reset 用时
本阶段已停留时间
是否触发阶段保护

你现在已经加了“被动 / 实测读数”和暂停，这个方向非常好。 下一步要把它升级成完整诊断面板。

尤其要显示：

为什么我现在慢？

例如：

当前瓶颈：云团积累不足
建议：购买 风眼牵引 Lv.2
预计：云团/s 从 12 提升到 24，约 90 秒后回本

这不仅帮玩家，也帮你测试。

12. 发布版也要保留“调试报告导出”

你短期推出，后续一定会收到“我卡住了”“我存档坏了”“我数值不动了”。

不要让玩家只发截图。你需要一个按钮：

导出调试报告

导出 JSON：

{
  version,
  balanceVersion,
  elapsedSeconds,
  currentStage,
  resources,
  upgrades,
  permanentUpgrades,
  resetCounts,
  bestWeatherExp,
  recentEvents,
  currentRates,
  nextTargets,
  recommendedAction,
  saveHash
}

玩家发给你，你可以直接 import 到开发版复现。

这比你自己猜 bug 快太多。

13. 数值失败时的热修策略

如果你没有长期测试时间，就必须允许数值热修。

至少做到：

balanceVersion: "v13.0.0"

每个配置表都有版本：

export const BALANCE_VERSION = "v13.0.0";

存档里记录：

state.balanceVersion

当你调整数值时：

normalizeState(state)

根据版本做补偿。

例如你发现第二风暴前线太难：

if (state.balanceVersion < "v13.0.2") {
  // 不直接删玩家进度
  state.resources.weather = max(state.resources.weather, someSafeValue);
  state.balanceCompensationTokens += 1;
}

短期发布时，千万不要把玩家存档和某一版失衡数值死死绑住。

14. 如果时间真的很紧，砍复杂度，不要砍保护机制

你现在可能会想：“我没时间做这么多工具。”

那我建议优先级是这样：

必做
1. 状态书签
2. guided bot
3. reset / NaN / Infinity 自动测试
4. 永久升级免费重置
5. 调试报告导出
6. log-safe 或 Decimal
强烈建议
7. 录制 / 回放
8. 阶段保护
9. 诊断面板
10. 随机 fuzzer
可以延后
复杂视觉动画
更多后期升级
更多分支构筑
更漂亮的教程
更细的 lore

如果你必须取舍，结论是：

宁可少一个系统，也不要少状态书签和 reset 测试。
宁可终局内容简单，也不要让 1e250 后出现 NaN 或硬卡。

15. 对你当前项目的具体建议

你现在第一季风前已经可以暂时冻结。v12 当前第一季风前的结构、Formula C、生产者链 log 修正、季风牵引、首季风云核保底，已经足够支撑继续往后做。

接下来不要按这个顺序：

继续做后续系统 -> 自己玩 -> 发现卡 -> 改 -> 再从头玩

应该按这个顺序：

1. 做 log-safe / Decimal
2. 做状态书签
3. 做 guided bot
4. 做调试报告导出
5. 做第一季风后的云核压缩体验
6. 用 after-monsoon-1 书签测第二段
7. 做风暴前线
8. 用 storm-entry 书签测第三段
9. 做气候改写
10. 用 climate-entry 书签测第四段
11. 做天空心脏
12. 跑 guided bot 到 1e308
13. 跑 bad-but-plausible 到中后期

你要从“完整游玩测试”切换到“分段验收测试”。

16. 最低上线验收线

上线前至少满足这些：

guided bot 能从 0 到 1e308。
第一次季风后 5 分钟内能明显回到早期雨阶。
每一层 reset 后，旧流程至少缩短 40%。
玩家永久升级可以免费重置。
任意 10 分钟内，玩家至少有一个明确目标或推荐行动。
不存在 NaN、Infinity、负数资源。
存档导入导出可用。
调试报告可导出。
终局可以触发，不依赖运气或隐藏路线。

如果做不到全部，至少做到：

guided bot 能通关；
永久升级可重置；
调试报告可导出；
没有 NaN / Infinity；
后期有阶段保护。
17. 最重要的设计原则

你现在不要把后期设计成“高手才能玩懂的复杂增量”。
你没有足够测试时间，那后期就必须是：

阶段清晰
公式可控
reset 有保底
升级不互斥
错误路线可恢复
UI 明确推荐
模拟器照推荐能通关

一句话：

你不能用测试补足的地方，就要用设计冗余和工程护栏补足。

这不是降低品质，反而是短期独立开发最稳的做法。当前最该开发的不是更多玩法内容，而是“让你不用一直从头玩也能判断游戏有没有坏掉”的工具链。
