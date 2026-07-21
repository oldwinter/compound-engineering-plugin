# `ce-work`

> 按 plan 的 guardrails 执行，在代码面前判断 HOW，交付完整 feature，并 hand off 到干净的 PR。

`ce-work` 是 **execution** skill。它接收 plan（较小 scope 也可接收 bare prompt），按 plan guardrails 执行 implementation，持续运行 tests，选择 implementation engine 与 safe scheduling strategy，运行 quality gates，再 hand off 到 commit + PR flow。Implementation 可以留在当前 host，也可将 bounded units 路由给另一个 qualified model/harness；host 保留 verification、canonical commits 和 shipping。它把 plan 视为 **decision artifact**，以其中的 scope、decisions、units、tests 为权威，再自行判断实际实现。**它是 `ce-plan` 刻意不预写的 HOW phase。**

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
| 它做什么？ | 读取 implementation-ready plan（或 scope bare prompt），按 guardrails 执行，持续运行 tests，并 ship reviewed PR |
| 何时使用？ | 实现带 `artifact_readiness: implementation-ready` 的 `ce-plan` plan；small/medium bare-prompt work；恢复 partly-shipped work |
| 产出什么？ | Commits + PR（或 no-PR path 下只有 commits） |
| Caller-owned mode | 供 outer orchestrator（如 `lfg`）使用：`mode:return-to-caller <plan path>` 完成 implementation/local verification，返回 structured envelope，并跳过 standalone shipping tail（final simplify、review、PR、CI）。Mid-implementation Simplify as You Go 仍运行。 |
| 下一步 | Review PR；运行 `/ce-compound` 捕获 learnings |
| Distinguishing | Plan-aware idempotency、native/cross-model implementation engines、conservative parallel waves、host-owned verification/commits、PR operational validation |

---

## 调用示例

```text
# 执行指定的 implementation-ready plan，并负责 shipping tail
/ce-work docs/plans/notification-mute.md

# 不先写 plan，直接实现边界清晰的 small 或 medium task
/ce-work extract a shared duration formatter from the notification views

# 恢复 docs/plans 中最新的 eligible plan
/ce-work
```

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

- Plan 对 **WHAT** authoritative；agent 面对代码自行判断 **HOW**
- 每个 task 前做 idempotency check；verification 已满足则跳过
- Scope-appropriate implementation（默认 native inline/subagents，或 sanctioned cross-model route）与 scheduling（serial 或 bounded independent waves）
- Behavior change 前做 test discovery + evidence selection；task 标 done 前检查 integration coverage 与 system-wide tests
- Portable self-sizing code review 带 residual-work gate：accept、file、fix 或 stop，绝不 silent ship
- 每个 PR 都有 operational validation plan：监控什么、什么触发 rollback

---

## 它的新意

### 1. Plan-aware execution：尊重 WHAT/HOW separation

`ce-work` 把 plan 当 decision artifact，而不是脚本。Scope、decisions、U-IDs、files、test scenarios 和 verification criteria 是权威；agent 自行判断实际实现。执行期间 plan body 保持 read-only；progress 存在 git commits 和 task tracker 中。

### 2. Idempotent re-execution（幂等重新执行）

每个 task 前，`ce-work` 检查该 unit 的 work 是否已经存在且符合 plan intent。如果 verification 已满足，就把 task 标为 complete 并继续。**不会 silent reimplementation。** 这在 context compaction 后恢复、接手他人 branch，或几周后回到 partly-shipped plan 时最重要。

### 3. Engine、workspace 与 scheduling 是独立决策

普通 synchronous native work 留在 active checkout。Native subagents 使用当前 harness 提供的 isolation。Detached external worker 始终获得 private linked worktree；只有 host 可在 canonical checkout apply、verify、commit result。Scheduler 只有检查 dependencies、actual/expected paths、shared interfaces、generated/config surfaces、migrations 和 shared runtime resources 后，才能 concurrent author bounded wave。Results 随后针对 advancing canonical tree 逐个 fold in。Clean patch 不等于 semantic compatibility proof；出现 overlap 或 uncertainty 时，affected work 返回 host resolution、re-dispatch 或 serial execution。

### 4. 执行全程保持 U-ID anchoring

