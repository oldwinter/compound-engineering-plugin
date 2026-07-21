# `ce-code-review`

> 使用 tiered persona agents、confidence-gated findings 和 merge/dedup pipeline 做 structured code review。

`ce-code-review` 是 **deep code review** skill。它分析 diff（PR、branch 或 current changes），根据实际 touched 内容选择合适的 reviewer personas，并行分派它们，然后把 findings merge 和 deduplicate 成单一 report。每个 finding 都带 severity（P0-P3）、autofix class（`gated_auto`、`manual`、`advisory`，表示 follow-up shape）和 owner。Review 默认是 report-only。本地修复需要 `apply:local`，或用户明确要求应用该 review 的 findings；`mode:agent` 始终只 report，由 caller 应用。

Compound-engineering ideation chain 是 `/ce-ideate -> /ce-brainstorm -> /ce-plan -> /ce-work`。`ce-code-review` 是 `/ce-work` 的 **Tier 2 escalation** target：当 sensitive surfaces、large diffs 或明确 deep-review requests 出现时自动调用；也可以在任何时候直接调用，用于 current branch 或 specific PR 的 structured review。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 根据 diff content 选择 reviewer personas，并行分派，把 findings merge 成带 confidence gating 和 auto-fix routing 的单一 report |
| 何时使用？ | Sensitive/large work 打开 PR 前；明确请求 deep review；harness 没有内置 `/review` |
| 产出什么？ | Structured findings report；获得显式 local-apply authority 后，也可应用 verified fixes 并增加 Applied section（绝不 push） |
| 模式 | 默认 Markdown report 和 `mode:agent` JSON handoff；二者默认都是 report-only，local apply 需要单独授权 |

---

## 调用示例

```text
# 深度 review 当前 branch；相关 plan 和 session context 会自动发现
/ce-code-review

# Review 指定 PR，但不 checkout
/ce-code-review https://github.com/acme/widgets/pull/1234

# Review 当前 branch，并在此 checkout 中修复已验证 findings
/ce-code-review review this branch and fix eligible findings locally

# 完整 multi-agent review 没有必要时，要求更轻量的检查
/ce-code-review give this branch a quick review
```

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

- **Diff-aware persona selection**：correctness + project-standards 构成 core；其他 reviewers 只在实际 touched surface 触发时加入
- **Parallel persona dispatch**：每个 reviewer 聚焦自己的 lens；结果并行返回
- **Bounded dispatch with backpressure**：识别并尊重当前 harness 的 active-subagent limit，把其余 reviewers 排队，并把 capacity errors 作为可重试 backpressure，而不是 review failure
- **Confidence-gated synthesis**：findings merge、dedupe，因 cross-persona agreement promote，并按 autofix class route
- **Severity scale（P0-P3）+ autofix class**：分离 urgency 和 action ownership
- **Presentation 与 authority 分离**：默认 markdown 和 `mode:agent` JSON 都是 report-only；`apply:local` 或显式 apply request 才授予 local mutation authority
- **Caller-owned apply + Residual Work Gate**：`mode:agent` 中 caller（例如 `/ce-work`）应用 fixes 并运行 Residual Work Gate（accept / file tickets / continue / stop）
- **Quick-review short-circuit**：light passes 交给 harness-native `/review`；只有必要时才跑 multi-agent

---

## 新颖之处

### 1. Diff-aware persona selection（diff 感知的 persona selection）

小型 low-risk change 只运行 two-person core；带 migrations 的 Rails auth feature 会加入相应 domain lenses。Skill 会判断哪些 personas 适合 diff：

