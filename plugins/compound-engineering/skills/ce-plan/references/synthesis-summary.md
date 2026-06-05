# 范围综合

**Scoping synthesis ≠ plan doc（范围综合不是计划文档）。** scoping synthesis 是 plan-write（Phase 5.2）作为 input 消费的 scope/decisions checkpoint。它 surface agent 在 synthesis time 能做的 decisions：scope-level（这个 plan 覆盖完整 brainstorm，还是 narrow 到 subset？）、posture（extend existing pattern vs. introduce new abstraction）、test approach。它不 surface plan-write 产生的 decisions：PR count、commit/branch sequencing、effort 或 time estimates、Implementation Unit lists、exact file paths、test command recipes。如果 synthesis 声称这些内容，就泄漏了 plan-write thinking，必须 re-cut 到 scope-decisions only。即使 agent 在 session 早些时候已经形成 plan-write opinions，synthesis 仍保持在 scope altitude；用户被要求 affirm scope，而不是 rubber-stamp implementation。

**两阶段形状：先 internal draft，再 chat-time synthesis。** synthesis 分两阶段组成。Stage 1 是 internal three-bucket draft（Stated / Inferred / Out of scope），agent 用它 comprehensively 思考 scope。Stage 2 是 compressed chat-time output：一个 tier-shaped summary 加上 "Call outs"（零个或多个，受 plan depth 限制；见 "How many call-outs are right?" 下的 cap table），也就是用户可能 redirect 的 specific forks。用户只看到 stage 2。internal draft 仍通过下方 doc-shape routing 影响 plan body；它只是不会逐字到达用户。这个 split 存在的原因是 comprehensive audit shape 产生了太多 detail，即使遵循 granularity rules，用户也很难权衡。

**Three-bucket structure 是 internal draft，不是 user-facing artifact。** 它在 stage 1 做 scope-thinking 工作，并在 Phase 5.2 写 plan 时 dissolve：Stated content 影响 Requirements，Inferred content 影响 Key Technical Decisions / Implementation Units（interactive mode）或 `## Assumptions`（non-interactive mode），Out-of-scope content 影响 Scope Boundaries。plan 没有并行的 `## Synthesis` section；只有 stage-2 summary 作为 `## Summary` 嵌入。routing 见下方 "Doc shape after confirmation"。

当 ce-plan 中 synthesis-summary phase 触发时加载本内容。有两个 variants；它们共享 structure，但 timing 和 content focus 不同：

- **Solo variant**（Phase 0.7）：在 Phase 0.4 bootstrap 和 Phase 0.6 depth classification 之后、Phase 1 research 开始前触发。在 sub-agent dispatch 消耗前捕获 scope misinterpretation。Full breadth：problem frame、intended behavior、success criteria、in/out scope。
- **Brainstorm-sourced variant**（Phase 5.1.5）：在 Phase 1 research 之后、Phase 5.2 plan-write 之前触发。聚焦 plan-time decisions（touch 哪些 files/modules、extend 哪些 patterns vs. introduce new、test scope、refactor scope）。假定 Brainstorm-validated WHAT 已成立，不再 restate。

两个 variants 共享 two-stage shape、call-outs 的 keep test、soft-cut behavior，以及 doc-shape routing。在 non-interactive（headless）mode 中，两者都会 compose internal draft 并 skip stage 2；没有 synchronous user 时，user-facing compression 没有意义。internal draft 以同样方式 dissolve 到 plan body，其中 Inferred bets route 到 `## Assumptions` section。完整 routing 见下方 "Headless mode (shared)"。

---

## Stage 1：internal three-bucket draft（shared，共享）

internal draft 结构为三个 labeled buckets。当 item 有意义地同时属于两个 buckets 时，可以同时出现；将 inclusion-then-exclusion 标记为 Inferred，以捕获 reasoning。

- **Stated（已陈述）** — 用户直接说过的内容（original prompt、prior conversation、dialogue answers，或存在时的 upstream brainstorm doc）。这里的 items 有明确 user-language anchors。
- **Inferred（推断）** — agent 为填补 gaps 所做的 assumptions。用户从未明确命名的 scope boundaries、从 intent extrapolated 的 success criteria、因 brief interview 未 probe 而做出的 technical assumptions。Inferred list 是最 actionable 的 bucket；这里的 items 是 agent 的 bets，用户可以纠正。
- **Out of scope（范围外）** — deliberately excluded items。agent 考虑过但决定不包含的 adjacent work、refactors、nice-to-haves、future-work items。

该 draft 是 internal。不要逐字粘贴到 chat。将其作为 thinking step 组成，然后从中 derive stage 2。

---

## Stage 2：chat-time scoping synthesis（聊天中的范围综合）

Stage 2 是用户实际看到的内容。两个 variants 的 shape 不同，因为它们服务不同 purpose：brainstorm-sourced plans 继承 validated WHAT，并 surface plan-specific HOW；solo plans 没有 upstream，synthesis 本身就是 WHAT。

