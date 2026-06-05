# `ce-code-review`

> 使用 tiered persona agents、confidence-gated findings 和 merge/dedup pipeline 做 structured code review。

`ce-code-review` 是 **deep code review** skill。它分析 diff（PR、branch 或 current changes），根据实际 touched 内容选择合适的 reviewer personas，并行分派它们，然后把 findings merge 和 deduplicate 成单一 report。每个 finding 都带 severity（P0-P3）、autofix class（`gated_auto`、`manual`、`advisory`，表示 follow-up shape）和 owner。Interactive mode 中，review 会自行应用 safe、verified fixes，并在 working tree clean 时 commit（绝不 push）；`mode:agent` 中只 report，由 caller 应用。

Compound-engineering ideation chain 是 `/ce-ideate -> /ce-brainstorm -> /ce-plan -> /ce-work`。`ce-code-review` 是 `/ce-work` 的 **Tier 2 escalation** target：当 sensitive surfaces、large diffs 或明确 deep-review requests 出现时自动调用；也可以在任何时候直接调用，用于 current branch 或 specific PR 的 structured review。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 根据 diff content 选择 reviewer personas，并行分派，把 findings merge 成带 confidence gating 和 auto-fix routing 的单一 report |
| 何时使用？ | Sensitive/large work 打开 PR 前；明确请求 deep review；harness 没有内置 `/review` |
| 产出什么？ | Structured findings report；interactive mode 还会应用 safe、verified fixes（Applied section），当 tree clean 时作为 `fix(review):` commit，dirty 时留给你的 commit；绝不 push |
| 模式 | Interactive（default，应用 safe fixes）和 `mode:agent`（JSON；report-only，caller applies） |

---

## 问题

Generalist code review prompts 常以可预测方式塌缩：

- **Surface-level findings**："consider adding tests"，但不说测什么
- **Wrong findings for the diff**：doc-only change 上给 security feedback，typo fix 上给 performance feedback
- **No severity calibration**：每个 finding 都像 critical，淹没真正的 P0s
- **No confidence calibration**：speculative "could be a bug" 与 verified defects 被同等呈现
- **One pass at one model's reasoning**：单个 reviewer 偏向最近训练最多的方向
- **No structured follow-through**：findings 留在 chat 里；没有 record、fix queue 或 residual handling
- **Mutating actions on the wrong checkout**：在 shared checkout 上跑 review，同时另一个 agent 并行跑 tests，结果 undefined

## 解决方案

`ce-code-review` 把 review 作为带 explicit gates 的 structured pipeline：

- **Diff-aware persona selection**：4 个 always-on reviewers + 2 个 CE always-on agents，再加上根据实际 touched 内容选择的 cross-cutting 和 stack-specific personas
- **Parallel persona dispatch**：每个 reviewer 聚焦自己的 lens；结果并行返回
- **Confidence-gated synthesis**：findings merge、dedupe，因 cross-persona agreement promote，并按 autofix class route
- **Severity scale（P0-P3）+ autofix class**：分离 urgency 和 action ownership
- **Two modes**：Interactive（default；自行应用 safe verified fixes）和 `mode:agent`（JSON machine handoff；report-only，由 caller apply）
- **Caller-owned apply + Residual Work Gate**：`mode:agent` 中 caller（例如 `/ce-work`）应用 fixes 并运行 Residual Work Gate（accept / file tickets / continue / stop）；interactive mode 在 clean tree 上 commit applied fixes，且永不 push
- **Quick-review short-circuit**：light passes 交给 harness-native `/review`；只有必要时才跑 multi-agent

---

## 新颖之处

### 1. Diff-aware persona selection（diff 感知的 persona selection）

小 config change 触发 6 个 reviewers（4 always-on + 2 CE always-on）。带 migrations 的 Rails auth feature 可能触发 10 个。Skill 会判断哪些 personas 适合 diff：

