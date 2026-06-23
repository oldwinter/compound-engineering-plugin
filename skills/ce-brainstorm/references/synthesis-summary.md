# Synthesis Summary（综合摘要）

**Synthesis ≠ requirements doc.** synthesis 不是 requirements doc 的 preview、draft 或 substitute；它是 doc-write 作为 input 消费的 scope checkpoint。requirements doc 本身在 Phase 3 中从 confirmed synthesis 写出。synthesis 和 requirements doc 都保持 scope-only；implementation detail（file paths、code shapes、exact error wording）属于 downstream（ce-plan 的职责），不是 requirements doc 的内容。

**Two-stage shape: internal draft, then chat-time scoping synthesis.** synthesis 分两阶段组成。Stage 1 是 internal three-bucket draft（Stated / Inferred / Out of scope），agent 用它 comprehensively 思考 scope。Stage 2 是呈现给用户的 scoping synthesis；它的形状像两个 product collaborators 在写 PRD 前会确认的内容，不像 comprehensive audit，也不是 one-line preview。用户只看到 stage 2。internal draft 仍通过下方 doc-shape routing 影响 doc body；它只是不会逐字到达用户。这个 split 存在的原因是 comprehensive audit shape 产生了太多 detail，即使遵循 granularity rules，用户也很难实际权衡。

**Three-bucket structure 是 internal draft，不是 user-facing artifact。** 它在 stage 1 做 scope-thinking 工作，并在 Phase 3 写 doc 时 dissolve：Stated content 影响 Requirements，Inferred content 影响 Key Decisions，Out-of-scope content 影响 Scope Boundaries。doc 没有并行的 `## Synthesis` section；只有 scoping synthesis prose 作为 `## Summary` 嵌入。routing 见下方 "Doc shape after confirmation"。

本内容在 Phase 2.5 触发时加载：Phase 2（approaches chosen）之后，Phase 3（write requirements doc）之前。synthesis 是 doc 落地前用户纠正 agent interpretation 的最后机会。它服务两个目的：synthesis confirmation（用户在 dialogue 中同意了许多个别事项，但从未看到整体）和 transition checkpoint（"about to write a doc"）。

对包括 Lightweight 在内的**所有 tiers**触发。在 Phase 0.1b non-software（universal-brainstorming）route 上完全跳过 Phase 2.5。该 skill 设计上就是 interactive；brainstorming 需要与同步用户对话。不存在 non-interactive mode；如果 automated workflow 需要无 dialogue 的 requirements doc，正确做法是直接从 context 写 doc，而不是调用 `ce-brainstorm`。

---

## Stage 1: internal three-bucket draft（内部三桶草稿）

internal draft 结构为三个 labeled buckets。当 item 有意义地同时属于两个 buckets 时，可同时出现；将 inclusion-then-exclusion 标记为 Inferred，以捕获 reasoning。

- **Stated** — 用户直接说过的内容（original prompt、prior conversation、dialogue answers、Phase 2 中的 approach selection）。这里的 items 有明确 user-language anchors。
- **Inferred** — agent 为填补 gaps 所做的 assumptions。用户从未明确命名的 scope boundaries、从 intent extrapolated 的 success criteria、因 brief interview 未 probe 而做出的 technical assumptions。Inferred bucket 是最 actionable 的 correction surface；这里的 items 是 agent 的 bets。
- **Out of scope** — deliberately excluded items。agent 考虑过但决定不包含的 adjacent work、refactors、nice-to-haves、future-work items。明确 exclusions 让 agent 能发现任何实际上应包含的内容。

该 draft 是 internal。不要逐字粘贴到聊天中。将其作为 thinking step 组成，然后从中 derive stage 2。

---

## Stage 2: the chat-time scoping synthesis（聊天时的范围综合）

scoping synthesis 是用户实际看到的内容。它将 dialogue 的 substance 反映回来，让用户可 pattern-match；足够长，能服务 multi-turn conversation，又足够短，只保留 high-impact 内容。reference shape 是两个 product collaborators 在真实讨论后会彼此确认的话："OK, so we're doing X, with Y trade-off, deferring Z, and one thing I want to double-check is W. Sound right?"

scoping synthesis 最多有四个 named sections，每个都基于是否有内容可说而 **render-conditional**。空 sections 省略，不 padding。

