# `ce-work`

> 按 plan 的 guardrails 执行，在代码面前判断 HOW，交付完整 feature，并 hand off 到干净的 PR。

`ce-work` 是 **execution** skill。它接收一个 plan（或在较小范围内接收 bare prompt），按 plan 的 guardrails 执行实现，持续运行 tests，在 scope 需要时把 subagents 分派到隔离 worktrees 中，运行 quality gates，并 hand off 到 commit + PR flow。它把 plan 视为 **decision artifact**：scope、decisions、units 和 tests 的权威来源；实际实现方式由它自己判断。**它就是 `ce-plan` 刻意不预写的 HOW phase。**

这是 compound-engineering ideation chain 的第四步，也是最后一步：

```text
/ce-ideate         /ce-brainstorm      /ce-plan             /ce-work
"What's worth      "What does this     "What's needed       "Build it."
 exploring?"        need to be?"        to accomplish
                                        this?"
```

`ce-work` 主要面向 software work：它 commit、运行 tests、打开 PR，并与 code review skills 集成。它也有一个 lightweight **non-code carve-out**：由 `ce-plan` approach-altitude flow 产出、并标记为 `execution: knowledge-work` 的 plan，会 route 到 knowledge-work path，读取 sources、synthesize 并产出 deliverable，跳过 code lifecycle。其他没有该 marker 的 non-software work 仍然通常在 `ce-plan` 结束，由人类执行。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 读取 plan（或 scope 一个 bare prompt），按 guardrails 执行，持续运行 tests，交付 reviewed PR |
| 何时使用 | 实现 `ce-plan` plan；小/中型 bare-prompt work；恢复 partly-shipped work |
| 产出什么 | Commits + PR（或 no-PR path 中只产生 commits） |
| 下一步 | Review PR；运行 `/ce-compound` 捕获 learnings |
| Distinguishing | Plan-aware idempotency、带 worktree isolation 的 subagent dispatch、带 residual gate 的 tiered review、PR 中的 operational validation |

---

## 问题

要求 agent "implement this plan" 常以可预测方式出错：

- **重新实现已经 shipped 的 work**：恢复 partly-finished branch 时尤其常见
- **把 plan 当脚本**：即使另一种形状更干净，也照着 literal file list 改
- **Tests 全部 mock**：只能证明孤立 logic，无法说明 layers 是否正确交互
- **半成品 features**：可见部分完成了，callbacks 未接线，edge cases 没碰
- **Parallel work 静默丢数据**：多个 agents 在 shared directory 写同一文件，只有最后一次写入保留
- **没有 quality gate**：diff 直接进 PR，没有 simplification pass、review 或 operational monitoring

## 方案

`ce-work` 把 execution 作为带 explicit gates 的 structured process：

- Plan 对 **WHAT** 权威；agent 面对代码判断 **HOW**
- 每个 task 前做 idempotency check；如果 verification 已满足，就 skip
- 按 scope 选择 dispatch（inline / serial subagents / isolated worktrees 中的 parallel subagents）
- 在任何 task 标记 done 前，进行 test discovery、integration coverage 和 system-wide test check
- 带 residual-work gate 的 tiered code review：accept、file、fix 或 stop，但绝不 silently ship
- 每个 PR 都带 operational validation plan：监控什么、什么触发 rollback

---

## 它的新意

### 1. Plan-aware execution：尊重 WHAT/HOW separation

`ce-work` 把 plan 当 decision artifact，而不是脚本。Scope、decisions、U-IDs、files、test scenarios 和 verification criteria 是权威；agent 自行判断实际实现。执行期间 plan body 保持 read-only；progress 存在 git commits 和 task tracker 中。

### 2. Idempotent re-execution（幂等重新执行）

每个 task 前，`ce-work` 检查该 unit 的 work 是否已经存在且符合 plan intent。如果 verification 已满足，就把 task 标为 complete 并继续。**不会 silent reimplementation。** 这在 context compaction 后恢复、接手他人 branch，或几周后回到 partly-shipped plan 时最重要。

### 3. Worktree-isolated parallelism：explicit conflicts，而不是 silent data loss

对于可并行的 independent units，当 harness 支持时，`ce-work` 默认使用 per-subagent worktree isolation：每个 subagent 在自己的 directory 中、自己的 branch 上工作。预测到的 overlap 会作为 merge conflicts 暴露，由 orchestrator 显式处理。隔离不可用时，subagents 禁止 staging 或 committing，由 orchestrator 串行 merge batch。无论哪种方式，**都不会 silent overwrites。**