### Brainstorm-sourced shape（Phase 5.1.5，源自 brainstorm 的形状）

两个 content sections 加 call-outs：

1. **Brainstorm-scope restatement（brainstorm 范围重述）**（1-2 sentences，prose）。作为 orientation restate brainstorm 的 scope。用户写了这部分 content，但 synthesis 可能会在几天后或与其他 plans 并行阅读；restatement 是 topic anchor，表示 "this is the artifact we're planning against." 使用 brainstorm 自己的 vocabulary。不要 enumerate Implementation Units，不要把 constraints 原样 restate 给用户，不要 list acceptance examples。

2. **Plan-specific scoping decisions（plan-specific 范围决策）**（prose，或 multi-faceted 时用 bullets）。agent 做出、但 brainstorm 未做出的 scope-level commitments：这个 plan 是覆盖 full brainstorm scope 还是 narrow 到 subset；adjacent refactors 是 pulled in 还是 held out；scenario level 的 test scope 是什么（哪些 sites、哪些 acceptance examples）。每个 item 必须通过 **affirmability test**：用户无需读 code 就能 affirm 或 redirect。这个 section 是 affirm-or-redirect level 的 scope claims，不是描述 implementation reaches 到哪里，不是 PR count 或 commit sequencing，不是 Implementation Unit lists，不是 exact file paths 或 test commands；这些都是 plan-write outputs，synthesis 无法诚实声称。如果 plan 覆盖 full brainstorm scope，且没有 narrowing、expansions 或 adjacent work，这个 section 保持简短（"This plan covers the full brainstorm scope; test scope is X"）。

3. **Call outs（提醒项）**（零个或多个，受 plan depth 限制；见下方 "How many call-outs are right?"）。每个都是用户 input 会 materially change plan 的 real fork。当 zero forks survived keep test 时，完全省略 "Call outs:" header。

### Solo shape（Phase 0.7，单独调用形状）

没有 upstream document；synthesis 本身就是 scope claim：

1. **Scope claim（范围声明）**（prose，或 multi-faceted 时用 bullets）。agent planning to build 的内容，位于 affirm-or-redirect level；命名 what's in 和 what's out。不是枚举 plan 将包含的 Implementation Units。

2. **Call outs（提醒项）**（零个或多个，受 plan depth 限制）。同 brainstorm-sourced。

### 形状预算

Tier-aware budgets 是 **ceilings，不是 targets**。没有更多可说时，更少就是正确；填满 budget 会产生 noise。

| Plan depth | Restatement（brainstorm-sourced） | Plan-specific scoping（brainstorm-sourced）/ Scope claim（solo） |
|---|---|---|
| Lightweight | 1 sentence | 1-3 lines prose |
| Standard | 1-2 sentences | up to 3-5 lines or 2-4 bullets |
| Deep | 1-2 sentences | up to 4-6 lines or 3-6 bullets |

每个 section 内的 form（prose、bullets、mix）以最能 communicate 的方式为准。

### 共享规则

- **chat 中没有 "Stated" bucket**（orientation 或 scope-claim 覆盖它）。
- **没有作为 separate list 的 "Out of scope" bucket**；当 non-obvious exclusion survives keep test 时，将它 fold into call-out，否则 drop。
- **Source-document vocabulary（源文档词汇）。** 当 brainstorm 存在时，使用它的 terms。不要 invent agent-coded shorthand（例如 "skill-instruction shape"、"hooks engine selection at Step 2a entry"）。reference acceptance examples、requirements 或 flows 时，用 plain terms 命名（"the install-prompt acceptance case"），永远不要使用 bare IDs。

- **Pre-emit mechanical checks（发出前机械检查）。** emitting synthesis 前，scan output：
  - **Bare ID references**（`AE\d+`、`R\d+`、`F\d+`、`A\d+`、`U\d+`）→ 替换为 plain names。Mixed forms（case named 且 cited ID）仍违反规则，因为 ID 只增加 noise，没有增加 information。
  - **File paths**（`path/like.md`、`path/like.py`、`internal/cli/...`、`skills/.../...` 等）→ cut，除非 path 本身就是 call-outs 中 explicit fork 的 topic。允许："cleanup hook in the existing archive step vs. a new dedicated phase"（path 隐含在 decision 中）。禁止：列出 paths 以 demonstrate completeness、preview Implementation Units，或描述 implementation reaches 到哪里。synthesis 命名 plan target 的 *what*，不是 code lives 的 *where*。

### 每个 call-out 的 keep test（保留测试）

从 internal draft 保留 candidate call-out 前，先运行 **affirmability test**：用户是否需要看 code 才能 evaluate this？如果是，它就是 plan-body content，cut。如果不是，应用 keep test；以下至少一项必须为真：

