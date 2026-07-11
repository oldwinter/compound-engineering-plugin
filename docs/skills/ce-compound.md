# `ce-compound`

> 记录一个刚解决的问题，让下次遇到时只花几分钟，而不是几小时。Knowledge compounds。

`ce-compound` 是 **knowledge-capture** skill。解决一个 non-trivial problem 后，此 skill 会在 `docs/solutions/` 写入 structured doc，覆盖 symptoms、root cause、what didn't work、working solution 和 prevention strategies。未来运行 `ce-plan`、`ce-ideate`、`ce-debug` 和 `ce-work` 时会查阅该目录，把它作为 institutional memory；同一个 investigation 就不必重复发生。

Compound-engineering ideation chain 是 `/ce-ideate -> /ce-brainstorm -> /ce-plan -> /ce-work`。`ce-compound` 是 **closing loop**：在 debugging 或 build session 末尾捕获文档，并把它反馈到上游，作为未来 runs 的 grounding。第一次解决 "N+1 query in brief generation" 可能要 30 分钟 research；第二次找到 doc，fix 只要 2 分钟。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 把 solved problem 记录到 `docs/solutions/[category]/[filename].md`，包含 structured frontmatter、bug-track 或 knowledge-track sections 和 cross-references |
| 何时使用 | 解决 non-trivial problem 后；用户说 "that worked"、"it's fixed"、"problem solved" 时 |
| 产出什么 | `docs/solutions/` 中的一篇 doc，外加可选的 `AGENTS.md`/`CLAUDE.md` 小编辑以提升 discoverability |
| 下一步 | 如果新 learning 暗示旧 doc 可能 stale，可选运行 `/ce-compound-refresh` |

---

## 问题

多数 teams 会把同一个问题解决两次，有时甚至是同一个人，因为第一次 solution 只存在于 conversation、chat history 或 teammate 的脑中。常见 failure shapes：

- **Solution lives in chat**：Slack thread、Linear comment、agent transcript；一周后就找不到
- **Documented but undiscoverable**：写进没人搜的 wiki，或 `docs/solutions/` 存在但 agents 不知道要查
- **Rewritten when re-encountered**：同一问题被写成略有不同的新 doc，随后两篇 docs 开始 drift
- **No anti-patterns captured**：调查中最昂贵的部分是 *didn't work*，也是最先消失的部分
- **Captured at session-end clutter, not session-end clarity**：doc 写得太晚，context 已经褪色

## 方案

`ce-compound` 在 context 最新鲜的时刻运行 structured capture flow：

- 两种 modes：**Full**（parallel subagents 负责 cross-referencing 和 duplicate detection）与 **Lightweight**（single-pass，更快、更省 tokens）
- Bug track 和 knowledge track 生成匹配 doc 类型的不同 section structures
- Overlap check 决定更新 existing doc，还是创建 duplicate
- Discoverability check 确保项目的 `AGENTS.md`/`CLAUDE.md` 暴露 `docs/solutions/`，让未来 agents 找得到
- Specialized agent reviews（kieran reviewer、code simplicity、performance/security/data integrity）可选择增强 doc

---

## 它的新意

### 1. 两种 modes：Full vs Lightweight，由 agent 自动选择

**Full mode** 并行运行三个 research subagents（Context Analyzer / Solution Extractor / Related Docs Finder），并自动执行 session-history probe，跨 Claude Code、Codex、Cursor 搜索 prior sessions 中的相关 context。它会 cross-reference existing docs、detect duplicates，并运行 specialized reviews。

**Lightweight mode** 以 single pass 完成同样的 documentation，不使用 subagents，也不做 cross-referencing。速度更快、消耗更少 tokens。

**Skill 会自行选择 mode，不会提问。** Full 是默认模式，因为与产生这条 learning 的工作相比，它增加的 token 成本很小；只有在 context 确实紧张（session 接近上限），或 fix 非常简单、cross-referencing 没有收益时，才会选择 Lightweight。这些条件 agent 能观察到，用户却看不到，因此提问只会让用户猜测。Skill 会在 output 第一行说明运行了哪个 mode 及原因；如果选择不符合你的偏好，重新运行的成本很低。