### 4. 执行全程保持 U-ID anchoring

当 plan 定义 U-IDs 时，它们会作为 task prefixes、commit messages 和 final summary 的锚点继续传播。这在 *plan edits 之间* 也成立：一次 deepening pass 把 unit 拆分后，引用不会断，因为 U-IDs 稳定。存在 Brainstorm-origin IDs（R/A/F/AE）时也同样保留。

### 5. 标记 "done" 前的 test quality gates

Task 不是 code compiles 就算 done。任何 feature-bearing task 标记 complete 前，`ce-work` 会发现正在修改内容对应的 existing test files，检查 test scenarios 是否覆盖适用类别（happy path、edges、error paths、integration），并向外追踪两层 callbacks、middleware 和 observers，确认 change 可能影响的东西。Mocking everything 只能证明孤立 logic；integration coverage 才能证明 layers 真正协同。

### 6. 带 explicit residual handling 的 tiered code review

每个 change 都会被 review。默认使用 harness-native review（例如 Claude Code 中的 `/review`）：快，且对大多数 diffs 足够。只有出现真实 signal 才升级到 `ce-code-review`：sensitive surface、大且 diffuse 的 change，或明确请求。当 deeper review 暴露 autofix 未解决的 residuals 时，`ce-work` 不会 silent ship，而是给出四选一 gate（apply / file tickets / accept with durable sink / stop）。"Accept" 需要真实 durable record；findings 不能只存在 transient session 中。

### 7. 默认包含 operational validation

每个 PR description 都包含 `Post-Deploy Monitoring & Validation` section：log queries、要观察的 metrics、expected healthy signals、failure signals、rollback triggers。如果确实没有 production impact，该 section 仍然存在，并把它作为记录下来的 decision，而不是隐含假设。

### 8. 对 bare prompts 做 smart triage

不是每次 invocation 都有 plan。`ce-work` 接收 bare prompt，并按 complexity triage：trivial work（少量文件、无 behavior change）直接实现；small/medium work 构建 task list；large 或 sensitive work 建议先用 `/ce-brainstorm` 或 `/ce-plan`。这个 triage 让 `ce-work` 可以合理处理小工作，而不强制所有事情都走完整 chain。

---

## 快速示例

一个包含四个 implementation units 的 plan 到来。`ce-work` 读取它，识别某个 unit 上的 `Execution note: test-first`，并记录一个 deferred-implementation question。它用 U-ID prefixes 构建 task list，并确认当前 branch name 有意义。

Parallel Safety Check 发现四个 units 之间没有 file overlap，且 worktree isolation 可用，于是四个 subagents 并行分派，各自使用自己的 branch。它们完成后，orchestrator 按 dependency order merge；每次 merge 后 tests 都通过。Idempotency check 捕获到其中一个 unit 的 verification 已被先前 session 满足，于是直接标为 complete，不重新实现。

Diff 不在 sensitive surface 上，也不大且 diffuse，所以 harness-native review 处理它；两个 suggested findings 被 inline 修掉。Final validation 通过；operational validation plan 起草完成；plan frontmatter 从 `active` 翻到 `completed`；`ce-commit-push-pr` 打开 PR，PR 包含 summary、testing notes、operational section 和 Compound Engineered badge。

---

## 何时使用

在以下情况使用 `ce-work`：

- `ce-plan` plan 已 ready，准备 ship
- 有 small 或 medium work 但没有 plan；bare-prompt mode 会处理
- 正在恢复 partly-shipped work
- 想要带 safe isolation 的 parallel execution
- 想要完整 shipping flow：tests、simplify、review、residuals、operational validation、PR

以下情况跳过 `ce-work`：

- Product behavior 尚未决定 -> `/ce-brainstorm`
- 非 trivial work 的 implementation guardrails 尚未建立 -> `/ce-plan`
- Bug 已有 known root cause 且 fix obvious -> `/ce-debug`
- Task 非软件工作；这里的 execution 是 human activity

---

## 作为链式 Workflow 的一部分使用