- **Always-on（每次 review）**：`ce-correctness-reviewer`、`ce-testing-reviewer`、`ce-maintainability-reviewer`、`ce-project-standards-reviewer`、`ce-agent-native-reviewer`、`ce-learnings-researcher`
- **Cross-cutting conditional**：security、performance、API contract、data migrations、reliability、adversarial、previous-comments；只在 diff 触及对应 concern 时选择
- **Stack-specific conditional**：Julik frontend races、Swift/iOS；只在 matching runtime domain 被触及时选择。Structural quality（complexity deletion、1k-line regressions、spaghetti）属于 always-on maintainability persona
- **CE conditional（migrations）**：risky migration diffs 触发 `ce-deployment-verification-agent`；schema drift 和 migration safety 由 `data-migration` persona 处理

Persona selection 是 agent judgment，不是 keyword matching。Instruction-prose files（Markdown skills、JSON schemas）是 product code，但会跳过 runtime-focused reviewers（adversarial、races），因为它们不适用。

### 2. Severity（P0-P3）和 autofix class 是 orthogonal

Severity 回答 **urgency**（P0=critical breakage，P3=user discretion）。Autofix class 是关于 follow-up shape 的 **signal**（不是 apply permission）：

- `gated_auto` -> 存在 concrete `suggested_fix`，是明确 apply candidate
- `manual` -> 需要 design input 或 handoff 的 actionable work
- `advisory` -> report-only output（learnings、rollout notes、residual risk）

Synthesis 拥有 final route。Persona 提供的 routing metadata 是 input，不是最后决定；disagreements 默认走更 conservative route。Finding 是否实际应用是 judgment call（interactive review 的 Stage 5c，或 `mode:agent` 中的 caller），不是 class 的函数。

### 3. Two modes：human view 和 machine handoff

| Mode | When | Behavior |
|------|------|----------|
| **Interactive** _(default)_ | Direct user invocation | Markdown report；review 自行应用 safe、verified fixes（Stage 5c -> Applied section），对不同意的 findings push back，并在 tree clean 时 commit 为 isolated `fix(review):` commit（dirty 时留给你的 commit）。绝不 push |
| **`mode:agent`** | `mode:agent`（alias `mode:headless`） | 一个 JSON object；report-only：review 不 mutate，caller（例如 `/ce-work`）应用 findings 并拥有 Residual Work Gate |

Skill 永不 switch branches：PR/branch argument 选择 review *scope*（无需 checkout 的 diff），不是 mutation permission。Interactive apply 只在当前 checkout 原地编辑；要 review current checkout against another ref，请传 `base:<ref>`。

### 4. Quick-review short-circuit（quick review 短路）

当用户请求 "quick"、"fast" 或 "light" review 时，skill 会交给 harness-native code review（例如 Claude Code 中的 `/review`），而不是分派 multi-agent pipeline。这尊重 intent：有时正确工具就是更轻的那个。Programmatic callers（`mode:agent`）绕过 short-circuit，总是跑 full pipeline。

### 5. Synthesis pipeline（综合管线）：merge、dedupe、promote、route

所有 dispatched personas 返回后，synthesis 会：

- Validate 每个 finding against schema
- Anchor 到 actual diff（丢弃关于不存在或 scope 外 lines 的 findings）
- 跨 personas deduplicate（多个 reviewers 发现同一问题）
- **基于 cross-persona agreement promote confidence**（两个 reviewers 发现同一 issue 会提高 priority）
- Resolve contradictions（不同 personas 对做法意见不一）
- 按 tier route：applied fixes、gated/manual、FYI

Output 是带 calibrated severity、evidence quotes 和 explicit ownership 的单一 report，而不是所有 reviewer raw output 的 flat list。

### 6. 用于 requirements verification 的 plan discovery

当 diff 有 associated plan（`docs/plans/*.md`）时，skill 会发现它（通过 `plan:` argument、PR body link 或从 branch name auto-discovery），并读取其 Requirements section + Implementation Units。Synthesis 随后验证 diff 是否真的满足这些 requirements，捕捉 code 看起来没问题但不符合 plan 的情况。

### 7. Residual Work Gate（残余工作 gate）

当 autofix mode 运行、in-skill fixer 无法解决全部问题时，residual work 不会消失在 chat 里。Residual Actionable Work summary 列出每个 unresolved finding，带 stable numbering、severity、file:line、title 和 autofix class。Callers（例如 `/ce-work` Phase 3.4）读取此 summary，并向用户提供 options：apply now、file tickets、accept with durable sink，或 stop。

