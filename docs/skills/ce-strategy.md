# `ce-strategy`

> 创建或维护 `STRATEGY.md`：一个短小、durable anchor，记录 product 是什么、服务谁、如何成功，以及 team 正在投资哪里。

`ce-strategy` 是 **upstream anchor** skill。它在 repo root（与 `README.md` 同级）产出并维护一份 canonical document，供 downstream skills 作为 grounding 读取。这个 document 刻意短而 structured；几个 sharp questions 的好答案，比大量 prose 更能形成 strategy。此 skill 会提出这些问题、对 weak answers push back，并写出 doc。

Compound-engineering ideation chain 是 `/ce-ideate -> /ce-brainstorm -> /ce-plan -> /ce-work`。`STRATEGY.md` 位于 **chain 上游**：当它存在时，`ce-ideate`、`ce-brainstorm` 和 `ce-plan` 都把它作为 grounding 读取，让 suggestions 更偏向 active tracks 和 stated approach。`ce-product-pulse` 也会读取它，用于 seed 要测量的 metrics。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 运行带 pushback rules 的 interview，然后在 repo root 写入/更新 `STRATEGY.md` |
| 何时使用？ | 开始新 product；更新 direction；"what are we working on?"；如果尚无 strategy，在启动 ideation 前 |
| 产出什么？ | `STRATEGY.md`，包含 target problem、approach、persona、key metrics、tracks，以及可选 milestones / non-goals / marketing |
| 下一步 | `/ce-ideate`、`/ce-brainstorm`、`/ce-plan` 或 `/ce-product-pulse`；它们都会查阅该 doc 作为 grounding |

---

## 调用示例

```text
# 不存在 STRATEGY.md 时，通过完整 interview 创建它
/ce-strategy

# 只重新审视一个 section，不重开完整 strategy
/ce-strategy approach

# 围绕具体问题更新某个 section
/ce-strategy metrics for retention

# 已有 strategy 时无参数调用，interactive 选择 sections
/ce-strategy
```

Targeted maintenance 最好提供 section 或 scope hint；`STRATEGY.md` 已存在时，无参数调用会有意采用更宽 scope。

---

## 问题

多数 teams 要么没有 strategy doc，要么有一份太长以至没人读。Failure shapes：

- **Missing entirely**：每个 new piece of work 都重新争论 "are we even working on the right thing?"
- **Slogan, not strategy**："we delight users" 对 agent（和 humans）都没有 actionable 意义
- **Goals dressed up as strategy**："grow ARR by 30%" 是 goal，不是 guiding choice
- **Feature lists in place of guiding policy**："we're building X, Y, and Z" 没说 *why*
- **Stale and untouched**：strategy doc 写过一次后被遗忘，如今描述的是 team 已不再 build 的 product
- **Too long to scan**：日常工作中没人打开的 20 页 strategy anchor 不了任何东西

好的 strategy doc 短、sharp，并且经常被读。难点在于产出它；多数 "write a strategy" prompts 会塌缩成 prose generation，用文字掩盖 weak thinking。

## 解决方案

`ce-strategy` 运行带 explicit pushback rules 的 interview：

- **Anchor, not plan**：strategy 是 product 是什么以及为什么；features 属于 `ce-brainstorm`，schedules 属于 issue tracker
- **Rigor in the questions, not the headings**：section headers 用 plain English；interview 负责 enforce discipline
- **Short is a feature**：template 有约束；对 expansion push back
- **Durable across runs**：re-runs in place update，保留有效部分，只重访 weak sections
- **Pushback rules per section**：每个 section 有 named anti-patterns 和 probe questions，越过 slogans、goals-as-strategy 和 feature lists

灵感来自 Richard Rumelt 的 *Good Strategy Bad Strategy*，尤其是他的 diagnosis、guiding policy 和 coherent action kernel。Interview questions 旨在越过 Rumelt 所说的 "bad strategy" patterns。

---

## 新颖之处

### 1. Interview 中的 pushback discipline

每个 section 中，skill 先问 opening question，再应用 named pushback rules：越过 fluff、slogans、vanity goals 和 feature lists。每个 section 最多两轮 pushback；如果之后答案仍弱，就记录用户给出的内容，并 note 该 section 值得下次 revisiting。Pushback 是 skill 核心；没有它，interview 会变成 passive transcription。

### 2. 原地更新：durable across runs

在 existing `STRATEGY.md` 上重新运行 skill，不会从头重写。Phase 2 读取 existing doc，用 3-5 行 summary 当前 state，让用户看到已记录内容，并询问要 revisit 哪个 section（或当 argument 指明 section 时直接跳转）。用户确认仍准确的 sections 保持不动。YAML frontmatter 中的 `last_updated` field 更新为 today。Strong sections 不被二次质疑；weak sections 获得完整 pushback。