1. **What we're building**（始终存在）— 1–3 句。dialogue 中浮现的 shape，forward-looking，plain words。不是 "you said X" 的 transcript。
2. **Key trade-offs**（conditional）— 1–3 bullets，每个带 brief why。仅当 dialogue 中做出了真实 trade-offs 时渲染。
3. **What's not in scope**（conditional）— 1–3 bullets，或折叠为一句话。仅当 deferred items 缺失会让 downstream reader 惊讶时渲染。
4. **Call outs**（conditional）— 0–3 bullets。dialogue 未 resolve 的 residual forks：post-dialogue consequences（组合用户答案后 surface 出他们在 Q&A 中看不到的东西）、silent agent inferences，或在无 dialogue 的 pre-loaded contexts 中，用户第一次看到的 scope bets。**不是 "questions the agent could have asked during Phase 1.3 but didn't"**；如果 call-out 读起来像 missed dialogue question，Phase 1.3 的 integration check 失败；flag gap，而不是 padding section。

每个 section 回答不同问题：

- **What's being built?（要构建什么？）** → shape
- **What did we trade off?（做了什么权衡？）** → explicit choices made in conversation
- **What did we cut?（删掉/延后了什么？）** → deferred items a reader would expect to see acknowledged
- **Where might you redirect?（可能需要在哪里改向？）** → residual forks: post-dialogue consequences, silent inferences, late-cycle bets

然后确认：*"Confirm and I'll write the requirements doc next, drawing on our dialogue and this synthesis. Or tell me what to change."* 该 phrasing 设置了 confirm → doc-write 的预期，让用户知道即将发生什么，并能无歧义地 interrupt。

### Path A vs Path B: the gate that fires the confirmation question（触发确认问题的 gate）

Phase 2.5 有两种 presentation modes，由**两个 signals** gate：（1）Phase 2.5 前是否触发过 blocking question？以及（2）Phase 0.3 将 scope 分类为何种 tier？Blocking questions 包括 Phase 0.3 scope disambiguation、Phase 1.3 collaborative dialogue probes、Phase 2 approach selection（当 menu 触发时）。Internal classification、Phase 1.1 scan 和 Phase 1.2 pressure test 不是 blocking questions，不计入。

- **Path A — no blocking questions fired AND tier is Lightweight**：announce-mode。只输出 "What we're building" prose（没有其他 sections，没有 confirmation question），然后在同一 turn 继续 Phase 3 doc-write。不要结束 turn 等待 acknowledgment。如果 shape 错了，用户可在 doc 落地后 revise；Lightweight Path A docs 很短，post-hoc revision 成本低。
- **Path B — at least one blocking question fired, OR tier is Standard / Deep-feature / Deep-product**：带 confirmation gate 的 full tier-aware scoping synthesis。两个 scenarios 会触发 Path B：(a) 用户在 dialogue 中投入了 answer-time，或 (b) 用户预加载了 substantive scope content（Phase 0.2 fast-path 中 opening prompt 已 richly-specified）。无论哪种，substance 都值得真实 checkpoint。即使 zero call-outs 通过 keep test，confirmation question 也 unconditional。

**为什么存在 tier guard。** Phase 0.2 的 fast path 面向两种很不同的情况：不需要 dialogue 的紧凑 one-line prompt（"fix the typo on line 47"），以及同样不需要 dialogue 的 richly pre-loaded brainstorm context，因为用户已预先陈述一切（例如从 prior session handoff accumulated decisions，用于 brainstorm doc backfill）。没有 tier guard 时，两者都 route 到 Path A，而 richly-loaded case 可能有 20+ items 的 scope，却只得到 1-sentence checkpoint。Phase 0.3 的 tier-classifying 区分这些情况：pre-loaded substance 会让 tier 成为 Standard 或 Deep，随后 route 到 Path B，产出该 substance 应得的 full scoping synthesis。不要将 gate 简化回单一 "no questions fired" signal；那曾是真实 defect，会在 Deep-tier pre-loads 上产出 one-sentence syntheses。

Path A 映射到 Phase 0.2 fast path 上既有的 "announce-mode" concept，但仅当 substance 真正只值得 1–3 sentences 时。Path B 是所有其他 interactive invocation 的默认路径。

### Keep tests per section（各 section 的保留测试）