- **Core（每次 multi-agent review）**：`correctness-reviewer`、`project-standards-reviewer`
- **Generic conditional**：testing for changed tests/harnesses or meaningful runtime behavior with no corresponding test work（tests/harnesses 发生变化，或 meaningful runtime behavior 变化却没有相应 test work 时选择 testing）；large/structural work 选择 maintainability；agent-facing surfaces 选择 agent-native；只有 existing `docs/solutions/` corpus 存在 plausible matches 时才选择 learnings
- **Cross-cutting conditional**：security、performance、API contract、data migrations、reliability、adversarial、previous-comments；只在 diff 触及对应 concern 时选择
- **Stack-specific conditional**：Julik frontend races、Swift/iOS；只在 matching runtime domain 被触及时选择。Structural quality（complexity deletion、1k-line regressions、spaghetti）属于 conditional maintainability persona
- **CE conditional（migrations）**：risky migration diffs 触发 `deployment-verification-agent`；schema drift 和 migration safety 由 `data-migration` persona 处理

Persona selection 是 agent judgment，不是 keyword matching。Production-file presence alone and non-behavioral edits do not select testing（仅存在 production files 或 non-behavioral edits 不会触发 testing）。Instruction-prose files（Markdown skills、JSON schemas）是 product code，但会跳过 runtime-focused reviewers（adversarial、races），因为它们不适用。例外是 **silent-pass verification mechanism**（CI/CD gate、build/deploy step、coverage/lint gate，或可能掩盖 production 问题的 test harness/mock）：即使只是小型 config diff，也会获得 adversarial + cross-model lens，因为它的风险在于 fidelity，即真实结果为红时却显示为绿，而不是 blast radius。

### 1b. Cross-model adversarial pass

选中 adversarial 且 working tree 就是被 review 的 head（`local-aligned` / standalone）时，同一份 adversarial brief 还会在独立的 read-only process 中交给 **一个不同于 host 的 model provider**。In-process `adversarial` persona 与 peer（`adversarial-<provider>`）达成一致，是 synthesis 中最强的 promotion signal。

**由哪个 target 运行 peer** 会自动选择，也允许 override；它与 `ce-doc-review` 使用同一 independence system，但只覆盖 adversarial lens。Host harness 与 serving family 分开跟踪。优先级是 conversation -> `cross_model_peer:` -> active project instructions -> `codex -> claude -> grok -> composer`。显式 `Cursor` 表示由 `cursor-agent` 使用 configured default/Auto model；`Composer` 表示经 Cursor 使用 Composer model。Grok 优先使用 native CLI，也可以走 sanctioned Grok-via-Cursor route。除非 receipt 验证 Cursor Auto serving family 与 host 不同，否则不算 independent agreement。共享 local-config contract 参见[配置参考](./configuration.md)。

Skill 会先尝试声明的 mappings。如果 CLI 拒绝 obsolete 或 incompatible adapter default，skill 可以在同一 target/family 以及 hard read-only、host-exclusion、authority、egress boundaries 内发现最接近的 compatible equivalent。Substitution 和 actual route 必须披露；显式指定的 user model 或新增接收内容的 intermediary 绝不能静默变化，任何会改变 recipient 的 retry 都要返回 host 获得 sanction。该 pass 保持 detached、non-blocking，第二个 target 仍只在显式设置 `CROSS_MODEL_MAX_PEERS=2` 时启用。

它与 `ce-doc-review` 共享 provider/route kernel（CI 有 parity test），但保留 code review 的 product scope：只跑 adversarial、使用 diff/work-tree delivery，而不是 doc review 的 judgment trio 或 whole-doc sweep。

Large diff 仍使用同一 single-peer route，不会序列化成一个巨型 prompt。Orchestrator 发送 compact semantic review map，包括 intent、material risk divisions、generated-tree treatment 和 cross-division interactions；worker 将 exact diff 作为 private、selectively readable artifact 保留在 prompt 外。Deterministic code 不发明 risk groups，也不切割 semantic shards；adversarial agent 在 orchestrator divisions 内工作，必要时再次收窄 reads。

### 2. Severity（P0-P3）和 autofix class 是 orthogonal

Severity 回答 **urgency**（P0=critical breakage，P3=user discretion）。Autofix class 是关于 follow-up shape 的 **signal**（不是 apply permission）：

- `gated_auto` -> 存在 concrete `suggested_fix`，是明确 apply candidate
- `manual` -> 需要 design input 或 handoff 的 actionable work
- `advisory` -> report-only output（learnings、rollout notes、residual risk）