### 8. Protected artifacts（受保护 artifacts）

Compound-engineering pipeline artifacts（`docs/brainstorms/*`、`docs/plans/*.md`、`docs/solutions/*.md`）受保护；reviewers 提出的 delete 或 gitignore 它们的 findings 会在 synthesis 中被丢弃。这些是 pipeline 依赖的 decision artifacts；reviewers 不应 garbage-collect 它们。

---

## 快速示例

你在包含 database migration 的 Rails auth change feature branch 上调用 `/ce-code-review`。

Skill 检测到你在 feature branch（还没有 PR），从 `origin/HEAD` resolve base（或在有 open PR 时读 PR metadata），并计算 diff。Stage 2 读取 commit messages，写出 2-3 行 intent summary。Stage 2b 从 branch name auto-discover `docs/plans/` 中的 plan，并读取 Requirements（R1-R8、U1-U6）。

Stage 3 选择 reviewers：6 个 always-on，加上 security（auth touched）、reliability（token cleanup 的 background job）、data-migration（存在 migration file），以及 migration risky 时的 deployment-verification agent。总共七八个 reviewers，并行分派。

全部返回后，synthesis 把 23 个 raw findings merge 为 14 个 distinct findings。三个是 clean、reversible fixes（typo、rename、dead-code removal），review 自行应用并验证（Stage 5c -> Applied section）。六个是 auth surface 上的 `gated_auto`：concrete candidates，review 会应用它们，并明显标记为 green-but-unverifiable（auth），供你 review。两个是 `manual`（deployment Go/No-Go checklist items）。三个是 `advisory`（FYI notes）。每个 finding 都有 anchored evidence 和 stable number。

你逐个查看 6 个 gated findings，应用 4 个，将 1 个 defer 到 tracker follow-up，并用 cited harm 拒绝 1 个。Final validation 运行；report 保存。

---

## 何时使用

在以下情况使用 `ce-code-review`：

- 准备为 sensitive 或 large work 打开 PR（auth、payments、migrations、public APIs）
- Harness 缺少内置 `/review`，但仍想要真实 review
- 想要 structured residual work handling，而不是 findings 倒在 chat 里
- 明确想要 deeper、multi-persona pass（例如 "review this thoroughly"）
- 另一个 skill 正在升级到它（`/ce-work` Phase 3.3 Tier 2、`/ce-optimize` Phase 4.3）

以下情况跳过 `ce-code-review`：

- 想要 quick light review：harness 的内置 `/review` 是正确工具；short-circuit 会处理
- Change trivial（typo、formatting、dependency bump）：Tier 1 review 足够
- 想修复发现的 bugs，而不是 review code -> 使用 `/ce-debug`

---

## 作为工作流的一部分使用

`ce-code-review` 被多个 skills 作为 deep-review path 调用：

- **`/ce-work` Phase 3.3**：对 sensitive surfaces、>=400 lines + diffuse、>=1,000 lines 或明确 thorough-review requests，升级到 `ce-code-review mode:agent`；随后 ce-work 应用 findings
- **`/ce-work` Phase 3.4 Residual Work Gate**：读取 `ce-code-review` 返回的 Residual Actionable Work summary，并展示 user options
- **`/ce-optimize` Phase 4.3**：merge 前对 cumulative optimization branch diff 运行
- **`/ce-doc-review`**：docs（requirements、plans）的 sibling skill，不是 code

Tier 1（harness-native `/review`）处理大多数情况；`ce-code-review` 是 Tier 2 escalation。

---

## 单独使用

Skill 可从任何 starting state 直接运行：

- **Current branch（当前 branch）**：`/ce-code-review`
- **Specific PR**：`/ce-code-review 1234` 或 `/ce-code-review <PR URL>`
- **Specific branch（指定 branch）**：`/ce-code-review feat/notification-mute`
- **With base ref**：`/ce-code-review base:abc1234` 或 `base:origin/main`（跳过 scope detection；against 该 ref review）
- **With plan**：`/ce-code-review plan:docs/plans/.../plan.md`，用于 explicit requirements verification