### 2. Bug track vs knowledge track：不同形状使用不同结构

Skill 根据 `problem_type` 把 work 分类到两个 tracks 之一：

- **Bug track**：Symptoms、What Didn't Work、Solution、Why This Works、Prevention。用于 build errors、test failures、runtime errors、performance issues、integration issues 等。
- **Knowledge track**：Context、Guidance、Why This Matters、When to Apply、Examples。用于 architecture patterns、design patterns、tooling decisions、conventions、workflow practices。

Track 决定 section order 和 frontmatter fields。把 bug-track fields 强加给 knowledge-track learning（或反过来）会生成结构上不适合内容的 docs。

### 3. Overlap detection：更新 existing docs，而不是制造 duplicates

Related Docs Finder 会按五个 dimensions 评估与 existing `docs/solutions/` content 的 overlap：problem statement、root cause、solution approach、referenced files、prevention rules。

- **High overlap**（4-5 个 dimensions 匹配）-> **更新 existing doc**，加入更新鲜 context。Existing path 保持不变；添加 `last_updated` field。描述同一问题的两篇 docs 必然 drift。
- **Moderate overlap**（2-3 个 dimensions 匹配）-> 创建 new doc，并标记需要 consolidation review（可能触发 `ce-compound-refresh`）。
- **Low or none** -> 正常创建 new doc。

### 4. Discoverability check：knowledge 能被找到才会 compound

每次运行都会检查 project instruction file（`AGENTS.md` 或 `CLAUDE.md`）是否会引导未来 agent 发现 `docs/solutions/`。如果不会，它提出最小补充，暴露 knowledge store，征得 consent 后应用。这个检查每次都跑，因为 knowledge store 只有在 findable 时才有 compound value。

Proposed addition 会匹配 existing file 的 tone 和 density：能塞进 existing directory listing 时就是单行；只有没有合适位置时才新增小 headed section。

### 5. Grounding validation：claims 在 compound 前对照 tree 验证

Solution doc 的价值取决于其 claims 是否真实，而基于 conversation evidence 起草容易引入三种失败形态：从 session-level summary 而不是 source 写出 code-behavior claims；宣称 "fixed in X"，但 current checkout 看不到该 merge；以及 drafting scaffold（"Learning 3"）泄漏进最终 doc。

Phase 2.45 用两层机制关闭这些缺口。Deterministic script（`scripts/validate-doc-claims.py`）检查 cited repo paths、commit SHAs（按 HEAD 与 upstream default branch 的 reachability 分类，从而区分 stale checkout 和 fabricated citation）、relative links 以及 dangling scaffold。其 flags 需要 adjudication，不会自动判定失败，因为 doc 可能合理地引用一个恰好被它记录的 fix 删除的 path。然后，read-only validator subagent（Full 和 headless modes）通过引用 defining source line 验证 code-behavior claims，通过 remote truth（`gh` 为 primary，local git 为 fallback）验证 merge-state claims，并检查 countable assertions 的 internal completeness。起草阶段同样适用这种 discipline：Solution Extractor 必须先读 defining line 再声明 behavior，并优先引用 PR numbers，而不是对 rebase 敏感的 SHAs。

### 6. 选择性 refresh trigger

捕获 new learning 后，`ce-compound` 会检查是否应以 narrow scope hint 调用 `/ce-compound-refresh`。它不会默认运行 refresh；只在 new learning 暗示某篇具体 older doc 可能 stale（contradicted、superseded，或所在 domain 刚 refactored）时触发。

### 7. Specialized post-review（专门后置 review）

根据 problem type，可选 skill-local prompt assets review 文档：performance issues 使用 `performance-oracle`，security 使用 `security-sentinel`，database 使用 `data-integrity-guardian`。Code-heavy docs 也可以对 drafted examples 和 explanatory claims 做 read-only simplification review；这不会 invoke `ce-simplify-code`，也不会 mutate product code。

### 8. Session history integration（自动 probe，不向用户提问）