当 plan 定义 U-IDs 时，它们会作为 task prefixes、commit messages 和 final summary 的锚点继续传播。这在 *plan edits 之间* 也成立：一次 deepening pass 把 unit 拆分后，引用不会断，因为 U-IDs 稳定。存在 Brainstorm-origin IDs（R/A/F/AE）时也同样保留。

### 5. 标记 "done" 前的 test quality gates

Task 不是 code compiles 就算 done。任何 feature-bearing task 标记 complete 前，`ce-work` 会发现正在修改内容对应的 existing test files，检查 test scenarios 是否覆盖适用类别（happy path、edges、error paths、integration），并向外追踪两层 callbacks、middleware 和 observers，确认 change 可能影响的东西。Mocking everything 只能证明孤立 logic；integration coverage 才能证明 layers 真正协同。

### 6. 带 explicit residual handling 的 portable code review

每个 non-mechanical change 都通过 `ce-code-review`，由它根据 diff 自行选择 lite/full roster。Review 是 read-only；`ce-work` 随后应用 eligible fixes，并让剩余 actionable findings 经过四选一 residual gate（apply / file tickets / accept with durable sink / stop）。“Accept”需要真实 durable record；findings 不能只存在 transient session。只有 portable reviewer 无法运行时才 fallback 到 harness-native review。

### 7. 默认包含 operational validation

每个 PR description 都包含 `Post-Deploy Monitoring & Validation` section：log queries、要观察的 metrics、expected healthy signals、failure signals、rollback triggers。如果确实没有 production impact，该 section 仍然存在，并把它作为记录下来的 decision，而不是隐含假设。

### 8. 对 bare prompts 做 smart triage

不是每次 invocation 都有 plan。`ce-work` 接收 bare prompt，并按 complexity triage：trivial work（少量文件、无 behavior change）直接实现；small/medium work 构建 task list；large 或 sensitive work 建议先用 `/ce-brainstorm` 或 `/ce-plan`。这个 triage 让 `ce-work` 可以合理处理小工作，而不强制所有事情都走完整 chain。

Invocation origin 不改变该 behavior：agent harness 无法可靠告诉 skill 是用户命名，还是 model 自行选择。若 conversation 携带一个 unambiguous active plan（例如 agent 刚编写完成，用户说“proceed”），会在 bare-prompt triage 前使用该 plan。否则 concrete implementation request 就是 bare prompt。

Clear bare-prompt work 选中 qualified external implementation route 时，`ce-work` 不把 conversation 发给 worker。它将 request 与 repository discovery 提炼为 private bounded implementation brief：goal、scope、discovered files/tests、acceptance and verification、constraints/exclusions、conservative units。Controller 记录 digest/private copy，供 deterministic recovery。若 `ce-work` 无法在不猜测的情况下填写 goal、bounded scope 和 authoritative verification，则在任何 external egress 前 clarify 或 route 到 `ce-plan`。

### 9. Session-settled decisions are not-yours-to-improve

A KTD carrying a `session-settled:` label records a decision the user examined and chose for a reason — `ce-work` implements it as specified instead of "improving" it. The restraint is scoped tightly to labeled KTDs; judgment on everything the plan leaves open is unchanged, and real defects inside a settled approach still surface at full strength. A discovery that a settled decision genuinely can't work is a blocker return, never a silently-accepted residual; non-blocking proceed-and-flag conflicts ride the return envelope as `settled_decision_conflicts`.

---

## 快速示例

一个包含四个 implementation units 的 plan 到来。`ce-work` 读取它，识别某个 unit 上的 `Execution note: test-first`，并记录一个 deferred-implementation question。它用 U-ID prefixes 构建 task list，并确认当前 branch name 有意义。

两个 units 共享 contract，因此 serial 运行；另两个彼此 independent，可以 concurrent author。Native execution 使用 host 可用的 worker isolation；selected external route 下，每个 unit 都在 private run directory 下获得 detached sibling worktree。Host 检查每个 actual change set，逐个 fold into active checkout、verify，并创建独立 canonical commits。Idempotency check 发现某 unit verification 已被 prior session 满足，于是直接标 complete，不重新实现。

`ce-code-review` 为 small、low-risk diff 自选 lite roster；两个 suggested findings 随后处理。Final validation 通过，operational validation plan 起草完成；`ce-work` 以 `branding:on` 调用 `ce-commit-push-pr`，所以 PR 包含 summary、testing notes、operational section 和 generic Compound Engineering branding。Plan 本身保持 untouched：它是 decision artifact，是否 shipped 由 git 推导，不记录在 doc 中。