每个 conditional section 都有自己的 keep test。Sections 是 render-conditional 的：空 section 省略，不用弱 items 填充。

**Trade-offs keep test：** 如果我不显式呈现这个 acknowledgment，用户会惊讶吗？真实 trade-offs 是用户在 dialogue 中明确权衡过替代方案的选择，或 agent 做出的、用户会期待被命名的结构性选择。机械或必然的选择（例如 "uses the existing rule entity"）不通过测试，只 dissolve 到 doc body 中，不在 synthesis 中浮现。

**Deferred keep test：** 一个合理的 downstream reader 是否可能问："why isn't X here?" 用户明确 deferred 的 items，或足够相邻、reader 会寻找的 items，可以保留。机械性 excludes（例如 "no rate limiting because it's not in scope"）不通过测试，只留在 internal draft 中。

**Call-outs keep test（affirmability test）：** 用户是否需要读代码才能评估这点？如果是，它就是 doc-body content，cut。如果不是，应用 keep test；以下至少一项必须为真：

- **Real scope fork** — 另一个合理的 agent 可能在这个维度选择不同 scope（primary actor 是谁、case X 是否 in/out、in scope vs deferred）
- **Non-obvious scope inclusion** — agent 假定 in scope、但用户可能想 exclude 的行为
- **Non-obvious scope exclusion** — agent 移到 deferred、但用户可能想纳入 scope 的 item
- **Cheap-now-expensive-later correction** — 现在修正很便宜，但 requirements doc 落地且 ce-plan 消费后会很昂贵的 scope bet
- **Non-obvious consequence of multi-turn answers** — 组合用户已陈述答案后产生的 downstream effect，用户不太可能在 dialogue 中一路追踪到。以 forward-looking 方式呈现（"X means Y for the doc"），不要 retrospective（"you said X"）。这一类是 ce-brainstorm 中 call-outs 存在的 multi-turn-dialogue 理由；不要把它们过滤为 "already implied by Stated"

Cut 任何不匹配 keep-test category 的内容，包括：

- 没有真实替代方案的机械性 items
- 会在 planning 阶段决定的 implementation choices
- 已经被 scoping synthesis prose 暗含的 items
- 对 Q&A turns 的重述（"you said you wanted X"）——那是 transcript，不是 call-out
- 对用户已选择的 Phase 2 approach 的重述

### Total bullet budget across sections 2–4（第 2-4 节的总 bullet 预算）

cap 是 heuristic，不是法律。真正的 discipline 是对每个 candidate 应用其 section 的 keep test。按 tier 的 typical bounds 如下，计数覆盖 Trade-offs + Deferred + Call outs 的 bullets 总和：

| Tier | Typical total | Hard ceiling |
|---|---|---|
| Lightweight | 0–1 | 2 |
| Standard | 2–4 | 5 |
| Deep — feature | 3–5 | 7 |
| Deep — product | 4–7 | 9 |

**超过 hard ceiling 时，synthesis 形状已经错了；不要提高 cap，要在更高抽象层级重新 cut。** 几乎总是因为 section 内多个 bullets 其实是某个更大 named decision 的 sub-decisions。将相关 bullets collapse 成一个 bullet，并命名在用户真正权衡的层级上。

一个有用测试：把 bullets 读出来。如果两个或更多听起来像同一想法的 "and also" 延伸，它们就应该合并为一个。

**Path A 仅在 Lightweight tier 且没有 blocking questions 时触发。无论 question signal 如何，Path B 都是 Standard、Deep-feature 和 Deep-product 的默认路径；赢得 checkpoint 的是 substance，不是 interaction history。** Path B 上 zero call-outs 对 Lightweight 是正常的，对 Standard 有时正常，对 Deep 几乎从不正常。如果一个 Deep scoping synthesis 在 rich content（来自 dialogue 或 pre-loaded context）后产生 zero call-outs，要 double-check agent 是否把 consequence-class call-outs 过滤成了 "already implied"。

### Detail level: conversational, not documentary（细节层级：像对话，不像文档）

每个 bullet **理想为 1 行，最多 2 行**。reference shape 是两个 collaborators 会在 conversation 中彼此说的话，不是 requirements doc body 会写的话。synthesis 是 shape confirmation 的 forcing function；substance 属于 requirements doc。如果某个 bullet 读起来像 doc paragraph，shape 就错了：agent 只做了横向压缩（更少 bullets），却没有纵向压缩（每个 bullet 更少内容）；如果每个 bullet 都膨胀到填满空间，cap 就没有意义。

