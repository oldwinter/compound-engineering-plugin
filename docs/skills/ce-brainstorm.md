# `ce-brainstorm`

> 通过协作思考定义某件事应该成为什么，一次只问一个问题，然后写出 right-sized requirements doc。

`ce-brainstorm` 是 **definition** skill。它是 thinking partner：一次问一个问题，用 named gap lenses pressure-test 你的 premises，在推荐之前探索 2-3 个 concrete approaches，并产出 right-sized requirements document，强到 planning 不需要再发明 product behavior。

它同样适用于 software features、完全 non-software topics（event planning、business decisions、personal-project framing、travel itineraries、naming briefs），以及两者之间的任何主题。相同的 one-question-at-a-time discipline；相同的 right-sized template；任何 artifact 落地前都有相同的 Synthesis Summary。

这是 compound-engineering ideation chain 的中间步骤：

```text
/ce-ideate         /ce-brainstorm      /ce-plan             /ce-work
"What's worth      "What does this     "What's needed       "Build it."
 exploring?"        need to be?"        to accomplish
                                        this?"
```

它也是最常见的 standalone entry point：适用于任何 feature、decision 或 project，其中问题不是 "how do I do it?"，而是 "what am I really doing, and is it the right shape?"

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 通过 collaborative dialogue clarify scope、pressure-test premises、explore approaches，并写出 right-sized requirements doc |
| 何时使用？ | Vague feature ideas、"let's brainstorm"、多个 plausible directions、unclear scope；non-software decisions 和 projects |
| 产出什么？ | `docs/brainstorms/` 中的 requirements doc（software mode 带 R-IDs、A-IDs、F-IDs、AE-IDs） |
| 下一步 | `/ce-plan`、trivial scope 可用 `/ce-work`、doc review 或 Proof iteration |

---

## 问题

从 vague idea 直接进入 implementation 会产生：

- Code（或 work）解决了错误问题，因为没人 pressure-tested premise
- Scope creep，因为 boundaries 从未 explicit
- Plans 每次有人碰它们时都重新争论 product decisions
- Requirements docs 要么是没人更新的 over-ceremonial PRDs，要么是 planning 必须靠猜补全的 one-line briefs

典型的 "let's brainstorm" AI 也有形状问题：一条消息问五个问题；你回答两个，其余丢失。它立刻选择一个 approach，而不是展示 alternatives。它把 implementation details 烤进 product discussion。Output 是 conversation，不是可 hand off 的 artifact。

## 解决方案

`ce-brainstorm` 运行 structured but conversational flow，并以 durable artifact 结束：

- **One question per turn**，即使 sub-questions 看起来相关
- **Right-sized ceremony（适度 ceremony）**：Lightweight / Standard / Deep / Deep-product tiers
- **Named gap lenses** 在生成 approaches 前强迫 premises 严谨
- **2-3 个 concrete approaches** 带 tradeoffs，然后给出 stated recommendation
- **Synthesis Summary** 是 doc 落地前最后一次廉价纠正 scope 的机会
- **Right-sized requirements document** 带 stable identifiers（R/A/F/AE），向下游 planning 流动

---

## 新颖之处

### 1. 一次一个问题，blocking-tool first

一条消息堆三个问题会稀释回答。`ce-brainstorm` 每 turn 只问一个问题，并在存在自然 choices 时默认使用平台 blocking question tool 和 single-select options。精心选择的 options 会 scaffold answer 而不限制它（free-text fallback 始终可用）。

### 2. Tier classification 根据 work 缩放 ceremony

不是每次 brainstorm 都一样。Lightweight 覆盖小而边界清楚、ambiguity 低的 ideas。Standard 处理带有一些 decisions 的正常 features。Deep 为 cross-cutting work 增加 systemic-move probes。Deep-product 还要求建立 product shape：actors、core outcome、positioning、durability，而不是默认继承它。Ceremony 随 work 缩放，而不是压在 work 上。

### 3. Product Pressure Test（产品压力测试）：named gap lenses

生成 approaches 前，skill 会扫描用户 opening 中的 rigor gaps。每个 gap 有名称，并 probe 它捕捉的 confusion：

- **Evidence**："users want X" 没有 observable behavior 支撑
- **Specificity**：beneficiary 以抽象方式描述；design 会 silently invent 他们是谁
- **Counterfactual**：看不出 users 今天怎么做，或如果什么都不 ship 会发生什么
- **Attachment**：某个 specific solution shape 被当成正在 build 的东西
- **Durability**（仅 Deep-product）：value 依赖当前 world state，而该状态可能变化

