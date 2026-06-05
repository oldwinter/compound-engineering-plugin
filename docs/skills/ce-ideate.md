# `ce-ideate`

> 发现值得探索的强方向和合格方向，让其他噪声自然落下。

`ce-ideate` 是上游 **discovery** skill。当你还没有具体 idea 时使用它；此时问题不是 "let me refine the one I already have"，而是 "which directions even matter here?"。它会先做功课：parallel grounding agents 从你的 codebase、past learnings、**open web 上的 external prior art**，以及可选的 Slack 和 issue tracker 中提取素材；然后从六种不同 conceptual frames 生成 candidates；要求每个 idea 都有 tagged **basis**；最后只展示通过 adversarial critique 的 survivors，并明确说明哪些内容被 rejected 以及原因。

它同样适用于 software topics、product topics 和完全 non-software topics：naming、narrative、personal decisions、weekend trips、business strategy。相同的 generate-critique-survive engine；相同的 basis requirement；相同的 anti-slop discipline。

这是 compound-engineering ideation chain 的第一步：

```text
/ce-ideate         /ce-brainstorm      /ce-plan             /ce-work
"What's worth      "What does this     "What's needed       "Build it."
 exploring?"        need to be?"        to accomplish
                                        this?"
```

这条 chain 可跨 domains 工作，每一步都支持 universal mode。`ce-ideate` 是上游 "find the strong candidates" step，但它本身也是一个完整 cycle。

---

## TL;DR

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | 基于真实材料 grounding，把 topic 分解为 orthogonal axes，跨六种 conceptual frames 生成 candidates，adversarially critique，展示 5-7 个 survivors，每个都带 tagged basis |
| 何时使用 | Greenfield exploration、big-picture thinking、codebase audits、surprise-me runs、naming、decisions、business strategy；任何想要 qualified candidate set 而不是 refined idea 的 domain |
| 产出什么 | `docs/ideation/` 中的 ranked ideation artifact（或对 non-software topics 输出到 Proof） |
| 下一步 | 对选中的 survivor 运行 `/ce-brainstorm`，或保存后离开 |

---

## 问题

问 AI "what's worth exploring here?" 通常会得到：

- 没有 grounding 于真实 subject 的 plausible-sounding bullets
- 只有前三个 obvious frames，没有任何 surprise
- Flat list，看不出哪些 directions 强、哪些只是 filler
- 没有记录 considered and rejected 的内容
- 无法 audit basis：每个 claim 听起来都 confident，却没有 evidence

## 方案

`ce-ideate` 把 **grounding**、**generation**、**critique** 和 **selection** 分成离散 phases；quality mechanism 是 **explicit rejection with reasons**，不是乐观 ranking。

- Grounding agents 先做功课：codebase scan、past learnings、external prior art，以及可选 Slack 和 issue intelligence
- Topic 被分解为 3-5 个来自 grounding 的 orthogonal axes：sub-agents 必须覆盖的是 *subject 的哪些方面*，而不是 *如何思考它*
- 六个 parallel ideation sub-agents 从不同 conceptual frames 工作，并让 ideas 分布在 axes 上
- 每个 idea 都必须带 tagged **basis**：direct evidence、named external prior art，或写清楚的 first-principles argument
- 没有 basis 的 ideas 会被 rejected；它要防止的 failure mode 是 "AI slop"
- Survivors 用一致 rubric 打分，并展示 downsides 和 confidence
- Rejection summary 展示哪些内容被 considered and cut

---

## 独特之处

### 1. Comprehensive grounding before any idea is generated（先 grounding，再生成 idea）

每次 run 都从 parallel grounding agents 开始，提供 ideas 将被 qualification 的 substance：codebase scan（repo mode）、来自 `docs/solutions/` 的 past institutional learnings、通过 web research 获得的 external prior art，以及工具可用时的 Slack 和 issue intelligence。**External prior art 很关键**：没有它，agent 只是在 remix 你的 codebase 或脑中已有内容。有了它，ideas 可以引用 "this is how X solved this"：具体、可验证、有名称的 precedent。

### 2. Basis requirement：每个 idea 都引用 evidence

每个 surviving candidate 都带 tagged basis：`direct:`（quoted evidence）、`external:`（named prior art）或 `reasoned:`（写出来的 first-principles argument，而不是手势）。听起来 plausible 但没有 basis 的 speculation 会被 rejected。**Comprehensive grounding + basis requirement 是双重 anti-slop mechanism。** 只要其中一个都更弱：有 grounding 但无 basis 会变成 informed speculation；有 basis 但无 grounding 会变成 clever-sounding rationalization。

### 3. Six-frame divergent generation（六框架发散生成）