两个 tests：

- **Read-aloud test**：两个 product collaborators 会*说出*这个 bullet，还是会把它*写进* spec？会说 = 正确。会写 = 重新 cut 成一句，或 cut 掉。
- **Single-sentence test**：这个 bullet 能否落成一句话？如果它需要用分号串联 clauses，或在 bullet 内再嵌 list，它很可能是两个 decisions 挤在一个 bullet 中；拆分（并按 count 重新 cut），或 cut 到更高层级。

Bad vs good — detail level（坏例子 vs 好例子：细节层级）：

| Too detailed (wrong) | Conversational (right) |
|---|---|
| Per-channel mute scoped to notification rules; mute applies to all events through that rule including @mentions, DMs forwarded as notifications, and bot messages; persists 24h with extension | Per-channel over per-user — support team isn't a single user |
| Rule-delete loss path is silent and could surprise users who configured extended mutes; consider a confirmation dialog, soft-delete with state preservation, or a 7-day undo window | Rule-delete silently loses pause state — confirm no warning needed |

"What we're building" prose 遵守同样 discipline：用 1–3 句描述 shape，而不是枚举 requirements。如果 prose 在列 what's in / what's out / what's how，它就已经变成 doc preview；cut 到只剩 shape。

### Anti-patterns（反模式）

下面每个 anti-pattern 都会产生不通过其 section keep test 的 bullet，或让 scoping synthesis 漂回 comprehensive-audit failure mode。

- **在任何 bullet 中命名 implementation detail**：file paths、module names、exact JSON keys、HTTP status codes、error message wording、SQL syntax。synthesis 是 scope-only；implementation 是 ce-plan 的职责。这些 granularity rules 适用于每个 section 的每个 bullet。
- **逐字重述 Q&A turn**（"you said you wanted X"）：这是 transcript，不是 scoping synthesis。改成 forward-looking（"X means Y for the doc"）或 cut。
- **重述用户已经选择的 Phase 2 approach**：approach 已在 Phase 2.5 前选定；它应该在 "What we're building" 的一句话中出现，而不是作为 call-out。
- **为了凑 bullet count 而 padding section**：render-conditional 意味着 empty 是允许的。省略整个 section，不要用 weak items 填充。
- **把 three-bucket internal draft 逐字粘贴到 chat**：那是旧 shape，它产生的 volume problem 正是 stage 2 存在的原因。内部 compose，derive scoping synthesis sections，然后 compressed presentation。
- **在 stage 2 旁边漂浮问题**：如果某个问题确实不能 default，先暂停 synthesis 并解决它，再 presentation。选择匹配的问题形状：当 options bounded 且 meaningfully distinct 时使用 blocking multiple-choice tool；当 option set 会按 Interaction Rule 5(a) 无意影响用户答案时，使用 open-ended。整合答案后，再呈现 scoping synthesis。永远不要在 scoping synthesis 旁边放 floating questions；那会让用户没有清晰的 resolution path。

---

## Prompt templates（Prompt 模板）

这是 directional guidance；根据 dialogue context 调整 phrasing。按 Interaction Rule 5(a) 使用 open-ended feedback（option menu 会无意中把用户引向 menu 列出的部分，而远离他们可能想改的其他内容）。

**"What we're building" 的 prose discipline（required）：** forward-looking（doc 中*将会*包含什么），不是 retrospective（已经讨论过什么）。用 plain words 先说实际要构建的东西。不要加 qualifiers（"comprehensive"、"thoughtful"、"substantive"）。不要重述用户刚刚经历过的 dialogue context。如果这个 work 不能在 1–3 句内无 filler 地说清，synthesis 还没准备好。

### Path B template（Path B 模板，questions were asked）

```
Based on our dialogue, here's the scope I'm proposing for the requirements doc:

**What we're building:** [1–3 sentences — the shape that emerged from dialogue, forward-looking, plain words]

**Key trade-offs:** [render only when real trade-offs exist]
- [explicit choice + brief why]
- [explicit choice + brief why]

**What's not in scope:** [render only when deferred items would surprise a reader]
- [deferred item]
- [deferred item]

**Call outs:** [render only when one or more survived the keep test]
- [scope-level fork or non-obvious consequence the user can affirm or redirect]
- [same]

Confirm and I'll write the requirements doc next, drawing on our dialogue and this synthesis. Or tell me what to change — even something I captured correctly earlier is fair game to revise (you may have changed your mind or want to correct an unstated assumption).
```