Synthesis 拥有 final route。Persona 提供的 routing metadata 是 input，不是最后决定；disagreements 默认走更 conservative route。Finding 是否实际应用，要在 apply authority 存在后由 judgment 决定，不是 class 的函数。

### 3. Presentation 与 apply authority 分离

| Mode | When | Behavior |
|------|------|----------|
| **Default markdown** | Direct user invocation | Report-only markdown，包含 stable findings 和 actionable summary |
| **`mode:agent`** | `mode:agent`（alias `mode:headless`） | 一个 JSON object；report-only：review 不 mutate，caller（例如 `/ce-work`）应用 findings 并拥有 Residual Work Gate |
| **Explicit local apply** | 添加 `apply:local`，或显式要求 review 应用/修复 findings | 保持 markdown presentation；Stage 5c 可以应用 verified fixes，并在 pre-review tree clean 时 commit。绝不 push |

Skill 永不 switch branches：PR/branch argument 选择 review *scope*（无需 checkout 的 diff），不是 mutation permission。Explicit local apply 只在当前 checkout 原地编辑；要 review current checkout against another ref，请传 `base:<ref>`。

### 4. Quick-review short-circuit（quick review 短路）

当用户请求 "quick"、"fast" 或 "light" review 时，skill 会交给 harness-native code review（例如 Claude Code 中的 `/review`），而不是分派 multi-agent pipeline。这尊重 intent：有时正确工具就是更轻的那个。Programmatic callers（`mode:agent`）绕过 short-circuit，总是跑 full pipeline。

### 5. Synthesis pipeline（综合管线）：merge、dedupe、promote、route

所有 dispatched personas 返回后，synthesis 会：

- Validate 每个 finding against schema
- Anchor 到 actual diff（丢弃关于不存在或 scope 外 lines 的 findings）
- 跨 personas deduplicate（多个 reviewers 发现同一问题）
- **基于 cross-persona agreement promote confidence**（两个 reviewers 发现同一 issue 会提高 priority）
- Resolve contradictions（不同 personas 对做法意见不一）
- 按 tier route：gated/manual 与 report-only；显式授权 local apply 时还可应用 verified findings

Output 是带 calibrated severity、evidence quotes 和 explicit ownership 的单一 report，而不是所有 reviewer raw output 的 flat list。当 finding 的判断依赖 line history（pre-existing vs this-diff、intentional design，或需要 authorship/age 支撑的 high-severity confidence）时，evidence 应包含一行简洁的 git provenance（short hash、author、subject/date）；绝不倾倒 full-file blame，也不要在 diff 本身已经足以证明 finding 时添加。

Synthesis 还会构建 **thematic triage groups**（默认 `grouping:auto`）：当 findings 跨越不同 concerns 时，相关 findings 会归入一个短 theme，例如 shared root cause、overlapping fix path，或一个 design decision 可解决多个 findings。这样 20 个 findings 的 review 会读起来像少数几个 themes，而不是 20 个彼此独立的 items。Groups 是 triage lens，不是 restructure：findings 保留 stable `#` 和 severity tables，groups 引用它们（`#2, #3`），`mode:agent` JSON 也会在 `triage_groups` field 中携带同样的 groups。它是覆盖所有 findings 的 lens，不是 apply queue，因此 caller 只有在把每个 group 过滤到 actionable subset 之后，才按 theme batch。传 `grouping:off` 可得到 flat report，传 `grouping:always` 可让小 review 也分组。

### 6. 用于 requirements verification 的 plan discovery

当 diff 有 associated plan（`docs/plans/*.md`）时，skill 会发现它（通过 `plan:` argument、PR body link 或从 branch name auto-discovery），并读取其 Requirements section + Implementation Units。Synthesis 随后验证 diff 是否真的满足这些 requirements，捕捉 code 看起来没问题但不符合 plan 的情况。

### 7. Residual Work Gate（残余工作 gate）

