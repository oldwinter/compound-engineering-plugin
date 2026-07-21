# `ce-work`

> 按 plan 的 guardrails 执行，在代码面前判断 HOW，交付完整 feature，并 hand off 到干净的 PR。

`ce-work` is the **execution** skill. It takes a plan (or, for smaller scope, a bare prompt), executes the implementation against the plan's guardrails, runs tests continuously, selects an implementation engine and safe scheduling strategy, runs quality gates, and hands off to a commit + PR flow. It can keep implementation on the current host or route bounded units to another qualified model/harness while the host retains verification, canonical commits, and shipping. It treats the plan as a **decision artifact** — authoritative for scope, decisions, units, and tests — and figures out the actual implementation itself. **It is the HOW phase that `ce-plan` deliberately does not pre-write.**

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
| What does it do? | Reads an implementation-ready plan (or scopes a bare prompt), executes against the guardrails, runs tests continuously, ships a reviewed PR |
| When to use it | Implementing a `ce-plan` plan with `artifact_readiness: implementation-ready`; small/medium bare-prompt work; resuming partly-shipped work |
| What it produces | Commits + a PR (or just commits, no-PR path) |
| Caller-owned mode | For outer orchestrators (e.g. `lfg`): `mode:return-to-caller <plan path>` implements and locally verifies, then returns a structured envelope and skips the standalone shipping tail (final simplify, review, PR, CI). Mid-implementation Simplify as You Go still runs. |
| What's next | Review the PR; run `/ce-compound` to capture learnings |
| Distinguishing | Plan-aware idempotency, native or cross-model implementation engines, conservative parallel waves, host-owned verification/commits, operational validation in PR |

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

- The plan is authoritative for **WHAT**; the agent figures out **HOW** with code in front of it
- An idempotency check before each task — if verification is already satisfied, skip it
- Scope-appropriate implementation (native inline/subagents by default, or a sanctioned cross-model route) and scheduling (serial or bounded independent waves)
- Test discovery + evidence selection before behavior changes, plus integration coverage and a system-wide test check before any task is marked done
- Portable self-sizing code review with a residual-work gate — accept, file, fix, or stop, but never silently ship
- Every PR carries an operational validation plan — what to monitor, what triggers rollback

---

## 它的新意

### 1. Plan-aware execution：尊重 WHAT/HOW separation

`ce-work` 把 plan 当 decision artifact，而不是脚本。Scope、decisions、U-IDs、files、test scenarios 和 verification criteria 是权威；agent 自行判断实际实现。执行期间 plan body 保持 read-only；progress 存在 git commits 和 task tracker 中。

### 2. Idempotent re-execution（幂等重新执行）

每个 task 前，`ce-work` 检查该 unit 的 work 是否已经存在且符合 plan intent。如果 verification 已满足，就把 task 标为 complete 并继续。**不会 silent reimplementation。** 这在 context compaction 后恢复、接手他人 branch，或几周后回到 partly-shipped plan 时最重要。

### 3. Engine, workspace, and scheduling are separate decisions

Ordinary synchronous native work stays in the active checkout. Native subagents use whatever isolation the current harness provides. A detached external worker always gets a private linked worktree, while the host alone applies, verifies, and commits its result in the canonical checkout. The scheduler may author a bounded wave concurrently only after checking dependencies, actual and expected paths, shared interfaces, generated/config surfaces, migrations, and shared runtime resources. Results then fold in one at a time against the advancing canonical tree. A clean patch is not proof of semantic compatibility; overlap or uncertainty returns the affected work to host resolution, re-dispatch, or serial execution.

### 4. 执行全程保持 U-ID anchoring

当 plan 定义 U-IDs 时，它们会作为 task prefixes、commit messages 和 final summary 的锚点继续传播。这在 *plan edits 之间* 也成立：一次 deepening pass 把 unit 拆分后，引用不会断，因为 U-IDs 稳定。存在 Brainstorm-origin IDs（R/A/F/AE）时也同样保留。

### 5. 标记 "done" 前的 test quality gates