- **Real fork（真实分叉）**：另一个 reasonable agent 可能在这个 dimension 上选择不同方案（extend pattern X vs. introduce abstraction Y；scan source A vs. source B 等）
- **Non-obvious behavioral choice（非显然行为选择）**：agent 选择的 default，用户仅阅读 summary 看不到，但它会 materially affect plan 做什么（例如 "scans the working-dir snapshot before the copy step"；用户无法从 gate purpose 的描述中 infer scan target）
- **Non-obvious exclusion（非显然排除项）**：某个 item 被 deliberately excluded，用户可能想 add back
- **Cheap-now-expensive-later correction（现在便宜、以后昂贵的纠偏）**：一个用户现在很适合 redirect、但 research 或 plan-write 后 undo 会很昂贵的 bet

Cut 其他所有内容，包括：

- 没有 real alternative 的 mechanical items（例如 work 显然不需要 dependency 时的 "no new dependencies"）
- 会在 work 期间 settle 的 implementation choices（例如 regex precision tuned during impl）
- 已经被 summary 暗含的 items

### detail test（逐个 call-out 和 summary bullet 的细节测试）

keep test 后，每个 surviving item 都要运行 **detail test**：最多 1-2 行，conversational 而不是 documentary。一个 call-out 或 summary bullet 如果写成 4+ 行 dense prose，就是在命名 implementation consequence 而不是 decision；应在更高抽象层级 re-cut。

keep test 处理 *哪些* items survive。detail test 处理每个 surviving item *说多少*。没有它，count cap 很容易被 game：agent 可以命中 "3 call-outs"，但每个 call-out 都是 6 行段落，导致 synthesis 读起来像 doc preview 而不是 checkpoint。

### call-outs 数量多少才合适？

cap 是 heuristic，不是法律。真正的 discipline 是对每个 candidate 应用 keep test。按 plan depth 的 typical bounds：

| Plan depth | Typical（典型值） | Cap（上限） |
|---|---|---|
| Lightweight | 0-2 | 3 |
| Standard | 1-3 | 4 |
| Deep | 2-5 | 6 |

**如果 stage-2 pass 超过 tier cap，或任何 call-out / summary bullet 写成 4+ 行 dense prose，synthesis 形状已经错了；不要提高 cap 或接受 bloat，要在更高抽象层级 re-cut。** 几乎总是因为这些 call-outs 中有 2-3 个是某个更大 fork 的 sub-decisions（file path、flag name、JSON key behavior 和 dependency choice 通常是同一个 "how to extend the existing scaffold" decision 的四个 facets，而不是四个 independent forks）。将 related call-outs collapse 成一个 decision，并命名在用户真正权衡的层级上。用户的 job 是 redirect forks，而不是 validate 他们已经通过 higher-level decision 隐式同意的每个 implementation consequence。

一个有用测试：把 call-outs 读出来。如果两个或更多听起来像同一想法的 "and also" 延伸，它们就应该合并为一个。

### call-outs 中的 anti-patterns（反模式）

下面每个 anti-pattern 都会产生不通过 affirmability test 的 call-out。如果 candidate call-out 匹配其中之一，它就是 plan-body content；cut，不要 rephrase。

- 命名 file path 或 module name（`internal/artifacts/pii.go`）
- 命名 flag、env var 或 exact env value（`--accept-redaction-list=<finding-id,...>`）
- 指定 JSON shape、response format 或 exact data structure
- 命名 HTTP status codes、event names 或 exact error wording
- 描述 implementation flow（"first X, then Y, then Z"）
- 命名 exact method signatures、call graphs 或 SQL syntax
- 陈述没有 real alternative 的 mechanical choice（"uses stdlib regexp"）

line-number、signature 和 code-spec 规则并不新；它们一直在 Inferred bullets 中被禁止。它们同样适用于 call-outs，因为 call-outs 现在是 user-facing surface。

---

## 何时跳过 blocking confirmation

auto-proceed path（announce 而不等待 user confirmation）只在 **plan depth 是 Lightweight 且 zero call-outs survive keep test** 时触发。对 Standard 或 Deep plans，即使 zero call-outs survive，也始终触发 confirmation gate；赢得 checkpoint 的是 substance，不是 interaction history。一个有 rich silent decisions 却只有 1-3 行 summary 的 Deep plan，正是最容易被 rubber-stamp 的场景；explicit confirmation request 给用户在 research 或 plan-write 继续前 push back 的真实机会。

当 auto-proceed applies（Lightweight + zero call-outs）时，emit one-line announcement 并继续：

```
正在规划：[1-3 行 summary]

没有需要你权衡的开放决定 — 我会继续 [research / plan-write]。如果我理解错了 scope，请随时打断。
```

skip 时 announcement 是 mandatory；不允许 silent proceeding。"why"（没有值得 flagging 的 forks）必须 visible。

对 zero call-outs 的 Standard/Deep，confirmation template 仍会触发；只是省略 "Call outs:" header。用户得到 summary 加 explicit confirmation request。