---

## 何时使用

在以下情况使用 `ce-work`：

- `ce-plan` plan 已 ready，准备 ship
- 有 small/medium work 但没有 plan；bare-prompt mode 会处理
- 正在恢复 partly-shipped work
- 需要带 isolated concurrent workers 的 conservative parallel execution
- 需要完整 shipping flow：tests、simplify、review、residuals、operational validation、PR

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
   |  requirements-only unified plan
   v
/ce-plan
   |  guardrails — U-IDs、files、test scenarios、scope、risks
   v
/ce-work
   |  遵守 guardrails；面对代码判断 HOW
   |  从 git 推导 progress，而不是从 plan body 推导
   |  通过 quality gates ship 到 PR
   v
/ce-code-review     （non-mechanical changes 的 self-sizing review）
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
- **把脑中已设计好的 feature 接上线**：formal planning 会显得 ceremonial
- **Multi-feature parallel work**：scheduler 可以 concurrent author 真正 independent units，再 sequential integrate/verify

对于 large bare-prompt scope（cross-cutting、sensitive surfaces、many files），`ce-work` 会建议先用 `/ce-brainstorm` 或 `/ce-plan`，但会按你的选择继续。

## Use Beneath an Outer Orchestrator

当另一个 workflow 负责实现完成后的发布关卡（final simplify、code review、PR creation 和 CI watching）时，请调用：

```text
/ce-work mode:return-to-caller <plan path>
```

此模式让 `ce-work` 专注于实现与本地验证。实现中段的 "Simplify as You Go" 仍会在 Phase 2 运行（Mid-implementation "Simplify as You Go" still runs）。之后，`ce-work` 会返回一个 structured envelope，其中包含 changed files、completed units、verification evidence 和 blockers，并设置 `standalone_shipping_skipped: true`；它 does not run the standalone shipping tail，也就是 skips the standalone shipping tail (final simplify, review, PR, CI)。每一个实现后关卡仍由 caller 负责。

## 选择 Implementation Author

Native execution 是 default。可以在当前 prompt 中将 implementation 分配给某个 target，而不改变 verification、commits 或 shipping tail 的 ownership：

```text
/ce-work 使用 Codex 实施 docs/plans/2026-07-15-example.md
/ce-work 使用 Cursor 实施 docs/plans/2026-07-15-example.md
/ce-work 通过 Cursor 使用 Grok 实施 docs/plans/2026-07-15-example.md
/ce-work 只使用 Composer 实施 docs/plans/2026-07-15-example.md
/ce-work 使用 Codex 为现有 webhook sender 添加 retry limits
```

前三个是 preferences：`ce-work` 尝试 route；若 unavailable，则醒目披露 requested/actual 后 native 继续。第四个是 requirement：interactive standalone run 在弱化前询问；headless/automatic caller 不 prompt，返回 blocker。判断依据是 intent，不是特定 keyword。

Routing 使用正常 instruction authority + scope，不做 keyword matching。Explicit current task 优先；still-active session preference 继续适用；implementation-only caller binding 保留 recorded provenance；context 中 active project/user instructions 可提供 default；per-checkout config 是 native execution 前最后的 preference。更具体的 live intent 可以替换或收窄 config；feature prose、quoted text、example、filename 中 incidental model mention 不生效。

最后一个示例刻意没有 plan。`ce-work` 先根据 repository/tests scope request，再只把 bounded private brief/unit packet 交给 Codex。Host 仍负责检查 actual change、authoritative verification、canonical commits 和 shipping tail。

在 gitignored `.compound-engineering/config.local.yaml` 中放置 ordered、host-relative preference list：

```yaml
work_engine_mode: prefer       # off | prefer | require
work_engine_preferences:
  - harness: cursor
    model: composer
  - harness: codex
    model: "gpt-5.6"
  - harness: claude
```

