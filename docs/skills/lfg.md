# `lfg`

> 运行从 planning 到 green PR 的完整 hands-off engineering pipeline。

`lfg` 是 **autonomous pipeline** skill。它把 Compound Engineering 主 workflow 串成一次长运行：plan work、implement、simplify result、review、apply eligible review fixes、run browser tests、commit、push、open PR，然后 watch CI，并在 bounded loop 内修复 failures。

当你想要完整 agentic shipping path，并且愿意让 agent 从 feature description 一路推进到 open PR 时使用它。最好在 `/ce-brainstorm` 之后使用，因为 pipeline 可以基于真实 requirements plan，而不是一行 prompt。

---

## 摘要（TL;DR）

| Question | Answer |
|----------|--------|
| What does it do? | Runs the full CE software pipeline from planning through PR and CI watch |
| When to use it | Software tasks that are ready for autonomous implementation |
| What it produces | Code changes, commits, usually a PR, and durable residual notes when something cannot be fully resolved |
| What's next | Review the PR, merge when ready, and run `/ce-compound` if there is reusable learning to capture |
| Distinguishing | Hard ordering gates, implementation-only cross-model routing, return-to-caller execution, review-fix persistence, browser test pass, bounded CI autofix loop |

---

## 调用示例

```text
# 最常见：先确定有挑战性功能的 requirements，再基于该 context 交付
/ce-brainstorm design account-level notification controls for enterprise teams
/lfg

# 直接交付边界已经很清晰的软件任务
/lfg add a CSV export button to the account reports page

# 在 customer items 对齐后，交付现有 feedback-sweep plan
/lfg docs/plans/feedback-sweep-plan.md
```

最常见的 handoff 是 `/ce-brainstorm` -> `/lfg`：brainstorm 确定 requirements 和 scenarios，`lfg` 再把这些 context 转成 plan，并一路推进 implementation、review、PR 和 CI。Task 已经同样清晰时可直接调用 `lfg`。希望自行检查或批准各 stage 时，请使用各个独立 skill。

---

## 问题

正常 CE workflow 刻意 staged：plan、work、simplify、review、ship。当你想检查每一步时这很有用；但任务边界清晰、希望 agent 一路 carry 时，handoff 太多。

没有 explicit pipeline 时，autonomous runs 往往会跳过 planning，把 review 当 optional，忘记持久化 residual findings，或在 “PR opened” 时停止，即使 CI 仍然 red。

## 方案

`lfg` 将 sequence 做成 explicit and gated：

- Step 1 composes a transient settled-decisions brief from the conversation — each decision with its class, rejected alternative, and reason, topically scoped to the feature — and passes it to `/ce-plan` so decisions the user already made are carried, not re-asked; the brief is skipped entirely when nothing is settled
- `/ce-plan` must produce an implementation-ready code plan before work starts
- `/ce-work` runs in return-to-caller mode so the pipeline regains control after implementation; a requested implementation target is carried only across this seam
- Behavior-changing implementation must return verification evidence from `/ce-work`; if evidence is missing, `lfg` retries `/ce-work` once for evidence completion and then stops blocked rather than shipping blind
- `/ce-simplify-code` runs before review unless the change is docs-only or trivial
- `/ce-code-review` reports findings, then `lfg` applies eligible fixes and commits them
- Residual review findings are made durable in the PR body or a fallback tracked file
- `/ce-test-browser` runs in pipeline mode
- `/ce-commit-push-pr mode:pipeline branding:on` ships remaining changes when a remote exists and explicitly marks the CE provenance
- CI is watched for up to three repair iterations on an open PR
- An invalidating settlement conflict surfaced by planning or review halts the pipeline before shipping rather than quietly overriding what was agreed; non-halting flagged conflicts become durable residuals that reach the PR body
- At closeout, an eligible multi-area plan can produce a justified recommendation for the next separately planned area; `lfg` owns that choice and offers an opt-in `/ce-handoff` rather than continuing automatically

Pipeline 也有 local-only path：如果 repo 没有 git remote，就只在本地 commit，并跳过 push、PR creation 和 CI watch，而不是重试不可能的 network steps。

The next-work offer is gated: the completed plan must explicitly describe a larger body of separately planned work, and at least one supported future area must still be unplanned. If that gate passes, `lfg` selects and explains the best next area from current evidence. It invokes `/ce-handoff` only after you explicitly accept the offer; that handoff is for a fresh session to brainstorm one coherent area into a separate requirements-only plan, not to extend or edit the plan that just shipped. If no eligible area remains, `lfg` ends without an offer.

---

## 何时使用

Reach for `lfg` when:

- 你有一个可以走完 plan、implementation、review 和 PR 的 software task
- 你希望 hands-off progress，同时保留 CE quality gates
- Task 已由 `/ce-brainstorm` shaped，或已经足够清楚，可由 `/ce-plan` 转为 implementation-ready plan
- 你希望 CI failures 在 bounded loop 内自动处理

Skip `lfg` when:

