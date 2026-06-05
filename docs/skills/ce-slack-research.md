# `ce-slack-research`

> 搜索 Slack 中已解释的 organizational context：影响当前 task 的 decisions、constraints 和 discussion arcs。产出 research digest，而不是 raw message list。

`ce-slack-research` 是 **organizational-context retrieval** skill。它 dispatch `ce-slack-researcher` 搜索 Slack 中与 topic 相关的 context，然后合成带 cross-cutting analysis 和 research-value assessment 的 research digest，而不是平铺 message hits。Planning、brainstorming，或任何 team 之前已经讨论过、agent 需要 context 才能提出 sensible recommendations 的任务，都适合使用。

它不同于 `slack:find-discussions`（另一个返回 individual message results、没有 synthesis 的 skill）：此 skill 会**解释**找到的内容。

---

## TL;DR

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | 搜索 Slack 中的 topic，并返回 synthesized research digest，包含 workspace identity、value assessment、按 topic 组织的 findings 和 cross-cutting analysis |
| 何时使用 | Planning 或 brainstorming 前，当 "we've discussed this before in Slack"：先获得 context，再继续 |
| 产出什么 | Digest：workspace identifier、research-value assessment（high/moderate/low/none）、按 topic 组织的 findings、cross-cutting analysis |
| 关键区别 | `ce-slack-research` 会 synthesize；`slack:find-discussions` 返回 raw message hits |

---

## 问题

Slack 是团队拥有但很少作为整体使用的 working memory：

- **Decisions 藏在旧 threads 中**："we decided X about pricing in February" 在没人记得的 channel 里
- **Constraints 存在于 side conversations**：feature 被 scope down 的原因不在 spec，而在 DM
- **Raw search returns noise**：`slack:find-discussions` 找到 messages，但不告诉你如何理解它们
- **Wrong workspace risk**：搜索错误 Slack instance 会得到 confident-sounding 但 irrelevant context
- **Discussion arcs lost**：单个 thread 可能跨 3 天；一个 message hit 看不出 conversation 如何演变
- **No assessment of value**：conversation 是 conclusive、speculative，还是 decided？没有这个 signal，agent 无法正确加权 findings

## 方案

`ce-slack-research` 通过 research-shaped pipeline 运行 Slack search：

- **Workspace identifier surfaced**：用户可以先验证搜索的是正确 Slack instance，再阅读 findings
- **Research-value assessment**：high / moderate / low / none，并附 justification
- **Findings organized by topic**：不是 flat message list；按内容聚类，并带 source channels 和 dates
- **Cross-cutting analysis**：跨 findings 的 patterns，而不只是 per-message summary
- **Single-shot dispatch**：skill 是 thin entry point；`ce-slack-researcher` 做实际工作（MCP discovery、search execution、thread reads、synthesis）

---

## 独特之处

### 1. Synthesis，不是 search

Agent 不返回 matching messages，而是返回有结构的 digest：

- **Workspace identifier**：搜索的是哪个 Slack workspace（如果错了，用户可以纠正）
- **Research-value assessment**：findings 实际有多有用，并附 justification：
  - **High**：与 topic 相关的 conclusive decisions 或 strong constraints
  - **Moderate**：与 topic 相关但不 conclusive 的 context
  - **Low**：tangential mentions 或 weak signals
  - **None**：无 relevant findings；topic 未被讨论
- **Findings organized by topic**：带 source channels 和 dates 的 clusters
- **Cross-cutting analysis**：per-message view 会漏掉的跨 findings patterns

### 2. Workspace identity verification（workspace identity 验证）

Slack search 常见 failure mode 是搜错 workspace，却得到 confidently-irrelevant results。Skill 先 surface workspace identifier，让用户确认搜索的是正确 Slack instance。如果 agent 连接到 personal Slack workspace，而不是 company one，这一步会在 digest 误导任何人之前捕获。

### 3. Research-value assessment with justification（带理由的研究价值评估）

Findings 价值不等。一个带 consensus 的 decided product question，与周末 speculative tangent 权重不同。Agent 会评估 corpus 并解释 rating，例如 "high: explicit decision in #proj-billing on 2026-03-12 with three approvers" 或 "low: one passing mention in #general; topic not actively discussed"。

### 4. Slack search modifier passthrough（透传 Slack search modifiers）

Input 可以是 keyword、natural language question，或包含 Slack search modifiers：

- Channel hints（channel 提示）：`in:#proj-reverse-trial`
- Date filters（日期过滤）：`after:2026-03-01`、`before:2026-04-15`
- Phrase search、exclusions 等

Agent 会从任何 input shape 中提取 topic 并构造 searches。

### 5. Thin orchestrator，agent 做重活

Skill 本身是 thin entry point：如果没给 topic，它会询问；然后 dispatch `ce-slack-researcher`。Agent 处理 MCP discovery、search execution、thread reads 和 synthesis。这样 user-facing surface 很小，heavy lifting 留给 specialist agent。

### 6. 与 raw-search Slack tools 区分

`slack:find-discussions`（另一个 skill）返回 individual message results，适合 "did anyone mention X recently?"。`ce-slack-research` 返回 interpreted context，适合 "what does the team think about X, with what evidence?"。这个区别很重要；用错 tool 会拿回 noise。

### 7. Cleanly surface failure modes（清晰呈现失败模式）

如果 Slack unavailable（MCP 未连接或 auth expired），agent 会清楚报告，skill 转述 message。它不会尝试 alternative research methods，也不会假装已经搜索。如果用户想查其他地方，那是另一次 invocation。

---

## 快速示例

你准备 plan 一个 free-trial feature。写 brainstorm 前，你想知道 team 已经讨论过什么。调用 `/ce-slack-research "free trial in #proj-reverse-trial"`。

