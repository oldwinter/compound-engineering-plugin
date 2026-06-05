# `ce-resolve-pr-feedback`

> 并行 evaluate、fix 和 reply PR review feedback。真实的问题就修；不真实的不要 churn。

`ce-resolve-pr-feedback` 是 **incoming-feedback resolution** skill。PR 收到 review comments 后，此 skill 会 fetch 所有 unresolved threads，将它们分类为 new vs already-handled，并行分派 agents validate 每个 finding，修复确实正确的问题（或用 reasoning reply），commit 并 push，然后通过 GitHub GraphQL API reply 并 resolve threads。它按每一项自身 merits 判断，不看 source（human 或 bot）或 form（inline thread、formal review body、top-level comment），并默认 fix；只有读代码时触发 concrete signal（finding 错、fix 有害、没有收益，或风险无法 bounded）才 divert。

Compound-engineering ideation chain 是 `/ce-ideate -> /ce-brainstorm -> /ce-plan -> /ce-work`。`ce-resolve-pr-feedback` 是 **post-PR feedback loop**：reviewers 留 comment 后调用；它补充 `/ce-code-review`（PR 打开前 review）和 `/ce-debug`（调查 broken behavior，而不是 review feedback）。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | Fetch unresolved review threads + PR comments，分派 parallel agents validate 每个 finding 并修复真正正确的问题，commit/push，reply 并 resolve threads |
| 何时使用？ | PR 收到你想处理的 review feedback 后 |
| 产出什么？ | Fix commits、每个 thread 的 replies、通过 GraphQL resolved threads，以及按 verdict 汇总做了什么 |
| 模式 | Full（所有 unresolved threads）、Targeted（single thread URL） |

---

## 问题

大规模处理 PR feedback 会以可预测方式失败：

- **Over-fixing bot noise**：auto-review bots 过度 flag、flag immaterial things，并且有时错误；"fix everything" reflex 会用低价值 changes churn code 和 PR
- **Findings taken on authority, not merit**：因为 reviewer（或 bot）说了就修，而不确认 issue 是否真的存在于 code 中
- **Already-replied items re-surface every run**：top-level PR comments 和 review bodies 没有 resolve mechanism，因此会反复出现，除非手动检查
- **Bot wrapper noise**：review-bot boilerplate（"Here are some automated review suggestions..."）膨胀 work count
- **Sequential fixes are slow**：逐个处理 12 个 threads 是 12 倍 wall-clock time
- **Parallel fixes collide**：两个 agents 写同一文件，会 silent lose 其中一个 change
- **No combined validation**：每个 agent 只对自己的 change 跑 targeted tests；cross-agent regressions 会漏掉
- **Outdated comment line numbers**：feedback 所在 lines 已 drift 时，很难 relocate

## 解决方案

`ce-resolve-pr-feedback` 把 feedback resolution 作为 structured pipeline：

- 通过 GraphQL **fetch all unresolved feedback**（review threads + PR comments + review bodies）
- **Triage new vs already-handled**：有 substantive reply 且 defer action 的算 handled；只处理 new items
- **Drop bot wrapper noise silently**：过滤 non-actionable boilerplate，不 announce
- **Fix by default; validate as a tripwire**：每个 finding 按 merits 判断，不看 source 或 form；agent 默认 fix，除非读 code 时触发 concrete signal（finding 错、fix 有害、没有收益，或风险无法 bounded）
- **Parallel agent dispatch with file-collision avoidance**：触及 overlapping files 的 agents 自动 serialize
- **Combined validation**：所有 agents 完成后跑一次 full validation，捕获 cross-agent regressions
- **Reply with quoted context**：每个 reply 引用 relevant feedback 以保持 continuity，然后说明做了什么
- **Resolve via GraphQL**：review threads 被 resolved；PR comments 和 review bodies 得到 top-level reply（API 中没有 resolve mechanism）

---

## 新颖之处

### 1. Default to fixing：只在 tripwire 触发时 divert

多数 review feedback（包括 P0-P2 和 nitpicks）都是正确且值得修的，所以默认是 fix。关键是 validation 不是独立 analysis pass：agent 为了修复本来就要读 code，而 checks 是它在阅读时注意到的 *tripwires*，不是每项都必须自证的 gate。没有触发 tripwire 时，它直接 fix 并继续；不做 per-item deliberation。深工作（读 callers、评估 blast radius、给用户写 decision）只花在少数触发 wire 的 items 上。