### Path A template（Path A 模板，no questions were asked，通常是 Phase 0.2 short-circuit）

```
Proposing: [1–3 line shape — what the doc will say in plain words].

No open decisions — writing the requirements doc now. Interrupt if the shape is wrong.
```

在同一 turn 继续 Phase 3 doc-write；不要结束 turn 等待 acknowledgment。"interrupt if wrong" affordance 意味着用户可以在 doc 落地后 revise，而不是之前。Lightweight Path A docs 很短，因此 post-hoc revision 成本低。

在 Path B 上用 open-ended 方式询问用户（不要用 `AskUserQuestion` menu）。理由是 SKILL.md 中的 Interaction Rule 5(a)：option menu 会无意中把用户 feedback 引向 menu 所列部分。

### Worked example：从 internal draft 压缩到 scoping synthesis（Standard tier）

对于一个 notification-mute feature，假设 internal draft 有 5 个 Stated items、4 个 Inferred items 和 3 个 Out-of-scope items，压缩后的 Stage 2 如下：

```
Based on our dialogue, here's the scope I'm proposing for the requirements doc:

**What we're building:** Per-channel mute on notification rules, with a 24h preset for the support team's 3 AM ping problem. Mute lives on the rule itself and survives rule edits.

**Key trade-offs:**
- Per-channel over per-user — support team isn't a single user
- Mute on the rule, not a separate entity — pause state survives edits

**What's not in scope:**
- Presence-based mute and quiet-hours schedules — deferred for later
- Cross-rule mute groups — would force a rule-grouping concept we don't have

**Call outs:**
- Rule-delete silently loses pause state — confirm no warning needed

Confirm and I'll write the requirements doc next, drawing on our dialogue and this synthesis. Or tell me what to change.
```

从 12-item internal draft 中 cut 掉的内容及原因：

- 已由 "What we're building" prose 覆盖的 Stated items silently dissolved
- "Use existing rule entity" —— mechanical，没有真实 trade-off
- "Use Postgres for persistence" —— implementation detail（ce-plan 的职责），不通过 granularity rules
- 一个 Out-of-scope item（"no rate limiting"）—— mechanical exclude，没有 reader 会问它
- 三个 Inferred items rolled into Trade-offs section，作为其背后的 explicit choices

保留下来的结果：一个 substance 与 dialogue 成比例的 scoping synthesis，在三个 conditional sections 中受 Standard ceiling 5 bullets 约束；更多 bullet 会触发更高抽象层级的 re-cut。

---

## Pre-flight re-review（输出前重新 review）

在 emitting scoping synthesis 前，像用户会阅读它那样 re-read draft。要捕获两个 failure modes：

- **scoping synthesis 读起来像 requirements-doc preview。** Prose 枚举 what's in/out，bullets 是 documentary 而不是 conversational。synthesis 是 shape-confirmation checkpoint，不是 doc preview；如果它读起来像 preview，Phase 2.5 和 Phase 3 就已经坍缩成一步。revise 成 conversational shape，或接受 requirements doc 本身会承载 detail，因此 synthesis 应更轻。
- **bullet count 符合 cap，但每个 bullet 过度详细。** Standard 中命中 5 bullets，但每个 bullet 都是一段话，说明 agent 通过横向压缩（更少 bullets）满足 count cap，却没有纵向压缩（每个 bullet 更少内容）。如果每个 bullet 都膨胀到填满空间，cap 就没有意义。re-cut 成 sentence-level bullets。

这是一个 mental act：以用户视角 re-read，而不是机械运行 checklist。forcing function 是短暂站到用户的阅读位置，并在 keep tests 之外显式关注 detail level。如果任一 failure mode 触发，emitting 前先 revise。

---

## Re-present after revision; write only on confirm（revision 后重新呈现；只在确认后写入）

revision 不是 confirmation。任何 user revision 后（即使是很容易理解的替换，比如 "move deferred item X back into scope"），integrate change，re-present 反映该 change 的 revised scoping synthesis，然后等 explicit confirmation 再写 doc。loop 如下：