[集中配置参考](./configuration.md#implementation-routing)说明该 checkout-local default 如何与 current-task、session、project instructions 交互。

每个 candidate 都有 `harness`（`codex`、`claude`、`grok` 或 `cursor`）和可选 `model`。省略 `model` 表示 harness configured default。Composer 是经 Cursor 访问的 model family，因此写作 `harness: cursor` + `model: composer`。Config 不放 CLI flags/commands；list 描述 desired author，`ce-work` 从 qualified adapter recipe 开始，compatible invocation 发生 drift 时可检查 installed CLI help/version。

该 list 刻意 host-relative。Codex 中，只有 requested model 也等于 current/default model 时才跳过 equivalent Codex route；否则 explicit model 是 distinct candidate。Claude Code 中可以先试 Cursor、再 Codex，并跳过最后的 Claude default。`ce-work` 只在 preflight 遍历 list，记录 candidate 被 skipped/unavailable 的原因，并在 egress 前锁定 first qualified recipient。Dispatch 开始后绝不跳到其他 list entry。

`off`、commented/missing mode 和 invalid mode 都保留 native default。`off` 只影响 standing config，不取消 applicable live intent/caller binding。`prefer` 在 direct/`lfg` runs 中尝试 ordered candidates，list 用尽后披露并 native fallback。`require` 只在 interactive standalone run 询问；`lfg` 或其他 headless caller 下 block。Enabled mode 没有 valid candidate list 时是 unavailable，不进行猜测。

Harness、requested model、executable route、served model 始终是独立 facts。Direct prompts 与 LFG transient carrier 仍可用 `cursor` 表示 Cursor configured default，或用 `composer` 简写经 Cursor 使用的 Composer-family model。经 Cursor 使用 Grok model 属于单独披露的 intermediary。Candidate 只有在 unattended fixed-recipient、write-capable isolated-workspace route qualified，且必要 CLI/authentication available 后才可用。`ce-work` 先尝试 documented mapping，只能在保持 deterministic restrictions 的情况下，在 requested harness/model family 内适配；没有 trustworthy receipt 时绝不声称 served model。

### External Run 会做什么

任何 repository material 离开 host 前，`ce-work` 披露并记录 instruction/config source、fixed recipient/intermediaries、暴露的 bounded unit material，以及哪些 restrictions 由 adapter 强制、哪些依赖 cooperative behavior。Detached runner 将 job identity 交给 adapter；controller 在 external CLI 启动前验证 actual runner metadata 和 exact adapter argv，因此带 shell prefix 或被替换的 worker 不能用 valid unit authorization egress。Adapter 使用 CLI existing authentication，接收 minimized environment，不能切换 recipient、扩大 scope、push、open PR 或选择 fallback。Required restriction 无法执行时 route unavailable。

每个 external unit 从 clean recorded SHA 开始，位于 `/tmp/compound-engineering/ce-work/<run-id>/` 下 detached linked worktree。这用于 same-user concurrency 与 accidental-mutation containment，**不是 security sandbox**（not a security sandbox）。Synchronous native units 仍使用 active checkout；`ce-work` 不会为每个 unit 创建 temporary worktree（does not create a temporary worktree for every unit）。Selected plan 是唯一 dirty path 时，`ce-work` 先披露并创建 plan-only checkpoint commit。任何 unrelated dirt 都让 external route unavailable。

每次 CE Work runner start 都固定 `CE_PEER_HARD_SECS=7200`，让 detached job 获得独立于 shared runner 较短 default 的两小时 hard cap（two-hour hard cap）。Route-qualified incremental activity 使用 `CE_PEER_IDLE_SECS=600`；该 progress-reset window 用于检测 stall，不是 wall-clock maximum。Silent terminal-only 或不可信 activity 使用 `CE_PEER_IDLE_SECS=0`，只依赖 hard cap。Progress 报告 run id、active unit/route、elapsed time、latest meaningful activity、activity posture、worker terminal state、integration、verification、commit、cleanup、blockers、recovery path，而不 stream full transcript。

Worker output 成为一个完整 synthetic transport commit，包括 committed/residual edits、untracked/binary files、deletes、renames、mode changes。Host 检查 actual scope 后，一个 fail-stop controller transaction acquire integration lock、重新验证 canonical checkout、apply without commit、运行 authoritative tests、reconcile test side effects、创建一个 host-owned canonical commit，并记录 cleanup。Failed pre-commit step 不会落入后续 commit；其他 unit/fallback 开始前会恢复 exact pre-fold checkout。Unknown canonical movement 会 block integration。

全部 delegated units 落地后，plan-wide verification 也通过 controller 运行，而不是 loose shell tail。Controller 从 clean canonical snapshot 开始，捕获 real exit status、抑制 Python bytecode、移除 gate 创建的 artifacts、再次证明 starting snapshot，并记录 resumable receipt。Failing gate 保留 private log 并 block completion。

Successful worktree 只在 canonical verification/commit 后 cleanup。Failed、timed-out、divergent 或 unintegrated run 留在 private `0700` run directory，使用 `0600` state 供检查。用 reported run id 重新调用只能精确恢复一次（resume exactly once）；live/temporarily unreachable attempt 不能与 native fallback 竞速。Preserved attempt 支持显式回收和 ownership-checked cleanup（reap and ownership-checked cleanup）。Parallel external units 共享一个 wave base，必须全部 terminalize 后才 fold-in，并 sequential integrate；unexpected textual/semantic overlap 会停止 affected wave。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 自动使用 `docs/plans/` 中最新的 plan |
| `<plan path>` | Origin-sourced execution |
| `<bare prompt>` | 按 complexity triage（Trivial / Small-Medium / Large） |
| `mode:return-to-caller <plan path>` | 供 outer orchestrator 使用：完成 implementation/local verification，返回 structured evidence，不运行 standalone shipping tail（final simplify、review、PR、CI） |
| `mode:return-to-caller implementation_engine:<compact-json> <plan path>` | Automatic-caller form，携带只用于 implementation 的 `mode`、`target`、`model`、`source` binding |

Output：通过 `ce-commit-push-pr` 产生 commits 和（通常）PR。整个过程中 plan 都是 read-only；`ce-work` 永远不 mutate plan。是否已经 shipped 由 git 派生，不记录在 doc 中。

---

## 常见问题

**为什么 `ce-work` 不直接按 plan 的 exact signatures 写所有代码？**
因为 plan 刻意不包含 exact signatures；它包含 decisions、units、files、scope 和 test scenarios。Plan 是 WHAT；`ce-work` 是 HOW。这个 separation 让 plans 在数周代码变化后、或不同 implementer 之间仍然 portable。

**如果我没有 plan 怎么办？**
Bare-prompt mode 会按 complexity triage。Trivial 直接实现；small/medium 构建 task list；large 会建议先 plan。

**`ce-work` 会为每个 unit 创建 detached worktree 吗？** 不会。Synchronous native implementation 留在 active checkout，native subagents 使用 host harness 的 workspace behavior。只有独立运行的 external units 使用上述 controller-owned detached worktrees。

**这些 external worktrees 是 security sandbox 吗？** 不是。它们隔离 concurrent Git state 并约束 accidental mutation，但 external CLI 以同一 OS user 运行。`ce-work` 限定 packet/authority、最小化 environment exposure，并检测 canonical-checkout movement；更强 OS isolation 不属于此 feature。

**为什么每个 task 前要检查 work 是否已经完成？**
Context compaction 后恢复、接手他人 branch、或回到 partly-shipped plan 都很常见。Idempotency 确保 `ce-work` 不会 silent reimplement 已经存在的 work。

**什么是 Residual Work Gate？** 当 `ce-code-review` 发现 follow-up pass 未解决的 actionable findings 时，`ce-work` 不会 silent ship，而会询问 apply now / file tickets / accept（with durable sink）/ stop。“Accept”需要真实 durable record；findings 不能只存在 session。

**`ce-work` 支持非软件 plans 吗？**
对于标记为 `execution: knowledge-work` 的 plan（由 `ce-plan` 的 approach-altitude flow 产出），支持：lightweight carve-out 会读取 sources、synthesize 并产出 deliverable，跳过 commit/test/PR lifecycle。其他没有该 marker 的 non-software work 仍然在 `ce-plan` 结束，由人类执行。

---

## 另见

- [`ce-plan`](./ce-plan.md) - 产出 `ce-work` 执行时遵守的 guardrails
- [`ce-brainstorm`](./ce-brainstorm.md) - 定义 plan 应完成什么
- [`ce-ideate`](./ce-ideate.md) - 上游 “what's worth exploring” discovery
- [`ce-code-review`](./ce-code-review.md) - 可移植、自动调整规模的 review path
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) - 处理 final commit + PR flow
- [`ce-compound`](./ce-compound.md) - shipping 后捕获 reusable learning