Task 不是 code compiles 就算 done。任何 feature-bearing task 标记 complete 前，`ce-work` 会发现正在修改内容对应的 existing test files，检查 test scenarios 是否覆盖适用类别（happy path、edges、error paths、integration），并向外追踪两层 callbacks、middleware 和 observers，确认 change 可能影响的东西。Mocking everything 只能证明孤立 logic；integration coverage 才能证明 layers 真正协同。

### 6. Portable code review with explicit residual handling

Every non-mechanical change runs through `ce-code-review`, which selects its own lite or full roster from the diff. Review is read-only; `ce-work` applies eligible fixes afterward, then sends any actionable remainder through a four-option residual gate (apply / file tickets / accept with durable sink / stop). "Accept" requires a real durable record; findings can't live only in the transient session. Harness-native review is only a fallback when the portable reviewer cannot run.

### 7. 默认包含 operational validation

每个 PR description 都包含 `Post-Deploy Monitoring & Validation` section：log queries、要观察的 metrics、expected healthy signals、failure signals、rollback triggers。如果确实没有 production impact，该 section 仍然存在，并把它作为记录下来的 decision，而不是隐含假设。

### 8. 对 bare prompts 做 smart triage

不是每次 invocation 都有 plan。`ce-work` 接收 bare prompt，并按 complexity triage：trivial work（少量文件、无 behavior change）直接实现；small/medium work 构建 task list；large 或 sensitive work 建议先用 `/ce-brainstorm` 或 `/ce-plan`。这个 triage 让 `ce-work` 可以合理处理小工作，而不强制所有事情都走完整 chain。

Invocation origin does not change this behavior: agent harnesses do not reliably tell the skill whether the user named it or the model selected it. If the conversation carries one unambiguous active plan (for example, the agent just authored it and the user says "proceed"), that plan is used before bare-prompt triage. Otherwise a concrete implementation request is the bare prompt.

When a qualified external implementation route is selected for clear bare-prompt work, `ce-work` does not send the conversation to the worker. It distills the request and repository discovery into a private bounded implementation brief: goal, scope, discovered files/tests, acceptance and verification, constraints/exclusions, and conservative units. The controller records its digest and private copy for deterministic recovery. If `ce-work` cannot fill in the goal, bounded scope, and authoritative verification without guessing, it clarifies or routes to `ce-plan` before any external egress.

### 9. Session-settled decisions are not-yours-to-improve

A KTD carrying a `session-settled:` label records a decision the user examined and chose for a reason — `ce-work` implements it as specified instead of "improving" it. The restraint is scoped tightly to labeled KTDs; judgment on everything the plan leaves open is unchanged, and real defects inside a settled approach still surface at full strength. A discovery that a settled decision genuinely can't work is a blocker return, never a silently-accepted residual; non-blocking proceed-and-flag conflicts ride the return envelope as `settled_decision_conflicts`.

---

## 快速示例

一个包含四个 implementation units 的 plan 到来。`ce-work` 读取它，识别某个 unit 上的 `Execution note: test-first`，并记录一个 deferred-implementation question。它用 U-ID prefixes 构建 task list，并确认当前 branch name 有意义。

Two units share a contract, so they run serially. The other two are independent and can author concurrently. With native execution, they use the host's available worker isolation; with a selected external route, each gets a detached sibling worktree beneath the private run directory. The host inspects every actual change set, folds results into the active checkout one at a time, verifies, and creates separate canonical commits. The idempotency check catches that one unit's verification was already satisfied by a prior session and marks it complete without reimplementation.

`ce-code-review` self-selects a lite roster for the small, low-risk diff; the two suggested findings are addressed afterward. Final validation passes; the operational validation plan is drafted; and `ce-work` invokes `ce-commit-push-pr` with `branding:on`, so the PR includes summary, testing notes, the operational section, and generic Compound Engineering branding. The plan itself is left untouched — it's a decision artifact, and whether it shipped is derived from git, not recorded in the doc.

---

## 何时使用

在以下情况使用 `ce-work`：