---

## Synthesis 结构纪律（shared，共享）

两个 variants 共享这些 structural rules。它们解决 synthesis 变成 Phase 5.2（plan-write）preview 而不是 scope checkpoint 的 failure modes。

**Summary leads, call-outs follow（summary 在前，call-outs 在后）**，不要反过来，也不要在上方放 separate framing block。把 extensive content 放在 synthesis 上方（approach pitch、files-touched bullets、rationale block）会 invert structure：synthesis 变成 proposal 的 footnote，而不是 call-outs 依赖的 tier-budgeted summary。

**Anti-pattern: synthesis as plan-pitch（反模式：把 synthesis 写成 plan 推介）。** Plan-body content（file paths、code shapes、sentinel strings、exact error messages、"Recommendation" / "Behavior when X" / "Why this shape" rationale）无论出现在何处，都不属于 chat output：不在 call-outs 上方的 block 中，不在 summary 内，也不嵌在 call-out commentary 或 sub-bullets 中。position rule 和 content rule 是 independent：structurally-legal placement（在 call-out bullet 内）不会 legitimize plan-body content。如果你发现自己在任何地方写它，stop。那是 Phase 5.2（plan-write）的 territory；它属于下一 phase 将写出的 plan body，不属于 synthesis presentation。synthesis 是 scope/decisions checkpoint：一个 tier-budgeted summary，加上受 tiered cap 约束的 call-outs（见 "How many call-outs are right?"）。implementation detail 在 synthesis 任意位置泄漏，说明 Phases 1-4（research and structuring）和 Phase 5.2（plan-write）已经 collapsed into synthesis-confirmation step。

**Anti-pattern: numerical attestation（反模式：数字式背书）。** "All nine requirements covered"、"all three flows in scope"、"five acceptance examples addressed"、files 或 test scenarios 的 counts。这些是 agent showing its work 或 attesting completeness，不是命名 scope decisions。"Covers the full brainstorm scope" 已经传达 claim；count 不增加用户可 affirm 或 redirect 的内容。cut numbers，保留 scope claim。

**revision 不是 confirmation。** 任何 user revision 后（即使是 trivially-understood swap），integrate change，re-present 反映 change 的 revised stage 2，然后等待 explicit confirmation 再写 plan。loop 如下：

1. 呈现 stage 2 → user responds
2. User confirms（用户确认）→ write the plan
3. User revises（用户修订）→ integrate，重新呈现 revised stage 2，回到 step 1

Plan-write（Phase 5.2）只在 explicit confirm 后，或 soft-cut blocking question 的 "proceed" option 后触发。永远不要在 revision 后立即写 plan，即使 revision 小到 agent 觉得自己理解了；confirmation step 让 synthesis 成为 **confirmed**，而不是 "agent's last proposal"。

---

## Granularity：命名 decision，不要展开它（shared）

每个 call-out 都应能让用户**无需读 code**就 affirm 或 reject。以能让用户说 "yes" 或 "I want X instead" 的 granularity 命名 decision。更具体的内容都是 plan-body content，是 Phase 5.2 的职责，不是 synthesis 的职责。

**Allowed（允许）**（当这些确实是正在做的 decisions 时）：
- File / module names（file / module 名称）：当选择点是 "where to put it" 时，可写 "skip filter in the matcher"
- Pattern names（pattern 名称）：当选择点是 "extend vs. introduce" 时，可写 "extends the existing event-skip pattern"
- Column / table names（column / table 名称）：当选择点是 "which source" 时，可写 "user-TZ" 或 "destination-calendar TZ"
- Approach posture（方案姿态）：当选择点是 "which strategy" 时，可写 "DB-side query with Google-side fallback"

**Not allowed（不允许）**（无论 variant 如何，始终属于 plan-body）：
- Line numbers（行号，例如 `route.ts:249-255`）
- Exact method signatures、call graphs 或 implementation flow（精确 method signatures、call graphs 或 implementation flow，例如 "at the top, before include/exclude evaluation, returning ..."）
- Exact JSON / response shapes（精确 JSON / response shapes，例如 `{pause, cleanup: {eventsDeleted, eventsFailed, errors}}`）
- HTTP status codes（HTTP 状态码，例如 `409`、`404`、`403`）
- Exact event / activity-log / type names（精确 event / activity-log / type names，例如 `userPauseSet/userPauseEdited/...`）
- Error messages 或 UI labels 的 exact wording（error messages 或 UI labels 的精确措辞）
- SQL syntax 或 query bodies（SQL syntax 或 query bodies）

不同 variant 的边界略有不同。**Solo（Phase 0.7）** 保持在更高层级；brainstorm 的 WHAT 尚未 validated，所以 file/module names 通常过于 specific；用 "the rule entity" 这类说法，而不是 "syncRules table"。**Brainstorm-sourced（Phase 5.1.5）** 当 file / module / pattern / column level 本身就是 plan-time decisions 时允许它们，但不允许 implementation flow specifics。