- Work 是 non-software 或 answer-seeking
- Implementation 前需要 interactive product shaping：用 `/ce-brainstorm`
- 你想手动检查并 approve 每个 stage：自己运行 `/ce-plan`、`/ce-work`、`/ce-code-review` 和 `/ce-commit-push-pr`
- Repo 有 unusual shipping requirements，需要人工驱动 git 或 release work

---

## 放在 workflow 中使用

```text
/ce-brainstorm describe the feature
/lfg
```

从 `/ce-brainstorm` 开始会给 pipeline 更好的 requirements。`lfg` 随后自行 invoke `/ce-plan`，如果 plan 不是 implementation-ready code plan 就停止。

也可以直接调用：

```text
/lfg add account-level notification mute settings
```

Direct invocation 适合清晰 software tasks，但给 planner 的 product context 更少。

## Route Only the Implementation Stage

You may ask `lfg` to have another model or harness author implementation while `lfg` keeps ownership of planning, review, PR creation, and CI:

```text
/lfg use Codex for implementation; add account-level notification mute settings
/lfg implement the settled plan, but only use Composer for implementation
```

`lfg` recognizes the intent from the whole instruction rather than matching one keyword. It removes that routing direction from the product request before planning, then carries a transient object containing exactly `mode`, `target`, `model`, and `source` beside `mode:return-to-caller` only when it invokes `ce-work`. On string-only hosts that seam is `mode:return-to-caller implementation_engine:<compact-json> <plan-path>`; for example, `implementation_engine:{"mode":"prefer","target":"codex","model":null,"source":"lfg-current-turn"}`. The object never becomes plan content, a settled product decision, or review input. A plain mention of a model in feature text, quoted material, a comparison, or a filename does not activate routing.

That four-field carrier is deliberately scalar. If the current LFG instruction names an ordered fallback list, LFG keeps the whole list as stage-scoped current-task context and passes no truncated carrier; CE Work resolves and preflights that retained list in order. If a host cannot preserve the current-task context across its skill invocation, LFG blocks instead of silently losing the later candidates. Standing ordered config needs no carrier and remains the most portable way to establish a reusable matrix.

The first example is preference-strength. If the Codex route is unavailable before work starts, `ce-work` implements natively and returns the requested route, actual route/model, and fallback reason; `lfg` discloses the fallback and continues to its one shipping tail. The second is requirement-strength. Because `lfg` is headless, an unavailable required route blocks without asking or silently switching to native work.

Target `cursor` means the Cursor harness with its configured default model. Target `composer` means a Composer-family model requested through Cursor. A model pin is optional. Route substitution stays within the requested target/model family and is disclosed; a route is not used until its fixed-recipient, unattended write adapter is qualified and locally available. The cross-model engine has a launch floor of at least one real non-native route passing that qualification matrix; failing candidates remain unavailable rather than becoming guessed production commands.

When the prompt has no implementation instruction, `lfg` passes no empty binding. `ce-work` then considers applicable session/project instructions already in context before the gitignored per-checkout `work_engine_mode` and ordered `work_engine_preferences` list. Each config candidate names a `harness` and optional `model`; omission uses that harness's configured default. Config `prefer` is active in the automatic flow and falls back natively only after its ordered candidates are exhausted; config `require` blocks if none qualify. A current-task implementation instruction outranks those defaults.

See [Compound Engineering configuration](./configuration.md#implementation-routing) for the shared config shape and its relationship to harness-loaded instructions.

Long external runs remain observable through the `ce-work` return contract: run id, requested and actual identity, unit/job state, activity and elapsed time, checkpoint, verification/commit state, blockers, and recovery path. If `lfg` retries once to reconcile missing verification evidence, it uses the same binding and run id; it does not dispatch implementation or run the shipping tail twice. See [`ce-work`](./ce-work.md#choose-the-implementation-author) for egress disclosure, private run state, detached-worktree containment, transactional fold-in, timeouts, resume/reap/cleanup, fallback, and parallel-wave behavior.

---

## Reference

| Argument | Effect |
|----------|--------|
| _(empty)_ | Plans from current context, then runs the pipeline if the plan is eligible |
| `<feature description>` | Passes the description to `/ce-plan`, then runs the pipeline |
| `<feature description + implementation assignment>` | Removes the assignment from planning and carries it only to `ce-work` as `prefer` unless the instruction clearly requires the target |

Output：code changes、commits，通常还有 PR。没有 configured git remote 时，output 只有 local commits。如果 CI 在 bounded repair loop 后仍 red，unresolved failures 会在 run 结束前持久化记录。

---

## See Also

- [`ce-brainstorm`](./ce-brainstorm.md) — 最强 upstream requirements source
- [`ce-plan`](./ce-plan.md) — 第一个 required pipeline step
- [`ce-work`](./ce-work.md) — 以 return-to-caller mode 调用的 implementation engine
- [`ce-simplify-code`](./ce-simplify-code.md) — pre-review simplification step
- [`ce-code-review`](./ce-code-review.md) — review gate
- [`ce-test-browser`](./ce-test-browser.md) — browser validation step
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) — 有 remote 时的 shipping handoff