- A `ce-plan` plan is ready and you're ready to ship
- You have small or medium work without a plan — bare-prompt mode handles it
- You're resuming partly-shipped work
- You want conservative parallel execution with isolated concurrent workers
- You want a complete shipping flow — tests, simplify, review, residuals, operational validation, PR

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
/ce-code-review     (self-sizing review for non-mechanical changes)
   |
   v
/ce-compound        — 捕获 learning
```

Shipping 之后，`/ce-compound` 会把任何 reusable learning（遇到的 bugs、形成的 patterns、采用的 conventions）捕获到 `docs/solutions/`，让未来的 `ce-plan` 和 `ce-work` 受益于 institutional memory。

---

## 单独使用

很多人会直接用 bare prompt 调用 `ce-work`：当 scope 很小、agent 能自己 scope 时，`ce-plan` 会过于 heavy。

- **Bug fixes with a clear root cause** — direct implementation if trivial; task list if small/medium
- **Small refactors** — extract a helper, rename a concept, consolidate duplication
- **Resuming a partly-shipped plan** — idempotency prevents reimplementation
- **Wiring a feature you've already designed** in your head, where formal planning would be ceremony
- **Multi-feature parallel work** — the scheduler can author truly independent units concurrently, then integrate and verify them sequentially

对于 large bare-prompt scope（cross-cutting、sensitive surfaces、many files），`ce-work` 会建议先用 `/ce-brainstorm` 或 `/ce-plan`，但会按你的选择继续。

## Use Beneath an Outer Orchestrator

当另一个 workflow 负责实现完成后的发布关卡（final simplify、code review、PR creation 和 CI watching）时，请调用：

```text
/ce-work mode:return-to-caller <plan path>
```

此模式让 `ce-work` 专注于实现与本地验证。实现中段的 "Simplify as You Go" 仍会在 Phase 2 运行（Mid-implementation "Simplify as You Go" still runs）。之后，`ce-work` 会返回一个 structured envelope，其中包含 changed files、completed units、verification evidence 和 blockers，并设置 `standalone_shipping_skipped: true`；它 does not run the standalone shipping tail，也就是 skips the standalone shipping tail (final simplify, review, PR, CI)。每一个实现后关卡仍由 caller 负责。

## Choose the Implementation Author

Native execution is the default. You can assign implementation to a target in the current prompt without changing who owns verification, commits, or the shipping tail:

```text
/ce-work use Codex for implementation on docs/plans/2026-07-15-example.md
/ce-work implement docs/plans/2026-07-15-example.md with Cursor
/ce-work use Cursor with Grok for implementation on docs/plans/2026-07-15-example.md
/ce-work only use Composer for implementation on docs/plans/2026-07-15-example.md
/ce-work use Codex to add retry limits to the existing webhook sender
```

The first three are preferences: `ce-work` attempts the route and continues natively with prominent requested-versus-actual disclosure if it is unavailable. The fourth is a requirement: an interactive standalone run asks before weakening it, while a headless or automatic caller returns a blocker without prompting. Intent matters, not a particular keyword.

Routing uses normal instruction authority plus scope, not keyword matching. An explicit current task wins; a still-active session preference remains applicable; an implementation-only caller binding keeps its recorded provenance; active project/user instructions already in context can supply a default; and per-checkout config is the final preference before native execution. More specific live intent may replace or narrow config, while an incidental model mention in feature prose, quoted text, examples, or filenames does nothing.

The last example is deliberately planless. `ce-work` first scopes the request against the repository and tests, then gives Codex only the bounded private brief/unit packet. The host remains responsible for inspecting the actual change, authoritative verification, canonical commits, and the shipping tail.

Put an ordered, host-relative preference list in the gitignored `.compound-engineering/config.local.yaml`:

```yaml
work_engine_mode: prefer       # off | prefer | require
work_engine_preferences:
  - harness: cursor
    model: composer
  - harness: codex
    model: "gpt-5.6"
  - harness: claude