六个 parallel sub-agents 各自偏向不同 generative frame：pain & friction、inversion/removal/automation、assumption-breaking、leverage & compounding、cross-domain analogy、constraint-flipping。Single-prompt ideation 会塌缩到 agent 最常训练的方向；不同 frames 强迫真正的 breadth，尤其是 cross-domain analogy 和 constraint-flipping，能浮现单个 prompt 不会得到的 ideas。

### 4. Topic-surface decomposition：axis coverage 作为 dispatch invariant（dispatch 不变量）

Frames 决定 *如何思考* topic；**axes** 决定 *思考 topic 的哪一部分*。Frame dispatch 之前，orchestrator 会把 topic 分解为 3-5 个来自 grounding 的 orthogonal axes（例如 "social sharing" 可分为 send、discovery、arrival、compounding、actor types）。然后要求每个 frame 的 ideas 分布在 axes 上，generation 之后的 axis-coverage check 会捕捉 blind spots；如果某个 axis 没有 ideas，就用 bounded recovery dispatch 填补。它防止的 failure mode 是：六个 lenses 都收敛到 topic 最显眼的 interpretation，而漏掉其余 surface。Atomic topics（name、tagline）和 surprise-me runs 会干净地跳过 decomposition。

### 5. Adversarial filtering with stated rejection reasons（带理由的对抗式筛选）

Orchestrator 用一致 rubric critique 每个 candidate：groundedness、basis strength、expected value、novelty、pragmatism、leverage、implementation burden、overlap。每个 rejection 都带 one-line reason。Survivors 与 rejection summary 一起展示，让你看到哪些内容被 considered and cut。

### 6. 三种 modes：software、software-product 和完全 non-software

同一个 generate-critique-survive mechanism 可以运行在很不同的 topic domains 上：codebase 中的东西、repo 外的软件产品（pages、apps、flows），或完全没有 software surface 的 topics（naming、narrative、personal decisions、business strategy）。在 non-software mode 中，domain-agnostic facilitator 接管：仍然是六个 frames、basis requirement 和 critique，但使用 domain-native language。

### 7. Surprise-me mode：无需 subject

`/ce-ideate "surprise me"` 会完全跳过 subject step。Sub-agents 从 grounding material 中发现自己的 subjects。不同 frames 找到不同 subjects 是 feature，不是 bug；跨 discovered subjects 的 cross-cutting combinations 往往产生最强 ideas。

### 8. Issue-tracker intent（issue tracker 意图）

"what users are reporting" 或 "biggest issue patterns" 这类 phrases 会触发 issue-intelligence agent，拉取真实 GitHub issues，并把 clustered themes 输入 ideation frames。

---

## 快速示例

你在 code repo 中调用 `ce-ideate "DX improvements"`。Agent 宣布它会分派约 9 个 grounding 和 ideation agents，并提供 skip phrases 来控制成本。

Grounding agents 并行返回：codebase summary、relevant past learnings、developer-experience patterns 的 external prior art。Orchestrator 将 topic 分解为 4-5 个来自 grounding 的 axes（例如 "DX improvements" 可分为 feedback loops、environment friction、tooling ergonomics、knowledge accessibility、automation surface）。六个 ideation sub-agents 从不同 frames 生成 candidates，每个都标注 target axis。Orchestrator 将 40+ candidates 合并成一个 list，synthesize cross-cutting combinations，运行 axis-coverage check（任何 empty axis 都触发一次 bounded recovery dispatch），再运行 adversarial critique pass；大约 13 个 ideas 因过于 vague、缺乏 justification 或重复而被 cut。

你看到六个分布在 axes 上的 survivors。每个都有 tagged basis（例如 "tests/cli.test.ts:42 spawns 14 different bash invocations"）、连接该 basis 与 move significance 的 rationale、target axis、downsides、confidence 和 complexity。Rejection summary 列出被 cut 的内容和原因，并列出最终仍未覆盖的 deliberate gaps。最后出现四选一 menu：refine in conversation、open in Proof、brainstorm a chosen survivor，或 save and end。

---

## 何时使用

在以下情况使用 `ce-ideate`：

- 你还没有 specific idea；想要 strong、qualified candidates，而不是 refine 一个已有 idea
- Thinking 是 greenfield 或 big-picture
- 想探索一个 focus area，但还不 commit 到某个 direction
- 想要 surprising direction（`surprise me`）
- 想从 issue tracker 中挖掘 patterns
- Topic 完全 non-software

以下情况跳过 `ce-ideate`：

- 已经有 specific feature 或 decision -> `/ce-brainstorm`
- Requirements 已 ready，需要 execution guardrails -> `/ce-plan`
- 正在 debug known bug -> `/ce-debug`

---

## 作为 Chained Workflow 的一部分使用