当某个看似无关的 earlier session 实际包含相关问题解决经验时，搜索 prior sessions 才真正有价值；但 agent 和用户都无法事先知道是否存在，因此它不适合做成 yes/no prompt。Full mode 改用低成本的两阶段 probe：始终运行 discovery + metadata pass（与 research subagents 并行，几乎不增加 wall-clock），只有 candidate session 达到 relevance bar 时才升级到成本较高的 extraction + synthesis。通过条件是 current-branch match，或至少命中 2 个 topic keywords。命中后，findings 会折入 bug track 的 "What Didn't Work" 或 knowledge track 的 "Context"；未命中时记录 "no relevant prior sessions" 并继续。这个 gate 让 always-on probe 保持低成本。Lightweight 和 headless modes 会完全跳过它。

### 9. Auto-invoke triggers（自动调用触发条件）

"that worked"、"it's fixed"、"working now"、"problem solved" 等短语会 auto-invoke 此 skill，让 capture 发生在 context 最新鲜时。用户也可以用 `/ce-compound [context]` 立即捕获。

---

## 快速示例

你刚花 45 分钟 debug brief-generation flow 中的 N+1 query。你确认 fix 有效，然后说 "that worked, ship it."

`ce-compound` auto-invokes（或你显式调用）。因为剩余 context 充足，它会静默选择 Full mode，并在 output 顶部注明 "Ran Full mode."，不会弹出 prompt。

三个 subagents 并行分派：Context Analyzer 读取 conversation history，分类为 `performance_issue`（bug track），提出 filename 和 category。Solution Extractor 用 before/after code 组织 fix。Related Docs Finder grep `docs/solutions/` 中的相关 issues，报告与一篇不同 N+1 case 的旧 doc 有 moderate overlap。与此同时，session-history probe 扫描 recent sessions；没有 candidate 达到 relevance bar，因此它记录 "no relevant prior sessions"，不会支付 synthesis 成本。

Orchestrator 组装 doc，通过 YAML safety script 验证 frontmatter，并写入 `docs/solutions/performance-issues/n-plus-one-brief-generation.md`。接着运行 grounding validation：mechanical script 确认每个 cited path 和 SHA 都能 resolve，validator subagent 引用定义 ORM default batching behavior 的 source line，以验证 doc 中的对应 claim。Discoverability check 发现 `AGENTS.md` 未提到 `docs/solutions/`，提出给 existing directory listing 添加一行，并在你确认后应用。

Phase 3 分派 local `performance-oracle` prompt，并因为 doc 包含 code examples，对 drafted examples 和 approach 做 read-only simplification check。Phase 2.5 提示 refresh recommendation：旧 N+1 doc 可能值得 consolidation review。Skill 建议用 `/ce-compound-refresh n-plus-one` 作为 narrow scope hint，然后结束。

---

## 何时使用

在以下情况使用 `ce-compound`：

- 刚解决 non-trivial problem，context 仍新鲜
- 用户说 "that worked"、"it's fixed"、"working now"、"problem solved"
- 到了自然暂停点，想在 context 消退前捕获 learning
- 问题花了有意义的 investigation（不是 typo 或 one-line fix）

以下情况跳过 `ce-compound`：

- Problem 仍 in-progress，或 solution 未验证
- Fix 是 trivial typo 或 obvious error，没有 generalizable insight
- Work 纯 mechanical（formatting、dependency bumps）

---

## 作为 Workflow 的一部分使用

`ce-compound` 是多个 workflows 的 closing loop：

- **`/ce-debug` Phase 4**：successful fix 和 PR 后，如果 bug 可泛化（3+ recurrence、对 shared dependency 的 wrong assumption），可选提供 `ce-compound`
- **`/ce-work` Phase 4**：shipping 后，如果 work 产生 reusable pattern、convention 或 tooling decision，则提示 `ce-compound`
- **Stand-alone**：任何 non-trivial problem-solving session 后直接调用

Output 会反馈给 upstream skills：

- `/ce-plan` 在 Phase 1 research 中通过 `learnings-researcher` 读取 `docs/solutions/`
- `/ce-ideate` 在 comprehensive grounding step 中读取它
- `/ce-debug` 在拉取 issue tracker reference 时读取它作为 prior context

当 new learning 暗示 older doc 可能 stale 时，`ce-compound` 会推荐带 narrow scope hint 的 `/ce-compound-refresh`。