```

The [central configuration reference](./configuration.md#implementation-routing) explains how this checkout-local default interacts with current-task, session, and project instructions.

Each candidate has a `harness` (`codex`, `claude`, `grok`, or `cursor`) and an optional `model`. Omitting `model` means that harness's configured default. Composer is a model family reached through Cursor, so it is written as `harness: cursor` plus `model: composer`. Keep CLI flags and commands out of config; the list describes the desired author, while `ce-work` starts from its qualified adapter recipe and can inspect the installed CLI's help/version when a compatible invocation has drifted.

The list is intentionally host-relative. In Codex, the example skips an equivalent Codex route only if its requested model is also the current/default model; otherwise that explicit model is a distinct candidate. In Claude Code it can try Cursor first, then Codex, and skip the final Claude default. `ce-work` walks the list only during preflight, records why a candidate is skipped or unavailable, and locks the first qualified recipient before egress. It never hops to another list entry after dispatch starts.

`off`, a commented or missing mode, and an invalid mode preserve the native default. `off` affects only standing config; it does not cancel applicable live intent or a caller binding. `prefer` tries ordered candidates in direct and `lfg` runs, then falls back natively with disclosure when the list is exhausted. `require` asks only in an interactive standalone run; under `lfg` or another headless caller it blocks. An enabled mode without a valid candidate list is unavailable rather than guessed.

Harness, requested model, executable route, and served model remain separate facts. Direct prompts and LFG's transient carrier may still use `cursor` for Cursor's configured default or `composer` as shorthand for a Composer-family model through Cursor. A Grok model reached through Cursor is a separately disclosed intermediary. A candidate is usable only after its unattended fixed-recipient, write-capable isolated-workspace route has qualified and the necessary CLI/authentication is available. `ce-work` tries the documented mapping first, may adapt only within the requested harness/model family while preserving deterministic restrictions, and never claims a served model without a trustworthy receipt.

### What an External Run Does

Before any repository material leaves the host, `ce-work` discloses and records the instruction/config source, fixed recipient and intermediaries, bounded unit material exposed, and which restrictions are adapter-enforced versus cooperative. The detached runner gives the adapter its job identity; the controller validates the actual runner metadata and exact adapter argv before the external CLI starts, so a shell prefix or substituted worker cannot egress under a valid unit authorization. The adapter uses the CLI's existing authentication, receives a minimized environment, and cannot switch recipients, widen scope, push, open a PR, or choose fallback. If a required restriction cannot be enforced, the route is unavailable.

Each external unit starts from a clean recorded SHA in a detached linked worktree under `/tmp/compound-engineering/ce-work/<run-id>/`. This is same-user concurrency and accidental-mutation containment, **not a security sandbox**. Synchronous native units still use the active checkout; `ce-work` does not create a temporary worktree for every unit. If the selected plan is the only dirty path, `ce-work` discloses and creates a plan-only checkpoint commit first. Any unrelated dirt makes the external route unavailable.

Every CE Work runner start pins `CE_PEER_HARD_SECS=7200`, giving the detached job a two-hour hard cap independently of the shared runner's shorter default. Route-qualified incremental activity uses `CE_PEER_IDLE_SECS=600`; that progress-reset window detects a stall and is not a wall-clock maximum. Silent terminal-only or otherwise untrustworthy activity uses `CE_PEER_IDLE_SECS=0` and relies on the hard cap. Progress reports the run id, active unit/route, elapsed time, latest meaningful activity, activity posture, worker terminal state, integration, verification, commit, cleanup, blockers, and recovery path rather than streaming the full transcript.

Worker output becomes one complete synthetic transport commit, including committed and residual edits, untracked/binary files, deletes, renames, and mode changes. After the host inspects its actual scope, one fail-stop controller transaction acquires the integration lock, revalidates the canonical checkout, applies without committing, runs authoritative tests, reconciles test side effects, creates one host-owned canonical commit, and records cleanup. A failed pre-commit step cannot fall through into a later commit; it restores the exact pre-fold checkout before another unit or fallback may start. Unknown canonical movement blocks integration.

After all delegated units land, plan-wide verification also runs through the controller rather than as a loose shell tail. The controller begins from a clean canonical snapshot, captures the real exit status, suppresses Python bytecode, removes artifacts created by the gate, proves the starting snapshot again, and records a resumable receipt. A failing gate keeps its private log and blocks completion.

Successful worktrees are cleaned only after canonical verification and commit. Failed, timed-out, divergent, or unintegrated runs remain in the private `0700` run directory with `0600` state for inspection. Reinvoke with the reported run id to resume exactly once; a live or temporarily unreachable attempt cannot race a native fallback. Explicit reap and ownership-checked cleanup are available for preserved attempts. Parallel external units share one wave base, must all terminalize before fold-in, and integrate sequentially; unexpected textual or semantic overlap stops the affected wave.

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 自动使用 `docs/plans/` 中最新的 plan |
| `<plan path>` | Origin-sourced execution |
| `<bare prompt>` | Triage by complexity (Trivial / Small-Medium / Large) |
| `mode:return-to-caller <plan path>` | Outer-orchestrator use: implement and locally verify, then return structured evidence without the standalone shipping tail (final simplify, review, PR, CI) |
| `mode:return-to-caller implementation_engine:<compact-json> <plan path>` | Automatic-caller form carrying one implementation-only `mode`, `target`, `model`, and `source` binding |

Output：通过 `ce-commit-push-pr` 产生 commits 和（通常）PR。整个过程中 plan 都是 read-only；`ce-work` 永远不 mutate plan。是否已经 shipped 由 git 派生，不记录在 doc 中。

---

## 常见问题

**为什么 `ce-work` 不直接按 plan 的 exact signatures 写所有代码？**
因为 plan 刻意不包含 exact signatures；它包含 decisions、units、files、scope 和 test scenarios。Plan 是 WHAT；`ce-work` 是 HOW。这个 separation 让 plans 在数周代码变化后、或不同 implementer 之间仍然 portable。

**如果我没有 plan 怎么办？**
Bare-prompt mode 会按 complexity triage。Trivial 直接实现；small/medium 构建 task list；large 会建议先 plan。

**Does `ce-work` create a detached worktree for every unit?**
No. Synchronous native implementation stays in the active checkout, and native subagents use the host harness's workspace behavior. Only independently running external units use the controller-owned detached worktrees described above.

**Are those external worktrees a security sandbox?**
No. They isolate concurrent Git state and contain accidental mutation, but the external CLI runs as the same OS user. `ce-work` limits the packet and authority, minimizes environment exposure, and detects canonical-checkout movement; stronger OS isolation is outside this feature.

**为什么每个 task 前要检查 work 是否已经完成？**
Context compaction 后恢复、接手他人 branch、或回到 partly-shipped plan 都很常见。Idempotency 确保 `ce-work` 不会 silent reimplement 已经存在的 work。

**What's the Residual Work Gate?**
When `ce-code-review` surfaces actionable findings the follow-up pass didn't resolve, `ce-work` won't silently ship them. It asks: apply now / file tickets / accept (with durable sink) / stop. "Accept" requires a real durable record — findings can't live only in the session.

**`ce-work` 支持非软件 plans 吗？**
对于标记为 `execution: knowledge-work` 的 plan（由 `ce-plan` 的 approach-altitude flow 产出），支持：lightweight carve-out 会读取 sources、synthesize 并产出 deliverable，跳过 commit/test/PR lifecycle。其他没有该 marker 的 non-software work 仍然在 `ce-plan` 结束，由人类执行。

---

## 另见

- [`ce-plan`](./ce-plan.md) — produces the guardrails `ce-work` executes against
- [`ce-brainstorm`](./ce-brainstorm.md) — defines what the plan should accomplish
- [`ce-ideate`](./ce-ideate.md) — upstream "what's worth exploring" discovery
- [`ce-code-review`](./ce-code-review.md) — portable self-sizing review path
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) — handles the final commit + PR flow
- [`ce-compound`](./ce-compound.md) — capture reusable learning after shipping