Actionable work 不会消失在 chat 里。Residual Actionable Work summary 列出每个 unresolved finding，带 stable numbering、severity、file:line、title 和 autofix class。Callers（例如 `/ce-work` Phase 3.4）在自己的 apply pass 后读取此 summary，并向用户提供 options：apply now、file tickets、accept with durable sink，或 stop。Bare review 也会报告同一 actionable set，但不应用。

### 8. Protected artifacts（受保护 artifacts）

Compound-engineering pipeline artifacts（`docs/brainstorms/*`、`docs/plans/*.md`、`docs/solutions/*.md`）受保护；reviewers 提出的 delete 或 gitignore 它们的 findings 会在 synthesis 中被丢弃。这些是 pipeline 依赖的 decision artifacts；reviewers 不应 garbage-collect 它们。

### 9. Settled-decision triage：区分偏好与缺陷

当发现的 plan 带有 `session-settled:` KTD 时，synthesis 会把仅仅偏好另一种 approach 的 finding 放进 report-only queue，并打上指明对应 KTD 的 `settled_conflict` stamp；显式授权 local apply 时也一样。因此用户已经作出的 decision 不会因为 reviewer 的个人偏好而在 gate 中被丢弃。Settled approach 内的真实 defect 仍保留完整 severity；如果 evidence 表明某个 settled decision 根本不可行，则会被显著展示，以便上游 pipeline gate 据此停止。Reviewers 本身看不到这些 annotations：reviewer bundles、intent summary 以及 cross-model adversarial pass 都会排除它们；orchestrator 在 review 后统一 triage，避免任何 lens 因为知道某个选择已获认可而产生锚定偏差。

---

## 快速示例

你在包含 database migration 的 Rails auth change feature branch 上调用 `/ce-code-review`。

Skill 检测到你在 feature branch（还没有 PR），从 `origin/HEAD` resolve base（或在有 open PR 时读 PR metadata），并计算 diff。Stage 2 读取 commit messages，写出 2-3 行 intent summary。Stage 2b 从 branch name auto-discover `docs/plans/` 中的 plan，并读取 Requirements（R1-R8、U1-U6）。

Stage 3 选择 correctness 和 project-standards core；若 migration 改变 tests/harnesses，或 meaningful runtime behavior 变化却没有相应 test work，则加入 testing；另外加入 security（auth touched）、reliability（token cleanup 的 background job）、data-migration（存在 migration file），以及 migration risky 时的 deployment-verification。只分派实际适用的 reviewers。

全部返回后，synthesis 把 raw findings merge 为更小的 distinct set。若干项是 caller 可处理的 `gated_auto` candidates，两个是 `manual` deployment decisions，其余是 advisory。每个 finding 都有 anchored evidence 和 stable number。因为这是 bare invocation，review 只报告，不修改 checkout。

你可以自行应用选定 findings，把 JSON report 交给 `/ce-work`，或用 explicit local-apply authority 重新运行。Pipeline callers 会应用能处理的内容，并通过 Residual Work Gate 路由未解决工作。

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

- **Current branch（report-only）**：`/ce-code-review`
- **Current branch 并应用 verified findings**：`/ce-code-review apply:local`
- **Specific PR**：`/ce-code-review 1234` 或 `/ce-code-review <PR URL>`
- **Specific branch（指定 branch）**：`/ce-code-review feat/notification-mute`
- **With base ref**：`/ce-code-review base:abc1234` 或 `base:origin/main`（跳过 scope detection；against 该 ref review）
- **With plan**：`/ce-code-review plan:docs/plans/.../plan.md`，用于 explicit requirements verification

Concurrent use note：bare 和 `mode:agent` reviews 都是 report-only，可与同一 checkout 上的 browser tests 并行。不要在另一个 agent 正活跃使用的 checkout 上运行显式授权的 local-apply review。

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
| `apply:local` | 显式授权 verified local fixes；与 `mode:agent` 冲突 |
| `grouping:auto` / `grouping:off` / `grouping:always` | Thematic triage grouping of findings（默认 `auto`：当 findings 跨 distinct concerns 时分组）。这只是 presentation，不会改变 reviewer selection、merge logic 或 apply behavior |