### Bad-vs-good 示例

| Plan-body in call-out（错误） | Decision-level（正确） |
|---|---|
| Timezone source: `users.timezone` (IANA), fallback to destination calendar TZ if null. Research found `useTimezoneSync` and `ProtectionStatsCalculator` establish the pattern. | Timezone source: user-TZ (reverses brainstorm's tentative lean — research found established infra and pattern precedent) |
| Skip filter goes in `RuleMatcher.eventMatchesRule` at the top, before include/exclude evaluation, using the existing `filteredReason` mechanism. | Skip filter extends the existing event-skip pattern in the matcher (vs. introducing a new mechanism) |
| Reactivation guard: explicit safety in `[ruleId]/route.ts` PATCH — when `isActive: false → true`, the existing handler clears `status/pausedAt/pausedReason`. | Reactivation guard: pause window state preserved through the isActive toggle's existing system-pause-clearing path |
| Partial cleanup failure response: `{pause, cleanup: {eventsDeleted, eventsFailed, errors}}`; pause window persists regardless of cleanup outcome. | Partial cleanup failure: pause window persists; partial-failure response mirrors the existing rule-edit precedent |

测试：scanner 阅读 call-out 时，应能在无需读 code 的情况下 affirm 或 reject。如果他们必须查 column name、method name 或 call graph 才能 evaluate call-out，granularity 就错了；那是 plan-body content。

### Worked example（示例）：从 internal draft 压缩到 call-outs

对一个 PII redaction gate proposal，如果 internal draft 有 4 个 Stated items、7 个 Inferred items 和 3 个 Out-of-scope items，压缩后的 stage 2 如下：

```
Planning a mechanical PII redaction gate before promote (the unguarded leak path from the amazon-orders retro) and alongside the existing vendor-prefix scanner at publish. Phase-1 detectors are shape-only — card last-4, postal address, JSON person names. Default halts; per-finding ack via flag.

**Call outs:**
- Person-name filter works by JSON key (allowlist of attribution keys: `printer`, `printer_name`, `owner_name`, `author`), not by name value.
- Promote scans the working-dir snapshot before the copy step, not the staged copy.
- Publish combines PII + vendor-prefix findings into one report, not fail-fast on first.

Confirm and I'll proceed to research, drawing on this scope.
```

从 internal draft 中 cut 掉的内容及原因：

- "Module name: `internal/artifacts/pii.go`" — plan-body content（file path），未通过 affirmability test
- "Flag name: `--accept-redaction-list=<finding-id,...>`" — plan-body content（exact flag string），未通过 affirmability test
- "No new dependencies — stdlib regexp + filepath.WalkDir only" — mechanical，无真实 alternative
- "Detector regex precision tuned during implementation" — deferred-impl，不是 plan-time fork
- All three Out-of-scope items（三个 out-of-scope item）— 要么已在 prose 中重述（"defer to #960"），要么已被 scope 隐式排除

保留下来的内容：三个 real forks，另一个 reasonable agent 可能会选择不同方案，且用户现在可以 cheap correction。每个都能在一句话内 affirm，无需读 code。

---

## Solo variant（solo variant，单独规划变体，Phase 0.7）

仅在以下条件全部满足时触发：
- Phase 0.2 没有找到 upstream brainstorm doc
- AND Phase 0.4 留在 ce-plan（没有 route 到 ce-debug、ce-work 或 universal-planning）
- AND Phase 0.5 已 cleared（没有 unresolved blockers）
- AND 不在 Phase 0.1 fast paths 上（resume normal、deepen-intent）

每个 guard 都是 SKILL.md 中 explicit conditional，不是 implicit。R2 solo 不会在 resume/deepen、route-out 或 brainstorm-sourced paths 上触发。

**Content focus（内容焦点）**：full-breadth internal draft。Phase 0.4 bootstrap 按设计很 brief（"ask one or two clarifying questions"），所以 Phase 0.7 触发前，agent 已经做出 substantial inferences。internal draft 中的 Inferred bucket 在这里尤其 load-bearing；agent 的 bets 最宽。Stage 2 compression 仍适用：这些 inferences 中大多数不会 survive keep test，这是正确的；用户只应看到他们可以 meaningfully redirect 的 forks。

**Counter-warning for rich-context invocations（丰富上下文调用的反向警告）。** 当 inference source 不只是 Phase 0.4 bootstrap 时，例如同一 conversation 中之前的 validation agent、同一 session 中已完成的 sibling work units、或 conversation 中已有 planning artifact，容易想把这些 material 原样 dump 到 call-outs。此时 granularity rules 是收紧而不是放松：agent 有更多 material 需要 compress，不是更多 material 需要 expose。已经 upstream validated 的 bet 是 **Stated**（internal），不是 Inferred（internal）；其 specifics 属于 plan-body 的 bet，无论 upstream context 提供了多少 detail，都在 call-out 中按 decision-level 命名。如果 recent turns 产生 detailed code、file paths 或 research artifacts，应预期 internal draft 会 over-share，并在 stage 2 前主动 compress。

**为什么是 pre-research，而不是 pre-write**：如果 scope 错了，research effort 会被浪费。在 sub-agent dispatch（Phase 1.1 的 repo-research-analyst、learnings-researcher 等）之前捕获 scope errors，可节省 token 和 time cost。

### Stage 2 template（stage 2 模板，solo）

**Summary discipline（required）：** 描述 **plan 将 target 什么 scope**，forward-looking（*will* be planned），不是 retrospective。summary 的 job 是帮助用户在阅读 call-outs 前，将 intent pattern-match；solo invocation 的 pre-write dialogue 很少，所以 summary 在这里尤其 load-bearing。form（prose、bullets、mix）和长度遵循上方 "Stage 2: chat-time scoping synthesis" 中的 tier budget；detail test 适用于每个 bullet。

**Anti-fluff guidance（反空话指南）：** 用 plain words 先说实际正在 planned 的东西。不要 qualifiers（"comprehensive"、"thoughtful"、"substantive"）。不要重述用户 prompt。如果 scope 无法在 tier budget 内无 filler 地说清，synthesis 还没准备好。

**Confirmation template（确认模板；Standard/Deep 无论 call-out count 如何都会触发，或任何 tier 只要有一个或多个 call-outs surviving 就触发）：**

```
基于你的 request 和我们的简短讨论，我建议按下面的 scope 来规划：

[scope claim — plan 会 target 什么、不会 target 什么；保持在 affirm-or-redirect level；不要枚举 Implementation Units]

**Call outs:**（当 zero forks survived keep test 时省略此 header）
- [用 1-2 行写 decision-level fork：命名选择，并可在括号中写一个从句的 trade-off。不要写多句 rationale，不要写 "my default is X" 式 pitch；这些属于 plan body 中的 Key Technical Decisions，不属于 synthesis]

确认后我会基于这个 scope 继续 research。（如果这件事比你最初想的更大，也可以 redirect 到 /ce-brainstorm；我会停在这里并为你加载它。）
```

**Auto-proceed template（自动继续模板；仅 Lightweight 且 zero call-outs 时触发）：**

```
正在规划：[1-3 行 scope claim]

没有需要你权衡的开放决定 — 我会继续 research。如果我理解错了 scope，请随时打断。
```

然后不等待，继续 Phase 1。对任何确实到来的 user response，使用 prose 处理（不要 `AskUserQuestion` menu）。理由是 SKILL.md 中的 Interaction Rule 5(a)。

---

## Brainstorm-sourced variant（brainstorm-sourced variant，来自 brainstorm 的变体，Phase 5.1.5）

仅在以下条件全部满足时触发：
- Phase 0.2 找到 upstream brainstorm doc（brainstorm-sourced invocation）
- AND 不在 Phase 0.1 fast paths 上

**Content focus（内容焦点）**：只关注 plan-time decisions。brainstorm + R1 synthesis 已经 validated WHAT to build；internal draft 和 stage 2 surface plan 将如何 execute that work，也就是 brainstorm 未做出的 decisions。

internal draft 中应 surface 的 items：
- **Files/modules to touch（and not touch）** — implementation reaches into 什么
- **Patterns extended vs. introduced new** — agent 在 confirmed scope 内做出的 architectural decisions（R2 的 content focus，不偏向任一方向）
- **Test scope** — 哪些 existing-but-untested code 属于本次 work 的 test scope，哪些不属于
- **Refactor scope** — adjacent cleanup（如有）进入 deferred items 还是 active diff
- **Cross-cutting impact** — 触及 auth、migrations、shared types 时

其中多数不会作为 separate call-outs survive keep test。只 surface 另一个 reasonable agent 可能选择不同、且用户现在能 cheap correction 的 forks。

**从 doc body 读取，而不是从 synthesis section 读取**：brainstorm docs 没有 `## Synthesis` section（synthesis 是 ce-brainstorm 中的 chat-time artifact；只有 prose summary 作为 `## Summary` 嵌入）。Phase 5.1.5 从 brainstorm doc 的 body sections（Summary、Problem Frame、Requirements、Key Decisions、Scope Boundaries）加 Phase 1 research 中 derive plan-time decisions。可能带有 legacy `## Synthesis` section 的旧 brainstorms 也可工作；该 content 被视为 supplementary，不是 authoritative，body sections 优先。

**为什么是 pre-write，而不是 pre-research**：brainstorm doc + R1 synthesis 已经 validated WHAT，所以 research 是 well-targeted 的。plan-time decisions 会在 research 和 structuring（Phases 1-4）期间 emerge，因此 pre-write 在最后一个 cheap moment 捕获它们：Phase 5.2 将 plan commit to disk 之前。

### Stage 2 template（stage 2 模板，brainstorm-sourced）

**Summary discipline（required）：** 在 high level 描述 **implementation 如何 approach this work**：touched files/modules、patterns extended vs. introduced、plan honors 的 scope boundaries。forward-looking（plan 中 *will* 有什么），不是 retrospective。假定 Brainstorm-validated WHAT 已成立；summary 覆盖 HOW。form（prose、bullets、mix）和长度遵循上方 "Stage 2: chat-time scoping synthesis" 中的 tier budget；detail test 适用于每个 bullet。

**Anti-fluff guidance：** 用 plain words 先说 actual implementation shape。不要 qualifiers，不要重述 brainstorm 的 WHAT。如果 summary 只是 restate brainstorm 的 Problem Frame，重写为聚焦 plan-time decisions。

**Confirmation template（Standard/Deep 无论 call-out count 如何都会触发，或任何 tier 只要有一个或多个 call-outs surviving 就触发）：**

```
Brainstorm 的 scope 是：[使用 brainstorm 自己的 vocabulary 写 1-2 句 scope restatement，作为 orientation；不要枚举 Implementation Units、constraints 或 acceptance examples]。

这个 plan 会：[写 plan-specific scoping：相对 brainstorm 覆盖、defer 或 expand 什么；test scope；任何被纳入或排除的 adjacent refactors。按内容使用 prose 或 bullets]。

**Call outs:**（当 zero forks survived keep test 时省略此 header）
- [用 1-2 行写 plan-time fork：命名选择，并可在括号中写一个从句的 trade-off。不要写多句 rationale，不要写 "my default is X" 式 pitch；这些属于 plan body 中的 Key Technical Decisions，不属于 synthesis]

确认后我会基于 brainstorm、research 和这份 synthesis 写出 plan。
```

**Auto-proceed template（仅 Lightweight 且 zero call-outs 时触发）：**

```
正在规划 [brief brainstorm-scope restatement] — [用一个从句写 plan-specific shape]。

没有需要你权衡的开放决定 — 我会继续 plan-write。如果我理解错了 scope，请随时打断。
```

然后不等待，继续 Phase 5.2。对任何确实到来的 user response，使用 prose 处理。理由是 Interaction Rule 5(a)。

---

## circularity 的 soft-cut（shared）

按 round 跟踪用户 touched 的 call-outs。soft-cut blocking question **只在同一 call-out 被 revised 两次**时触发（或第三轮 revision 触及第二轮已 revised 的 call-out）。跨 rounds 的 new-call-out revisions 不设限制。

**跨 rounds 的 identity 按 decision dimension 判断，不按 surface wording。** revision 可能导致 stage 2 re-derive；同一个 underlying fork 可能以改写、与另一个 call-out 合并、或拆成两个的形式回来。"Same call-out" 指正在做的同一个 decision（例如 "where does the scan run" 无论写成 "promote scans the working-dir snapshot" 还是 "scan target: pre-copy working dir"，都仍是同一个 decision）。当 re-cut 将多个 prior call-outs collapse 成一个时，新的 combined call-out 会继承其中任一 constituent 的 "touched" 状态；如果这些 underlying decisions 中任一个已经 revised 过一次，soft-cut 就会触发。

soft-cut 触发时，使用平台的 blocking question tool，提供两个 options：

- `Proceed and continue to [research / plan-write]`
- `Hold off — keep discussing before continuing`

只有 blocking tool 不存在或调用出错时，才 fallback 到 chat 中的 numbered list。永远不要 silently skip。

---

## Headless mode（headless mode，无交互模式，shared）

当 skill 从 automated workflow（如 LFG）或任何 `disable-model-invocation` context 调用时，skill 以 non-interactive mode 运行（没有 synchronous user）。artifact 会被 downstream skills（ce-doc-review、ce-work）和 human reviewers（PR review）读取。

**Stage 2 在 headless mode 中 moot。** 像往常一样 compose internal draft（stage 1），但 skip chat-time compression；没有 synchronous user 可确认，没有 call-outs 需要 derive，也没有 auto-proceed announcement。通过下方 doc-shape table 将 internal draft 直接 route 到 plan body。

**Per-variant behavior**（timing 会影响后续 phases）：

- **Solo variant（Phase 0.7）**：在 research *之前*触发。compose internal draft，并照常继续 Phase 1 research。Inferred content 保留到 plan-write（Phase 5.2），在那里 route 到 `## Assumptions`。
- **Brainstorm-sourced variant（Phase 5.1.5）**：在 research *之后*、plan-write 之前触发。compose internal draft 并进入 Phase 5.2 plan-write。Inferred content route 到 `## Assumptions`。

**两个 variants 的 shared behavior：**

- **No user prompt; no stage 2; no auto-proceed announcement（无用户提示、无 stage 2、无自动继续公告）。** 三者都 moot。
- **按 mode-aware shape route internal-draft content：**
  - **Stated** content → Requirements（user-stated constraints，存在时 trace 到 origin 的 R-IDs）
  - **Out-of-scope** content（超出范围内容） → Scope Boundaries
  - **Inferred** content → plan 中的 `## Assumptions` section，明确标记为 un-validated agent bets。不要将 Inferred items route 到 Key Technical Decisions 或 Implementation Units；那会让 un-validated bets 与 user-confirmed decisions 无法区分。

`## Assumptions` section 只出现在 non-interactive plans 中。Interactive plans 不需要它（Inferred bets 要么通过 call-outs 被 user-corrected 并变成 Key Technical Decisions，要么被 revised away，要么被 keep test 判定为 not-fork material 并 silently dissolve 到 Implementation Units）。

这恢复了 original design intended 的 audit visibility（un-validated bets 不得作为 authoritative content propagate），但将它们以自己的 label surface，而不是 hiding。Downstream review（ce-doc-review、ce-work、human PR review）可以专门 scrutinize Assumptions。

---

## Self-redirect（self-redirect，自我重定向，shared）

如果用户 response 表明他们处在错误 skill 中，或想要不同 workflow：

- **Solo variant**：常见 redirects 包括 "this is bigger than I thought — let me brainstorm first"（suggest `/ce-brainstorm`）、"this is just a fix, no plan needed"（suggest `/ce-work`），或 "I need to investigate first"（suggest `/ce-debug`）。
- **Brainstorm-sourced variant**：较少见，但可能发生，例如 "actually this scope is wrong, take it back to brainstorm"（suggest `/ce-brainstorm` 来 revise upstream doc）。

无论哪种情况：stop ce-plan，suggest alternative skill，offer 在 session 中加载它。不要 push back 或 argue；用户的 redirect signal 是 deliberate choice。

---

## confirmation 后的 doc shape

用户 confirmation 后（或 soft-cut decision 选择 proceeds 后），Phase 5.2 写 plan doc。internal draft 不会作为 `## Synthesis` section 进入 plan。只有 stage-2 summary 会嵌入，替换 plan template 中现有的 `## Overview` slot（为 terminology consistency 重命名为 `## Summary`）。internal-draft content dissolve 到 plan body sections：

| Internal-draft element | 在 plan 中的位置 |
|---|---|
| Summary (stage 2) | `## Summary` (1-3 lines prose, forward-looking) — rewrite to plan convention if the chat-time summary used bullets. Solo variant: scope being targeted. Brainstorm-sourced: implementation approach |
| Stated bullets | `## Requirements` (R-IDs) and where relevant `## Problem Frame` for narrative context |
| Inferred bullets | `## Key Technical Decisions` (with rationale) and Implementation Units when the bet drives a structural choice. In non-interactive mode, route to `## Assumptions` instead — see Headless mode above. |
| Out-of-scope bullets | `## Scope Boundaries` — including the `### Deferred to Follow-Up Work` subsection when relevant |

不要添加 italic capture-context note（例如 "Captured at Phase 0.7..."）。这会把 engineering process 泄漏到不需要该信号的 artifact 中。

plan 的 `## Summary` 和 `## Problem Frame` 必须服务不同 purposes：Summary 回答 "what is this plan proposing?"（forward-looking，1-3 lines）；Problem Frame 回答 "why does this proposal exist?"（backward-looking，paragraphs）。不要在 Problem Frame 中 restate proposal；不要用 situational context padding Summary。

---

## 哪些内容不属于 synthesis

- Implementation code（不要 imports、exact method signatures、framework-specific syntax、JSON shapes、exact error message wording），无论在 chat output 还是 internal draft 中
- 对 entire brainstorm doc 的 re-statement；synthesis 是 plan-perspective，不是 copy
- Defensive what-ifs 和 hedges；如果 concern 真实，将其写为 Inferred（internal）；如果只是 speculation，drop
- 将 internal three-bucket draft 作为逐字 user-facing artifact 粘贴到 chat；那是旧 shape，它产生的 volume problem 正是 stage 2 存在的原因。内部 compose，derive call-outs，compressed presentation
- 在 buckets/call-outs 之外 surfaced open questions；到 synthesis time，每个 scope-shaping question 必须属于 **Stated**（internal，之前已问已答）、**Inferred**（internal，agent 的 correction bet，如 survives keep test 则 surface as call-out），或 **Out**（internal，deliberately excluded）。没有第四种 status
- 与 stage 2 相邻的 floating questions；如果某个 question 确实不能 default，pause synthesis 并 resolve 后再 present。选择匹配的问题形状：options bounded 且 meaningfully distinct 时用 blocking multiple-choice tool；当 option set 会按 Interaction Rule 5(a) bias answer 时，用 prose。整合答案后，再 present stage 2。永远不要在 stage 2 旁边 present floating questions；那会让用户没有 clear resolution path