Concurrent use note：`mode:agent` 是 report-only，绝不 mutate，因此可以与同一 checkout 上的 browser tests 并行。Interactive mode 可能向 working tree 应用 fixes，因此避免在另一个 agent 正活跃使用的 checkout 上运行。

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | Review current branch（从 `origin/HEAD` 或 PR metadata 检测 base） |
| `<PR number or URL>` | Review that PR without checking it out（读取 metadata + remote diff） |
| `<branch name>` | Review that branch without checking it out（remote/local ref diff） |
| `base:<sha-or-ref>` | 跳过 scope detection；review current checkout against that ref |
| `plan:<path>` | 加载 plan 进行 requirements verification |
| `mode:agent` | JSON machine handoff；report-only（caller applies）。`mode:headless` 是 deprecated alias；`mode:report-only` 被忽略 |

Conflicting mode flags 会以 error 停止。`base:` 与 PR/branch target 组合也会 error；二选一。

---

## 常见问题（FAQ）

**为什么不直接用 harness 的内置 `/review`？**
该用时就用它；quick-review short-circuit 会明确 defer。`ce-code-review` 用于你需要 diff-aware persona selection、calibrated severity 的 structured findings、autofix routing 和 residual work handling 的情况。它是更重的工具；当 work 值得时使用。

**它怎么决定 dispatch 哪些 personas？**
基于 actual diff 的 agent judgment，不是 keyword matching。4 always-on + 2 CE always-on personas 每次 review 都跑。Cross-cutting 和 stack-specific personas 在对应 concern 被触及时添加（例如 auth files changed 时添加 security；存在 migration 或 schema dump files 时添加 `ce-data-migration-reviewer`）。Instruction-prose files 会跳过 runtime-focused reviewers（adversarial、races）。

**Interactive（default）和 `mode:agent` 有什么区别？**
Interactive 是 human-facing mode：markdown report；review 自行应用 safe、verified fixes（Applied section），tree clean 时 commit（dirty 时留给你的 commit）；绝不 push。`mode:agent` 是 machine handoff：一个 JSON object，report-only；review 不 mutate，caller（例如 `/ce-work`）按自己的规则应用 findings。`mode:headless` 是 `mode:agent` 的 deprecated alias。

**什么是 Residual Work Gate？**
Caller-owned step（不是 review skill 的一部分）：在 `mode:agent` 中，caller（通常 `/ce-work`）应用能应用的内容，然后展示未应用 findings 并询问用户：apply now、file tickets、accept with durable sink，或 stop。"Accept" 需要真实 durable record（PR description 中的 Known Residuals，或 `docs/residual-review-findings/<sha>.md`）；findings 不能消失在 chat 里。

**为什么它从不 switch checkout？**
Skill 永不运行 `git checkout`/`switch`：传 PR/branch 选择 review *scope*，不是 mutate tree 的 permission（它会在不 checkout 的情况下 diff remote/local refs）。Interactive mode 可能 *apply* fixes 到 current checkout（可逆编辑），但永不 switch branches。要 review current checkout against different ref，请传 `base:<ref>`。

**能和 browser tests 并发运行吗？**
`mode:agent` 是 report-only，绝不 mutate，因此可以与 concurrent tests 并行。Interactive mode 可能向 working tree 应用 fixes，所以避免在另一个 agent 正活跃使用的 checkout 上运行。

**支持 non-software work 吗？**
不支持。此 skill 与 git、code reviewers 和 PR contexts 紧密耦合。Docs（requirements、plans）请使用 `/ce-doc-review`。

---

## 另见（See Also）

- [`ce-work`](./ce-work.md) - primary upstream caller；Phase 3.3 升级到 `ce-code-review`
- [`ce-doc-review`](./ce-doc-review.md) - documents（requirements、plans）的 sibling skill，不是 code
- [`ce-debug`](./ce-debug.md) - 当 root-cause investigation 重要时，用于修复 review 中发现的 bugs
- [`ce-resolve-pr-feedback`](./ce-resolve-pr-feedback.md) - PR 打开后处理 incoming reviewer comments
- [`ce-simplify-code`](./ce-simplify-code.md) - `ce-work` 在 review 前调用；是 complement，不是 substitute