Item 只有在 concrete signal 下才从 fix divert：

- **finding doesn't hold**（读 code 推翻它）-> `not-addressing` with evidence
- **fix would make the code worse** -> `declined`，引用 harm
- **change buys nothing real**（cosmetic 或 immaterial；小但 *真实* 的 improvements 仍会 fix；skip bar 是 "no benefit"，不是 "minor"）-> `replied`
- **change risky 且 blast radius can't be bounded**（one-line edit 可能触及 hot path 或 thinly-tested code；reviewer，尤其 bot，通常看不到）-> 尽量用 test de-risk 并 fix，否则 `needs-human`
- **它是 question，不是 change** -> `replied`，或 product/business call 时 `needs-human`

Guardrail against over-thinking 是 explicit："I'm uneasy" 不是 tripwire；"I read the callers and this breaks X" 才是。这对 auto-review bots 尤其重要，因为它们过度 flag；但规则 source-agnostic：bot 或 human 的 assertion 本身不是正确性的 evidence。

### 2. 按 merit 判断，而不是按 source 或 form

每项 feedback 都以相同方式评估，不管 **谁** 提出（human reviewer 或 review bot），也不管 **以什么 form** 到来（inline review thread、formal review body、top-level PR comment）。Correctness 不取决于 source 或 surface。Structural form 只改变 *response mechanics*（inline threads 通过 GraphQL resolve；review bodies 和 top-level comments 获得 top-level reply），不改变 finding 是否正确。

### 3. Six verdicts：每个 verdict 对应不同行动

| Verdict | 含义 | Action |
|---------|---------|--------|
| `fixed` | 按请求做了 code change | Commit + reply + resolve |
| `fixed-differently` | 做了 code change，但使用比建议更好的 approach | Commit + reply 解释 divergence + resolve |
| `replied` | 不需要 code change；回答了 question、解释了 design，或 change 不值得 | Reply + resolve |
| `not-addressing` | Feedback 对 code 的事实判断错误 | Reply with evidence + resolve |
| `declined` | 实现 suggested fix 会主动让 code 变差 | Reply citing harm + resolve |
| `needs-human` | 无法判断正确 action | Reply with structured `decision_context` + leave open |

`needs-human` high-signal 且少见：它包含 reviewer 说了什么、agent 调查了什么、为什么需要 decision，以及带 tradeoffs 的 concrete options。

### 4. Triage（分诊）：new vs already-handled

对每条 feedback，skill 先分类再处理：

- **Review threads**：读取 thread；如果已有 substantive reply defer action（"need to align on this"、"going to think through this"），则为 **pending**，不 reprocess。只有 original-comment-only threads 是 **new**。
- **PR comments + review bodies**：没有 resolve mechanism，因此每次 run 都会重现。两层 filters：actionability（跳过 review wrappers、approvals、status badges、无 asks 的 CI summaries），然后 already-replied（已有 reply 引用并处理了 feedback）。通过两层的才是 **new**。

CodeRabbit、Codex、Gemini Code Assist、Copilot 的 bot wrappers 会被 silently dropped：通过 boilerplate content 识别，绝不 announce 或 count。这是 *content* check（这里是否有 actionable 内容？），不是 source check，因此即使 bot format 变化也成立。

### 5. 避免 file-collision 的 parallel dispatch

1-4 个 items 全部并行。5+ 时按 batches of 4。**Dispatch 前，skill 会检查 items 间 file overlaps**：overlapping items serialize，确保两个 agents 不会并行写同一文件。

Sequential fallback：不支持 parallel dispatch 的 platforms 顺序运行 agents。

### 6. 全部 agents 完成后的 combined validation

每个 resolver agent 对自己的 changes 跑 targeted tests。所有 agents 返回后，skill 聚合 `files_changed` 并运行 project full validation **一次**，捕获 targeted runs 看不到的 cross-agent interactions。

| Outcome | Action |
|---------|--------|
| Green | 继续 commit |
| Red, failures touch resolver-changed files | 一次 inline diagnose-and-fix pass；仍 red 则 escalate 为 `needs-human`，不 commit |
| Red, failures touch only files no resolver changed | 视为 pre-existing；commit 中加 footer note |