### 3. 被 downstream skills 作为 grounding 读取

当 repo root 存在 `STRATEGY.md` 时，downstream skills 会读取它：

- **`ce-ideate`**：codebase-scan grounding agent 读取它；ideation 自动偏向 strategy-aligned directions
- **`ce-brainstorm`**：Phase 1.1 constraint check 读取它；product/scope decisions 锚定 active tracks
- **`ce-plan`**：repo-research-analyst 读取它；plan 会 flag 拉离 active tracks 或 stated approach 的 decisions
- **`ce-product-pulse`**：first-run interview 从 doc seed product name 和 key metrics，然后 wiring data sources 实际测量这些 metrics

Doc 与 `README.md` 同级（canonical、well-known location at repo root），skills 能 predictable 找到它。

### 4. 受 Rumelt 启发的 structure

"Target problem / Our approach / Tracks" structure 对应 Rumelt 的 kernel：**diagnosis**（情况是什么、哪里坏了、代价是什么）、**guiding policy**（chosen approach、strategic bet）、**coherent action**（从 policy 流出的 active tracks of work）。Interview questions 旨在越过 slogans，抵达这个 kernel。

### 5. 有界的 section 数量

Required template 有五个 sections（Target problem、Our approach、Who it's for、Key metrics、Tracks）。另有三个 optional sections（Milestones、Not working on、Marketing），但如果它们没有承载 weight，skill 会 push back。Constraint 本身就是 feature：需要 12 个 sections 的 strategy 通常不是 strategy。

### 6. 用 frontmatter 跟踪 staleness

`STRATEGY.md` 带 YAML frontmatter 的 `last_updated` field。Downstream skills 可根据 age flag doc 可能 stale；重新运行 skill 会更新时间戳。

---

## 快速示例

你正在开始一个 new product，想在启动 `ce-ideate` 前写 strategy doc。调用 `/ce-strategy`。

Skill 检查 existing `STRATEGY.md`（未找到），宣布 "Strategy doc not found — let's write it." 它读取 `references/interview.md`，按 section order 运行 interview。

**Target problem.** "What problem are you solving and for whom?" 你答 "we help teams ship faster." Pushback 触发：这是 slogan。"Whose teams? Shipping what? What does 'faster' mean — saving time per task, fewer bugs, less coordination overhead?" 你 sharpen："we help engineering managers at 50-200 person companies cut PR-review cycle time from days to hours." 这就足够 specific。

**Our approach.** "What's the strategic bet — the choice that shapes everything else?" 你答 "use AI." Pushback 触发：这是 tool，不是 bet。"What's the bet about AI specifically — that AI can review better than juniors? That AI can pre-process review concerns before humans see them? That review doesn't need humans at all?" 你继续 sharpen。

Interview 继续经过 Who it's for、Key metrics、Tracks。每个 section 最多两轮 pushback。所有 required sections 捕获后，skill 读取 `references/strategy-template.md`，填充它，在 chat 中展示完整 draft，提供一轮 edits，然后写入 `STRATEGY.md`。

Phase 3 note doc 已就位，`ce-ideate`、`ce-brainstorm`、`ce-plan` 和 `ce-product-pulse` 下次运行会读取它。自然 next step 建议 `/ce-ideate`。

---

## 何时使用

在以下情况使用 `ce-strategy`：

- 正在开始 new product，想在 ideation 前拥有 strategy doc
- Product direction 已 shift，existing strategy stale
- "What are we working on?" 经常出现，因为答案没记录在任何地方
- 某个 specific section 感觉 weak，想 revisit（`/ce-strategy approach`）
- Downstream skill（`ce-ideate`、`ce-brainstorm`）flag 缺少 `STRATEGY.md` 作为 missing grounding

以下情况跳过 `ce-strategy`：

- Strategy 已记录且仍准确；重新运行只会增加 noise
- 正在 plan 单个 feature -> `/ce-brainstorm`
- 正在 schedule work -> 那是 issue tracker，不是 strategy
- 想要带 dates 的 roadmap -> strategy 是 direction；roadmaps 是 sequencing

---

## 作为工作流的一部分使用

`ce-strategy` 位于 chain 上游。新 product 或 major direction shift 的推荐顺序：

```text
/ce-strategy → /ce-ideate (consults STRATEGY.md) → /ce-brainstorm → /ce-plan → /ce-work
                                                              ↑
                                          all read STRATEGY.md as grounding
```