---

## 单独使用

此 skill 自成完整 cycle：

- **Just-finished problem**：`/ce-compound`（或从 "that worked" auto-invoked）
- **With context hint（带 context hint）**：`/ce-compound "the email digest race condition we fixed"`
- **Long session 中用 Lightweight**：context 紧张时，skill 会自行选择 lightweight mode，并在 output 中说明

Auto-invoke triggers 会在对话中触发；如果你刚确认某件事 works，不需要记住 slash command。

---

## 输出产物

```text
docs/solutions/[category]/[filename].md
```

Categories 会 auto-detect。Bug-track examples：`build-errors/`、`test-failures/`、`runtime-errors/`、`performance-issues/`、`database-issues/`、`security-issues/`、`ui-bugs/`、`integration-issues/`、`logic-errors/`。Knowledge-track examples：`architecture-patterns/`、`design-patterns/`、`tooling-decisions/`、`conventions/`、`workflow-issues/`、`developer-experience/`、`documentation-gaps/`、`best-practices/`。

Doc 带 YAML frontmatter（`module`、`tags`、`problem_type` 等）以便 search。Validation 通过 `scripts/validate-frontmatter.py` 运行，用于捕获 silent corruption（malformed `---` delimiters、scalar values 中未 quote 的 `:`）；`scripts/validate-doc-claims.py` 则对照 tree 检查 body 中的 cited paths、SHAs、links 和 drafting scaffold。

如果 discoverability check 发现 knowledge store 未暴露，skill 也可能对 `AGENTS.md`/`CLAUDE.md` 做小编辑。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 使用 conversation context 记录最近 fix |
| `<brief context>` | 例如 "the email digest race condition we fixed"；聚焦 capture |

Auto-invoke triggers：conversation 中出现 "that worked"、"it's fixed"、"working now"、"problem solved" 等短语。

---

## 常见问题

**为什么有两种 modes，而且不让我选择？**
Full mode 适用于大多数情况：parallel subagents 能捕获 duplicates、找到 related docs 并运行 specialized reviews。Lightweight mode 用于 simple fixes 或 context 紧张的 sessions，此时深度 cross-referencing 不值得 token 成本。Skill 会自行选择，而不是弹出 prompt，因为决定因素是剩余 context budget，这项信息 agent 能看到、用户看不到；提问只会让用户猜测。它会在 output 中报告选择，如果判断不符合你的偏好，重新运行的成本很低。

**Bug track 和 knowledge track 有什么区别？**
Bug track 捕获 incident-level fixes："X broke, here's why and how we fixed it." Knowledge track 捕获 durable guidance："this is how we do X here, and why." 两者 audience 和 structure 不同：bug track 有 Symptoms / What Didn't Work / Solution；knowledge track 有 Context / Guidance / When to Apply。

**为什么 auto-update docs，而不是总是创建新的？**
描述同一问题的两篇 docs 必然 drift。新 context 更新鲜、更可信，所以 skill 会把它折入 existing doc。结果是一篇随时间改进的 canonical doc，而不是一堆部分重叠、之后还要 consolidation 的 docs。

**它适用于非软件场景吗？**
Knowledge track 可以泛化（conventions、decisions、workflow practices），但 skill 假设存在 code repo、`docs/solutions/` directory 和 YAML-frontmatter conventions。它主要是 software-team tool。

**如果我不想改 AGENTS.md 的 discoverability 怎么办？**
Skill 会在应用编辑前征求 consent。你可以拒绝；doc 仍会写入。如果 AGENTS.md 已经提到 `docs/solutions/`，这个 prompt 不会触发。

---

## 另见

- [`ce-compound-refresh`](./ce-compound-refresh.md) - 随 codebase 演进维护 `docs/solutions/`
- [`ce-debug`](./ce-debug.md) - fix 验证后常见的 upstream caller
- [`ce-work`](./ce-work.md) - shipping 后常见的 upstream caller
- [`ce-plan`](./ce-plan.md) - planning 时读取 `docs/solutions/` 作为 institutional memory
- [`ce-ideate`](./ce-ideate.md) - grounding 时读取 `docs/solutions/`