### 7. 带 quoted context 的 reply format

每个 reply 引用 original feedback 的 relevant part 以保持 continuity，然后说明做了什么：

- **Fixed:** `> [quoted feedback]` 后接 `Addressed: [brief description of the fix]`
- **Not addressing:** `> [quoted feedback]` 后接 `Not addressing: [reason with evidence]`
- **Declined:** `> [quoted feedback]` 后接 `Declined: [specific harm cited]`

这让 reviewers 即使几周后读 reply，也能知道正在处理什么，而不用重读整个 thread。

### 8. Outdated comment relocation（过期 comment 重定位）

Outdated lines 上的 threads 常有 `line: null`，需要 fallback 到 `originalLine`。Skill 会把 `isOutdated` flag 和四个 location fields（`line`、`originalLine`、`startLine`、`originalStartLine`）传给每个 agent，让 agent 知道 reported line 可能 drifted，并能适当 relocate。

### 9. 带 escalation 的 two-pass loop

如果 verify step 后仍有 new threads，skill 会从 triage 开始再重复一轮。两轮 fix-verify cycles 后，skill 停止 looping，并把 recurring pattern 作为 `needs-human` surface："Multiple rounds of feedback on [theme] suggest a deeper issue."

### 10. Two modes：Full 和 Targeted

| Mode | When | Behavior |
|------|------|----------|
| **Full** _(default)_ | 未提供 URL | 处理 PR 上所有 unresolved threads |
| **Targeted** | 提供 comment/thread URL | 只处理该 specific thread |

Targeted mode 用于 "address just this one comment" 场景：当用户想 isolate 处理一条 feedback 时很常见。

---

## 快速示例

Reviewer（以及 review bot）在你的 PR 上留下 8 条 comments。你调用 `/ce-resolve-pr-feedback`。

Skill 从 current branch 检测 PR，通过 GraphQL fetch：6 个 unresolved review threads、2 个 review bodies（其中一个是 CodeRabbit wrapper）、0 个 PR comments。Triage：CodeRabbit wrapper 是 non-actionable boilerplate，silently dropped。一个 review thread 有昨天的 substantive reply defer action：pending，skip。剩下 5 个 review threads + 1 个 review body 为 **new**。

Step 4 分派 6 个 `ce-pr-comment-resolver` agents，按 batches of 4。File-collision check：两个 threads 触及 `app/services/dispatcher.rb`，这两个 serialize；其余并行。每个 agent 读取 actual code，并按 merits 判断 finding：

- 2 个 findings clearly correct -> `fixed`
- 1 个建议 approach 可行，但有更干净 approach -> `fixed-differently`
- 1 个 bot finding 标记 "possible null deref"，但 type system 已排除 -> 对照 code 确认不成立 -> `not-addressing` with evidence（no churn）
- 1 个问 "is this intentional?" -> 可从 code 回答 -> `replied`
- Review body 问 design question -> `replied`

Combined validation 对 3 个 changed files 运行一次；tests pass。Commit + push。

Step 7 posts replies：每条引用 original feedback 并说明处理结果。5 个 review threads 通过 GraphQL resolve；review body 获得 top-level PR comment（API 中没有 resolve mechanism）。Step 8 verify：再次 fetch，empty。Done。Summary surface。

---

## 何时使用

在以下情况使用 `ce-resolve-pr-feedback`：

- PR 收到 review feedback，你想处理
- Auto-review bot 留下一堆 findings，想 against code validate，而不是 blind apply
- 想 isolate 处理 specific comment（Targeted mode with comment URL）
- 上一次运行留下 `needs-human` items，而你已决定如何推进

以下情况跳过 `ce-resolve-pr-feedback`：

- PR 还没有 feedback
- 只想 ack feedback 而不修：skill 预期会 act，不只是 acknowledge
- Feedback 在 brainstorm 或 plan doc 上，而不是 code -> 使用 `/ce-doc-review`

---

## 作为工作流的一部分使用

`ce-resolve-pr-feedback` 是 `/ce-commit-push-pr` 打开 PR 后的 closing loop：

```text
/ce-work → /ce-commit-push-pr → reviewer leaves comments → /ce-resolve-pr-feedback
```