Skill 带 topic、channel scope 和 implicit recent-window dispatch `ce-slack-researcher`。Agent 连接 configured Slack workspace，在 `#proj-reverse-trial` 中运行 targeted searches，展开 relevant threads，并 synthesize findings。

Digest 返回：

- **Workspace（工作区）:** `every.slack.com`
- **Research value（研究价值）:** **High** — 多个 decisions 和 constraints 与 free-trial scope 相关
- **Findings（发现）:**
  - **Trial length（试用时长）:** 30-day 因 funnel data 太长被拒，决定 14-day default（2026-03-12 thread 中的 decision，三位 approvers）
  - **Conversion gate（转化门槛）:** soft paywall 优先于 hard paywall；尚未决定 gate 在 signup 触发还是 first usage 后触发
  - **Pricing during trial（试用期间定价）:** 一致认为 "do not show pricing"；三个不同 threads 都提到
- **Cross-cutting analysis（横向分析）:** 团队持续偏向 conversion-protective（trial 期间不显示 pricing、soft gates），但尚未收敛 conversion-gate timing。这是 brainstorm 中值得解决的 live question。

现在你在调用 `/ce-brainstorm` 前有了真实 organizational context。Brainstorm 从 "trial is 14-day, soft-paywall, no pricing visible — when does the gate fire?" 开始，而不是从零开始。

---

## 何时使用

在以下情况使用 `ce-slack-research`：

- 即将 plan 或 brainstorm 某件 team 已在 Slack 中讨论过的事
- Repo / docs 对某个 decision 沉默，但 team 显然做过决定
- 存在 constraint（"we can't use that vendor"），但 rationale 在某个 thread 中
- 你想要 interpreted context，而不是 raw message hits

以下情况跳过 `ce-slack-research`：

- 想要 raw message hits：使用 `slack:find-discussions`
- Context 在 code 或 docs 中：直接读取它们
- Topic 太新，还没有 Slack history
- 没有配置 Slack tools：先设置 Slack MCP

---

## 作为 Workflow 的一部分使用

当 organizational context 重要时，`ce-slack-research` 插在 planning 和 brainstorming 上游：

- **在 `/ce-brainstorm` 前**：收集 Slack context，让 brainstorm 的 pressure-test questions 基于真实 prior discussion
- **在 `/ce-plan` 前**：当 work 涉及 team 在别处做过的 decision，先 surface 该 decision
- **从 `/ce-plan` Phase 1.1 内部**：通过 "Slack tools detected; ask me to search Slack for organizational context" opt-in
- **从 `/ce-brainstorm` Phase 1.1 内部**：通过同样 surfacing pattern opt-in
- **从 `/ce-ideate` Phase 1 内部**：ideation grounding step 可 opt-in slack-research

Chain skills 检测到 Slack tools 时会 surface availability，但绝不 auto-dispatch；由用户 opt in。

---

## 单独使用

最常见是直接使用：

- **Topic（主题）**：`/ce-slack-research free trial`
- **Question（问题）**：`/ce-slack-research "What did we say about free trial recently?"`
- **Channel-scoped（限定 channel）**：`/ce-slack-research free trial in:#proj-reverse-trial`
- **Date-filtered（限定日期）**：`/ce-slack-research onboarding flow after:2026-03-01`
- **No argument（无参数）**：`/ce-slack-research` 询问要 research 的 topic

Skill 接受 topic 的自然形状：keyword、question，带或不带 Slack search modifiers 都可以。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 询问要 research 的 topic |
| `<topic or question>` | Search 并 synthesize |
| `<topic> in:#channel` | Channel-scoped search |
| `<topic> after:YYYY-MM-DD` | Date-filtered search |

如果 Slack tools 未配置，agent 会报告 unavailable，skill 转述 message。不会尝试 alternative research methods。

---

## 常见问题

**它和 `slack:find-discussions` 有什么区别？**
`slack:find-discussions` 返回 individual message results，适合 "did anyone mention X recently?"。`ce-slack-research` 会 interpret 和 synthesize，适合 "what does the team think about X, with what evidence?"。按问题选择正确 tool。

**为什么要 surface workspace identifier？**
因为搜索错误 Slack workspace 会产生 confident-irrelevant results，而用户常常无法只从 findings 判断。Surfacing workspace identity 可让用户在阅读 digest 前捕获 wrong-workspace case。

**Research-value assessment 是什么？**
它判断 findings 实际有多有用。**High** = conclusive decisions / strong constraints。**Moderate** = 与 topic 有关但不 conclusive。**Low** = weak signals。**None** = topic 未被 meaningful discussed。Justification 会解释 rating。

**能搜索 private DMs 吗？**
取决于 configured Slack MCP 暴露什么。Skill 没有自己的 access；它使用 MCP 允许的范围。对 private content，请确保 MCP 有正确 scope。

**如果 workspace 不对怎么办？**
Skill 会先 surface workspace identifier，让用户 verify，并在需要时针对另一个 workspace 重新调用。如果配置了多个 workspaces，agent 选择 connected one；由用户 disambiguate。

**没有 Slack MCP 能工作吗？**
不能。如果 Slack tools 不可达，agent 会 cleanly 报告 unavailable，skill 转述。Skill 不 fallback 到其他 research methods；否则会产生感觉正确但实际不可靠的结果。

---

## 另见

- [`ce-brainstorm`](./ce-brainstorm.md) - Phase 1.1 constraint check 中可 opt-in slack-research
- [`ce-plan`](./ce-plan.md) - Phase 1.1 local research 中可 opt-in slack-research
- [`ce-ideate`](./ce-ideate.md) - grounding 阶段可 opt-in slack-research
- `slack:find-discussions` - separate `slack` plugin 中用于 raw message search 的 sibling skill；complementary，不是 substitute