这些 probes 以 **prose，而不是 menus** 触发：4-option menu 会暗示哪些 evidence 算数，让用户选择而不是产出。Prose 会迫使真实 observation。

### 4. Approach exploration 要求包含 non-obvious angles

Phase 2 会浮现 2-3 个 concrete approaches，其中至少一个是 **non-obvious angle**：inversion、constraint removal 或 cross-domain analogy。Approaches 在 mechanism / product-shape granularity 呈现，不是 architecture。（基于 intentionally-shallow research 做 architecture decisions 容易提前 commit 到坏选择；这些属于 `ce-plan`。）Approaches 会在 recommendation 前展示，让用户先看到 alternatives，而不是被 anchor。

### 5. Synthesis Summary：最后一个便宜的纠正时刻

写 doc 前，`ce-brainstorm` 会发出 **scoping synthesis**，形状像两个 product collaborators 在写 PRD 前会确认的内容。它浮现正在 build 的东西、对话产生的 key trade-offs、deferred 内容，以及用户应 weigh in 的真实 forks。每个 section 只有在有内容时才渲染；不会为了 ceremony 填空 bucket。当上游对话 short-circuited（Phase 0.2 fast path、requirements 已清楚、没有 questions）时，scoping synthesis 会压缩为一个 forward-looking sentence，并保留 end-of-turn interrupt window。

### 6. 会向下游流动的 stable identifiers

Requirements doc 携带 plan-feeding identifiers：R-IDs（Requirements）、A-IDs（Actors）、F-IDs（Key Flows）、AE-IDs（Acceptance Examples）。`ce-plan` 会消费这些，并把每个 implementation unit 和 test scenario trace 回它们。Origin scope boundaries（尤其是 "Outside this product's identity"）会原样向下游流动。

### 7. 面向 non-software 的 universal brainstorming

构建 software feature？Standard flow。命名 product？选择 vacation？决定 career move？`ce-brainstorm` 会路由到 domain-agnostic facilitator，同时保留 one-question-at-a-time discipline 和 right-sized output。

### 8. 默认把 implementation 排除在 requirements doc 之外

Requirements 描述从用户视角期待的 **what** behavior。默认不描述 libraries、schemas、endpoints、file layouts 或 code structure，除非 brainstorm 本身就是 technical 或 architectural decision。这让 planning 的工作保持干净：发明 **how**，而不是 **what**。

---

## 快速示例

你以 vague feature idea 开始："I want to add a way for users to pause notifications." `ce-brainstorm` 扫描 repo，找到 related artifacts，并将 work 分类为 Standard scope。

Pressure test 检测到 specificity gap（这些 "users" 是谁？）和 attachment gap（"pause" 已经是具体 solution shape）。它以 prose 一次 probe 一个。你说出真实 pain：support team 会在凌晨 3 点被 non-urgent stuff ping；并描述能解决它的 smallest version。

三个 approaches 浮现：per-notification-type mute with TTL、global do-not-disturb schedule、mute on the rule rather than the channel，附带 tradeoffs 和 recommendation。Synthesis Summary 读回出现的形状（"per-channel mute on notification rules, 24h preset for the 3 AM support pings"），列出对话中的 trade-offs（per-channel over per-user、mute lives on the rule）、deferred 内容（presence-based mute、quiet-hours schedules），以及关于 rule-delete loss path 的单个 call-out。你确认并添加 24h preset。

Right-sized requirements doc 写入，Phase 4 menu 提供 next steps：`/ce-plan`（recommended）、agent doc review、Proof iteration，或对 trivial scope skip-to-build。

---

## 何时使用

在以下情况使用 `ce-brainstorm`：

- Feature idea 部分成形，但你还无法 sketch implementation
- Request 有多个 valid solutions，需要选择
- Scope unclear（"add notifications"：什么 kind？for whom？when？）
- 想要可以 hand 给其他 contributor 或 planning 的 structured artifact
- Vague problem statement 需要变成真正的 product decision
- 你正在做 non-software 工作（named products、roadmap choices、decisions）

以下情况跳过 `ce-brainstorm`：

- 你还不知道该做什么 -> 先 `/ce-ideate`
- Requirements 已经 specified（已有 PRD、GitHub issue 很详细）-> 直接 `/ce-plan`
- Bug 有 known root cause -> `/ce-debug`
- Change trivial 且 obvious -> 直接做