```text
/ce-ideate          (optional)
   |
   v
/ce-brainstorm
   |  requirements / brief
   v
/ce-plan
   |  guardrails — U-IDs、files、test scenarios、scope、risks
   v
/ce-work
   |  遵守 guardrails；面对代码判断 HOW
   |  从 git 推导 progress，而不是从 plan body 推导
   |  通过 quality gates ship 到 PR
   v
/ce-code-review     （可选 escalation；Tier 2 时自动调用）
   |
   v
/ce-compound        — 捕获 learning
```

Shipping 之后，`/ce-compound` 会把任何 reusable learning（遇到的 bugs、形成的 patterns、采用的 conventions）捕获到 `docs/solutions/`，让未来的 `ce-plan` 和 `ce-work` 受益于 institutional memory。

---

## 单独使用

很多人会直接用 bare prompt 调用 `ce-work`：当 scope 很小、agent 能自己 scope 时，`ce-plan` 会过于 heavy。

- **Root cause 清晰的 bug fixes**：trivial 则直接实现；small/medium 则列 task list
- **Small refactors**：抽 helper、重命名 concept、合并重复
- **恢复 partly-shipped plan**：idempotency 防止 reimplementation
- **把你已经在脑中设计好的 feature 接上线**：formal planning 会显得 ceremonial
- **Multi-feature parallel work**：worktree isolation 让多个 independent features 同时推进，避免 git contention

对于 large bare-prompt scope（cross-cutting、sensitive surfaces、many files），`ce-work` 会建议先用 `/ce-brainstorm` 或 `/ce-plan`，但会按你的选择继续。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 自动使用 `docs/plans/` 中最新的 plan |
| `<plan path>` | Origin-sourced execution |
| `<bare prompt>` | 按 complexity triage（Trivial / Small-Medium / Large） |

Output：通过 `ce-commit-push-pr` 产生 commits 和（通常）PR。执行期间 plan body read-only；只有 shipping 时 frontmatter `status` 会翻到 `completed`。

---

## 常见问题

**为什么 `ce-work` 不直接按 plan 的 exact signatures 写所有代码？**
因为 plan 刻意不包含 exact signatures；它包含 decisions、units、files、scope 和 test scenarios。Plan 是 WHAT；`ce-work` 是 HOW。这个 separation 让 plans 在数周代码变化后、或不同 implementer 之间仍然 portable。

**如果我没有 plan 怎么办？**
Bare-prompt mode 会按 complexity triage。Trivial 直接实现；small/medium 构建 task list；large 会建议先 plan。

**Worktree-isolated 和 shared-directory parallel mode 有什么区别？**
Worktree isolation 给每个 subagent 自己的 branch 和 directory；overlapping writes 会作为 merge conflicts 暴露，由 orchestrator 显式处理。Shared-directory mode 禁止 subagents staging、committing 或运行 test suite（这些由 orchestrator 在 batch 后完成）。两者都安全；worktree isolation 体验更干净。

**为什么每个 task 前要检查 work 是否已经完成？**
Context compaction 后恢复、接手他人 branch、或回到 partly-shipped plan 都很常见。Idempotency 确保 `ce-work` 不会 silent reimplement 已经存在的 work。

**什么是 Residual Work Gate？**
当更深层 code review tier 发现 autofix 没解决的问题时，`ce-work` 不会 silent ship。它会询问：apply now / file tickets / accept（with durable sink）/ stop。"Accept" 需要真实 durable record；findings 不能只存在 session 中。

**`ce-work` 支持非软件 plans 吗？**
对于标记为 `execution: knowledge-work` 的 plan（由 `ce-plan` 的 approach-altitude flow 产出），支持：lightweight carve-out 会读取 sources、synthesize 并产出 deliverable，跳过 commit/test/PR lifecycle。其他没有该 marker 的 non-software work 仍然在 `ce-plan` 结束，由人类执行。

---

## 另见

- [`ce-plan`](./ce-plan.md) - 产出 `ce-work` 执行时遵守的 guardrails
- [`ce-brainstorm`](./ce-brainstorm.md) - 定义 plan 应完成什么
- [`ce-ideate`](./ce-ideate.md) - 上游 "what's worth exploring" discovery
- [`ce-code-review`](./ce-code-review.md) - Tier 2 escalation target（Tier 2 升级目标）
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) - 处理最终 commit + PR flow
- [`ce-compound`](./ce-compound.md) - shipping 后捕获 reusable learning