Conflicting mode flags（或 conflicting grouping flags）会以 error 停止。`base:` 与 PR/branch target 组合也会 error；二选一。

---

## 常见问题（FAQ）

**为什么不直接用 harness 的内置 `/review`？**
该用时就用它；quick-review short-circuit 会明确 defer。`ce-code-review` 用于你需要 diff-aware persona selection、calibrated severity 的 structured findings、autofix routing 和 residual work handling 的情况。它是更重的工具；当 work 值得时使用。

**它怎么决定 dispatch 哪些 personas？**
基于 actual diff 的 agent judgment，不是 keyword matching。Correctness 和 project-standards 在每次 multi-agent review 中运行。Generic、cross-cutting 和 stack-specific personas 只在对应 concern 存在时加入，例如 tests/harnesses 变化或 meaningful runtime behavior 缺少相应 test work 时选择 testing，auth 选择 security，migration artifacts 选择 `data-migration-reviewer`。仅存在 production files 或 non-behavioral edits 不会触发 testing。Silent-pass verification mechanism（CI/CD gate、build/deploy step、coverage/lint gate、test harness/mock）无论 diff 多小，都会获得 adversarial + cross-model pass。

**Default、`mode:agent` 和 `apply:local` 有什么区别？**
Default 是 human-facing markdown report，并且 report-only。`mode:agent` 使用同一 review pipeline，但序列化为一个 JSON object 交给 caller；它始终 report-only。`apply:local` 是单独的 authority，允许 markdown run 在本地应用 verified findings。`mode:headless` 是 `mode:agent` 的 deprecated alias。

**什么是 Residual Work Gate？**
Caller-owned step（不是 review skill 的一部分）：在 `mode:agent` 中，caller（通常 `/ce-work`）应用能应用的内容，然后展示未应用 findings 并询问用户：apply now、file tickets、accept with durable sink，或 stop。"Accept" 需要真实 durable record（PR description 中的 Known Residuals，或 `docs/residual-review-findings/<sha>.md`）；findings 不能消失在 chat 里。

**它和 `ce-doc-review` 的 cross-model pass 有什么区别？**
两者使用相同的 independence *system*（host attestation、multi-provider selection、以 detached job 运行并用 bounded slices 轮询的 read-only peer CLI、requested-vs-served model receipts、按 `<lens>-<provider>` fold-in、agreement promotion），但 *lens policy* 不同：code review 只运行 **adversarial**；doc review 会运行 judgment trio 加 whole-doc sweep，因为 document judgment 分散在更多 lenses。Code-review peers 原地 review work tree/diff；doc review 会把 document 嵌入更隔离的 scratch。

**为什么它从不 switch checkout？**
Skill 永不运行 `git checkout`/`switch`：传 PR/branch 选择 review *scope*，不是 mutate tree 的 permission（它会在不 checkout 的情况下 diff remote/local refs）。Explicit local apply 可以编辑 current checkout，但永不 switch branches。要 review current checkout against different ref，请传 `base:<ref>`。

**能和 browser tests 并发运行吗？**
Bare 和 `mode:agent` reviews 都是 report-only，可与 concurrent tests 并行。显式授权的 local-apply run 可能 mutate working tree，因此不要在另一个 agent 正活跃使用的 checkout 上运行。

**支持 non-software work 吗？**
不支持。此 skill 与 git、code reviewers 和 PR contexts 紧密耦合。Docs（requirements、plans）请使用 `/ce-doc-review`。

---

## 另见（See Also）

- [`ce-work`](./ce-work.md) - primary upstream caller；Phase 3.3 升级到 `ce-code-review`
- [`ce-doc-review`](./ce-doc-review.md) - documents（requirements、plans）的 sibling skill，不是 code
- [`ce-debug`](./ce-debug.md) - 当 root-cause investigation 重要时，用于修复 review 中发现的 bugs
- [`ce-resolve-pr-feedback`](./ce-resolve-pr-feedback.md) - PR 打开后处理 incoming reviewer comments
- [`ce-simplify-code`](./ce-simplify-code.md) - `ce-work` 在 review 前调用；是 complement，不是 substitute