```text
/ce-ideate            "What's worth exploring?"
   |
   |   chosen survivor (with basis + rationale)
   v
/ce-brainstorm        "What does this need to be?"
   |
   |   requirements / brief (R-IDs, A-IDs, F-IDs, AE-IDs in software mode)
   v
/ce-plan              "What's needed to accomplish this?"
   |
   |   structured plan (U-IDs, files, test scenarios — guardrails, not code)
   v
/ce-work              "Build it."
```

每个 artifact 都是下一步的 structured input：survivor 的 basis 作为 brainstorm 的 evidence base 继续传递；brainstorm 的 decisions 流入 plan 的 requirements 和 scope；plan 的 U-IDs 和 test scenarios 成为 `ce-work` 执行的 guardrails。当你在 Phase 4 menu 选择 "Brainstorm a chosen idea" 时，survivor 会保存（status 为 `Explored`），并用该 idea 作为 seed 加载 `ce-brainstorm`。

Chain 也能运行在 non-software domains：weekend-trip directions 的 ideation 会进入定义 trip 的 brainstorm，再进入把 bookings、packing 和 itinerary 结构化为 guardrails 的 plan。

---

## 单独使用

`ce-ideate` 本身就是完整 ideation cycle。Terminal review loop 会产出带 reasons 的可用 idea set；persistence 是 opt-in。

**Software（软件）：**

- **Codebase audits（codebase 审计）**：`/ce-ideate "what to improve in this repo"`（可搭配 `STRATEGY.md` 做 strategy-aligned weighting）
- **Issue triage（issue 分流）**：`/ce-ideate "biggest issue themes in the last quarter"`
- **Pricing or positioning ideation（定价或定位 ideation）**：`/ce-ideate "pricing page A/B test ideas"`
- **Surprise-me runs on any subject（任意主题 surprise-me 运行）**：在任意 repo 内运行 `/ce-ideate "surprise me"`

**Non-software（非软件）：**

- **Naming（命名）**：coffee shops、baby names、products、brands
- **Personal decisions（个人决策）**：career options、sabbatical destinations
- **Plot or narrative ideation（情节或叙事 ideation）**：short story directions、character beats
- **Business strategy（商业策略）**：go-to-market、positioning against a competitor
- **Travel and events（旅行与活动）**：trip themes、wedding-venue concepts

完全支持 refine 而不 persist：选择 "Refine in conversation"，结束后停止聊天即可。不会写任何文件。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | Open-ended；询问 subject 或路由到 surprise-me |
| `<concept>` | 例如 `DX improvements`、`auth quality` |
| `<path>` | 聚焦某个 directory 或 file |
| `<constraint>` | 例如 `low-complexity quick wins`、`polish-only` |
| `surprise me` | Surprise-me mode |
| `top issue themes in <area>` | 触发 issue-tracker intent |

Prompt 任意位置支持 skip phrases：`no external research`、`no slack`。

---

## 常见问题

**为什么是六个 frames？为什么不只用一个 "give me ideas" prompt？**
Single-prompt ideation 会塌缩到 agent 最常训练的方向。不同 frames 强迫真正的 breadth；尤其是 cross-domain analogy 和 constraint-flipping，会浮现单个 prompt 得不到的 ideas。

**为什么需要 basis requirement？这不就是 AI hand-waving 吗？**
没有 basis，plausible-sounding ideas 会未经筛选地通过。Basis requirement 意味着每个 survivor 都引用真实 evidence、真实 prior art，或写清楚的 argument。你可以 audit 它。

**它真的适用于 non-software topics 吗？**
是。相同的 generate-critique-survive engine 会用 domain-native language 处理 naming、narrative、personal decisions 和 business strategy。Codebase grounding 会替换为 user-context synthesis 和 external research。

**如果我只想在对话中 refine ideas，不想保存呢？**
在 Phase 4 menu 中选择 "Refine the ideation in conversation"。Terminal review loop 本身是完整 cycle。Persistence 是 opt-in。

**如果我的 prompt ambiguous 呢？**
当 prompt 只指向某种 quality（`improvements`、`quick wins`）而不是 specific thing 时，subject-identification gate 会问一个 scope question。"Surprise me" 会作为真实 option 提供，而不是 fallback。

---

## 另见

- [`ce-brainstorm`](./ce-brainstorm.md) - 选中 survivor 后，将方向 brainstorm 成 requirements doc
- [`ce-plan`](./ce-plan.md) - requirements 清晰后，规划 implementation
- [`ce-strategy`](./ce-strategy.md) - 将 ideation 锚定到 documented product strategy
- [`ce-doc-review`](./ce-doc-review.md) - review saved ideation artifact 的 clarity 和 completeness
- [`ce-proof`](./ce-proof.md) - 在 Proof 中打开 artifact 进行 collaborative iteration