Downstream skills 不 *require* `STRATEGY.md`；没有它也能工作。但当 doc 存在时，active tracks 和 stated approach 会自动把 ideation、brainstorming 和 planning 拉向 strategy-aligned directions。缺少 `STRATEGY.md` 时，`ce-ideate` 仍能从 codebase grounding，但没有 signal 说明当前最重要的是 *哪类* work。

`ce-product-pulse` 也会从 `STRATEGY.md` 的 key metrics seed first-run interview，将 data sources 接上，测量 strategy 说重要的东西。

---

## 单独使用

Skill 总是 standalone 调用；strategy 不是 chain 中任何其他 skill 的下游。

- **First run**：`/ce-strategy`（不存在 `STRATEGY.md`）
- **Targeted update**：`/ce-strategy approach` 直接跳到该 section
- **Open update**：`/ce-strategy`（file exists，无 argument）询问要 revisit 哪些 section

---

## 输出产物（Output Artifact）

```text
STRATEGY.md  (repo root, peer of README.md)
```

Sections（除非注明 optional，否则 required）：

- **Target problem**：diagnosis：什么坏了、对谁坏、代价是什么
- **Our approach**：guiding policy：塑造一切的 strategic bet
- **Who it's for**：persona；specific 到 design decisions 可以引用
- **Key metrics**：product 用什么衡量自己
- **Tracks**：coherent action（协调行动）：active tracks of work
- **Milestones** _(optional)_：有意义的 upcoming markers
- **Not working on** _(optional)_：explicit non-goals；当 team 面临 "should we do X?" pressure 时有用
- **Marketing** _(optional)_：相关时的 positioning 和 messaging direction

YAML frontmatter 带 `last_updated: YYYY-MM-DD`。Doc 刻意短，通常 1-2 页，而不是 chapter book。

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | 没有 `STRATEGY.md` 时 first run；否则询问 revisit 哪个 section |
| `<section name>` | 例如 `metrics`、`approach`、`tracks`；跳到该 section |
| `<scope hint>` | 例如 "metrics for retention"；聚焦 revisit |

---

## 常见问题（FAQ）

**为什么 doc 这么短？**
因为 long strategy docs 没人读。Discipline 强迫对少数问题给出 sharp answers。如果你想加更多 sections，通常答案是 "those belong in ce-brainstorm or the issue tracker, not in strategy."

**Strategy 和 roadmap 有什么区别？**
Strategy 是 direction（我们做什么以及为什么）。Roadmap 是 sequencing（什么何时发生）。Strategy 放在 `STRATEGY.md`；roadmaps 放在 issue tracker、planning tools 或 team 使用的 scheduling 工具里。Skill 明确保持在 strategy lane。

**如果我的 answers 很 weak 怎么办？**
Skill 会按 section 应用 pushback rules，每个最多两轮。如果之后仍弱，skill 会记录你给出的内容，并 note 该 section 值得下次 revisiting。Strategy 是 iterative；第一次不需要完美。

**为什么 doc 放在 repo root？**
这样 downstream skills 可以无需配置地 predictable 找到它。像 `README.md` 一样，`STRATEGY.md` 是 canonical、well-known location。

**如果我不想让 downstream skills 读取它怎么办？**
只要它存在，它们就会读。这是 intentional behavior：把 chain 锚定到 stated strategy 是价值所在。如果要 suppress，请删除该 doc；以后可以重新创建。

**它对 non-software product 有用吗？**
有。Structure（target problem、approach、persona、metrics、tracks）可以泛化到任何 product。Pushback rules 同样适用于 SaaS feature roadmap、consulting practice 或 non-profit initiative。

---

## 了解更多

"Target problem / Our approach / Tracks" structure 受 Richard Rumelt 的 *Good Strategy Bad Strategy* 启发，尤其是 diagnosis、guiding policy 和 coherent action kernel。`references/interview.md` 中的 interview questions 旨在越过 Rumelt 所说的 "bad strategy" patterns：fluff、伪装成 strategy 的 goals，以及代替 guiding choice 的 feature lists。如果 slogan 和 strategy 的区别还不够 sharp，这本书是推荐 follow-up reading。

---

## 另见（See Also）

- [`ce-ideate`](./ce-ideate.md) - 读取 `STRATEGY.md` 作为 ideation grounding
- [`ce-brainstorm`](./ce-brainstorm.md) - scope work 时读取它以感知 constraints
- [`ce-plan`](./ce-plan.md) - 读取它；flag 偏离 active tracks 的 plan decisions
- [`ce-product-pulse`](./ce-product-pulse.md) - 从 strategy 的 key metrics seed first-run setup