它补充：

- **`/ce-code-review`**：PR 打开前 review；此 skill 处理打开后的 incoming feedback
- **`/ce-debug`**：用于 broken behavior；此 skill 用于 review-comment resolution

Resolution 落到 PR 后，标准 merge / re-review cycle 继续。如果下一轮 review 又产生 feedback，此 skill 可再次运行。

---

## 单独使用

Skill 可直接运行：

- **Current branch's PR（当前 branch 的 PR）**：`/ce-resolve-pr-feedback`
- **Specific PR（指定 PR）**：`/ce-resolve-pr-feedback 1234`
- **Targeted（single thread，定向单 thread）**：`/ce-resolve-pr-feedback https://github.com/.../pull/1234#discussion_r5678901`

Targeted mode 中，只处理 URL 指定 thread；不 fetch 或 process 其他 threads。

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | Full mode：current branch's PR |
| `<PR number>` | Full mode：that PR |
| `<comment/thread URL>` | Targeted mode：only that thread |

`scripts/` 中的 scripts：`get-pr-comments`（GraphQL fetch）、`get-thread-for-comment`（targeted 中 comment -> thread mapping）、`reply-to-pr-thread`（GraphQL mutation）、`resolve-pr-thread`（GraphQL mutation）。

---

## 常见问题（FAQ）

**Nitpicks 也会修吗？**
会，默认如此。多数 feedback（包括 nitpicks）正确且值得修，所以 agent 会修，除非读 code 时触发 concrete signal：finding 不成立、fix 会让 code 变差，或 change 没有真实收益。能改善 code 的正确 nit（即使很小）会被修；纯 cosmetic 且无收益的内容会 brief reply 而不是 churn。Skip bar 是 "no benefit"，不是 "minor"。

**它会区别对待 bot feedback 和 human feedback 吗？**
不会，这是 deliberate。Validation 基于 merit，而不是 authority：确认 finding 需要读 actual code，这项工作不因 bot 或 human 而不同；authority heuristic（"bot -> probably noise"）有误伤真实 bot-caught bug 的风险。Merit tripwires（finding 是否成立？fix 是否真的有用？）会自然过滤 bot noise，尤其是 speculative 或 immaterial 内容，而不需要 classify source。*Form* 也一样：inline thread、formal review body、top-level comment 只改变 reply 和 resolve 方式，不改变 finding 是否正确。

**为什么 silently drop bot wrappers？**
因为 announce 它们只会增加 noise，没有价值。CodeRabbit boilerplate（"Here are some automated review suggestions..."）包住真实 findings；wrapper 本身不可 actionable。在 summary 中 count 或 list dropped wrappers 会污染 report。Script-level filter 只处理 CI/status bots；content-aware drop（actionability check，不是 source check）捕捉其余内容。

**如果两个 parallel agents 冲突怎么办？**
Dispatch 前的 file-collision check 能捕捉大多数情况，overlapping items 会 serialize。少数情况下 fix 扩展到 referenced file 外（rename 更新 callers 等），step 5 的 combined validation 会捕捉 test breakage，step 8 的 verify 会捕捉 unresolved threads。如果任何一项暴露 inconsistency，skill 会 sequentially re-run affected agents。

**`needs-human` 是什么意思？**
Agent 已调查 feedback 和 code，但无法自信判断正确 action，通常因为选择依赖无法 infer 的 user intent。Thread 保持 open，并回复 acknowledgment；summary surface structured `decision_context`：quoted feedback、investigation findings、options with tradeoffs，以及 agent 的 lean（如有）。

**如果 feedback loop 永不收敛怎么办？**
两轮 fix-verify cycles 后，skill 停止 looping，并把 recurring pattern 作为 `needs-human` 连同 cumulative context 升级。它不会无限 retry。

---

## 另见（See Also）

- [`ce-code-review`](./ce-code-review.md) - pre-PR review；此 skill 处理 post-PR feedback
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) - 打开此 skill 响应的 PR
- [`ce-debug`](./ce-debug.md) - 用于作为 bug 报告的 broken behavior，而不是 review feedback
- [`ce-doc-review`](./ce-doc-review.md) - 用于 requirements 或 plan docs 上的 feedback，而不是 code