---

## 作为链式工作流的一部分使用

```text
/ce-ideate          (optional — discover candidate directions)
   |  picks one survivor + carries warrant + rationale
   v
/ce-brainstorm
   |  produces requirements / brief
   |  software mode: R-IDs, A-IDs, F-IDs, AE-IDs + scope boundaries
   |  universal mode: a domain-appropriate brief
   v
/ce-plan
   |  reads the doc as origin
   |  R-IDs flow into Requirements; A/F/AE-IDs trace into units and tests
   |  origin scope boundaries are preserved verbatim
   v
/ce-work
```

当 `ce-plan` 以 requirements doc 作为 input 加载时，它不会重新争论 product behavior。Doc 是 authoritative。Plan-time decisions 关乎 execution guardrails，而不是正在 build 什么。

---

## 单独使用

`ce-brainstorm` 是最常见的 standalone entry point。很多 teams 跳过 `ce-ideate`（他们已经知道要探索什么），也跳过 `ce-plan`（brainstorm 就是他们完整 thinking artifact）。

- **Feature briefs**：把 vague idea 转成给 stakeholders 或 new contributors 的 stable artifact
- **Onboarding existing work**：feature 已 in flight，但 rationale 从未写下
- **Pre-PR alignment**：多人需要在 code start 前就 scope 达成一致
- **Strategic decisions**：Deep-product tier 浮现 durability 和 adjacent-product risks
- **Non-software brainstorms**：命名 product、规划 event、决定 roadmap

Phase 4 handoff 提供 planning、agent doc review、Proof iteration、lightweight scope 的 direct-to-work、更多 clarifying questions，或 pause。

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | 询问 feature description |
| `<feature idea>` | Open-ended brainstorm |
| `<problem>` | 通过 product pressure test 路由 |
| Existing `*-requirements.md` path or topic | Resume offer |
| `output:html` | 将 requirements doc 写成单个 self-contained HTML file，而不是 markdown。互斥：doc 是 `.md` 或 `.html`，绝不两者同时生成。Default 是 markdown。设置 `.compound-engineering/config.local.yaml` 中的 `brainstorm_output: html` 可让 HTML 成为 default。Pipeline mode（LFG、`disable-model-invocation`）始终强制 markdown，以便 downstream automation 获得 stable text shape。 |

---

## 常见问题（FAQ）

**为什么一次只问一个问题？这不会慢吗？**
每 turn 堆三个问题会稀释回答：users 会选择容易的那个，其余丢失。一次一个问题会产生更 sharp 的 answers，经验上也更快收敛。

**为什么要 pressure-test 我的 premise？我只是想 brainstorm。**
Named gap lenses 捕捉 feature briefs 在下游失败的最常见方式。它们只在 opening 中确实存在 gap 时触发；具体且 well-framed 的 prompt 可能零 probes。

**我可以跳过 requirements doc 吗？**
可以。Lightweight tier 和 announce-mode fast path 支持这种做法。如果你只需要 brief alignment，就不会写 doc。

**如果我已经有 PRD 或详细 GitHub issue 怎么办？**
跳过 `ce-brainstorm`，直接到 `/ce-plan`。Plan skill 可以消费任何类型的 input。

**Synthesis 中的 "Inferred" 是什么意思？**
Agent 在呈现 scoping synthesis 前，会把 internal draft 分成三类（Stated / Inferred / Out of scope）作为 thinking step。Inferred items 是 agent 填补 dialogue gaps 的 bets。通过 keep test 的内容会以 call-outs 形式出现在 scoping synthesis 中；其余在用户确认后融入 requirements doc 的 Key Decisions。

**它适用于 non-software topics 吗？**
是。Domain-agnostic facilitator 会为 naming、decisions、planning 等保留 one-question-at-a-time discipline 和 right-sizing。

---

## 另见（See Also）

- [`ce-ideate`](./ce-ideate.md) - 上游 "what's worth exploring" discovery
- [`ce-plan`](./ce-plan.md) - 将 requirements doc 转成 implementation plan
- [`ce-doc-review`](./ce-doc-review.md) - requirements doc 的 persona-based review
- [`ce-work`](./ce-work.md) - 直接从 brainstorm 执行 lightweight changes
- [`ce-strategy`](./ce-strategy.md) - 将 brainstorms 锚定到 documented product strategy