1. Present scoping synthesis（呈现 scoping synthesis）→ user responds
2. User confirms（用户确认）→ write the doc
3. User revises → integrate，re-present revised scoping synthesis，回到 step 1

Doc-write 只在 explicit confirm 后，或 soft-cut blocking question 的 "proceed" option 后触发（见下）。confirmation step 让 scoping synthesis 成为 **confirmed**，而不是 "agent's last proposal"；永远不要在 revision 后立刻写 doc，即使 revision 小到 agent 觉得自己理解了。

---

## Soft-cut on circularity（按循环性 soft-cut，而不是按迭代次数）

按 round 跟踪用户 touched 的 scoping synthesis items。soft-cut blocking question **只在同一 item 被 revised 两次**时触发（或第三轮 revision 触及第二轮已 revised 的 item）。跨 rounds 的 new-item revisions 不设限制；修正错误 scoping synthesis 的不同方面，正是该机制应支持的行为。

**跨 rounds 的 identity 按 decision dimension 判断，不按 surface wording 或 section。** revision 可能导致 stage 2 re-derive；同一个 underlying decision 可能以改写、与另一个 bullet 合并、或移到不同 section 的形式回来（例如 round one 中的 Trade-off 在用户 push back 后，round two 变成 Call-out）。"Same item" 指同一个 underlying decision，不管当前位于哪个 section。当 re-cut 将多个 prior bullets collapse 成一个时，新的 combined bullet 会继承其中任一 constituent 的 "touched" 状态；如果任何 underlying decision 已经 revised 过一次，soft-cut 就会触发。

soft-cut 触发时，使用平台的 blocking question tool（Claude Code 中是 `AskUserQuestion`，Codex 中是 `request_user_input`，Antigravity 中是 `ask_user`，Pi 中是 `ask_user`），并提供两个 options：

- `Proceed and write the requirements doc`
- `Hold off — keep discussing before the doc`

只有当 blocking tool 不存在或调用出错时，才 fallback 到 chat 中的 numbered list。永远不要 silently skip。

---

## Self-redirect（自我重定向）

如果用户 response 表明他们处在错误 skill 中，或想要不同 workflow（例如 "this is too small, just /ce-work it" 或 "this needs more thought, let me brainstorm differently"）：

- Stop ce-brainstorm（停止 ce-brainstorm）
- Suggest 用户似乎想要的 alternative skill（例如 `/ce-work`、`/ce-debug`）
- Offer 在 session 中加载它
- 不要 push back 或 argue；用户的 redirect signal 是 deliberate choice

这个 support 存在，是因为 scoping synthesis 是 honest checkpoint。如果用户通过阅读 scoping synthesis 发现 skill choice 错了，redirect 就是正确动作。

---

## Doc shape after confirmation（确认后的 doc 形状）

用户 confirmation 后（或 soft-cut decision 选择 proceed 后），Phase 3 写 requirements doc。internal draft 不会作为 `## Synthesis` section 进入 doc。只有 "What we're building" prose 会作为顶部的 `## Summary` 嵌入。internal-draft content dissolve 到 doc body sections：

| Internal-draft element | 在 doc 中的位置 |
|---|---|
| "What we're building" prose | `## Summary`（1–3 lines，forward-looking，what's proposed） |
| Stated bullets | `## Requirements`（numbered R-IDs，full detail），以及相关时用于 narrative context 的 `## Problem Frame` |
| Inferred bullets | `## Key Decisions`（with rationale）——用户在 dialogue 中接受的 bets 变成 doc 中的 decisions。 |
| Out-of-scope bullets | `## Scope Boundaries` |

chat-time Trade-offs section dissolve 到 `## Key Decisions`（chat 中 acknowledged 的 explicit choices 变成 documented decisions）。chat-time What's-not-in-scope section dissolve 到 `## Scope Boundaries`。

不要添加 italic capture-context note（例如 "Captured at Phase 2.5..."）。这会把 engineering process 泄漏到不需要该信号的 artifact 中。

doc 的 `## Summary` 和 `## Problem Frame` 必须服务不同 purposes；规则见 `references/brainstorm-sections.md` 中的 "Discipline: Summary vs Problem Frame"。
