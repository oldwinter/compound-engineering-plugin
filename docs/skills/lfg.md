# `lfg`

> 运行从 planning 到 green PR 的完整 hands-off engineering pipeline。

`lfg` 是 **autonomous pipeline** skill。它把 Compound Engineering 主 workflow 串成一次长运行：plan work、implement、simplify result、review、apply eligible review fixes、run browser tests、commit、push、open PR，然后 watch CI，并在 bounded loop 内修复 failures。

当你想要完整 agentic shipping path，并且愿意让 agent 从 feature description 一路推进到 open PR 时使用它。最好在 `/ce-brainstorm` 之后使用，因为 pipeline 可以基于真实 requirements plan，而不是一行 prompt。

---

## 摘要（TL;DR）

| Question | Answer |
|----------|--------|
| 它做什么？ | 从 planning 到 PR 和 CI watch 运行完整 CE software pipeline |
| 何时使用？ | 已 ready for autonomous implementation 的 software tasks |
| 产出什么？ | Code changes、commits、通常还有 PR；无法完全解决时留下 durable residual notes |
| 下一步 | Review PR，ready 后 merge；若有 reusable learning，运行 `/ce-compound` 捕获 |
| Distinguishing | Hard ordering gates、return-to-caller execution、review-fix persistence、browser test pass、bounded CI autofix loop |

---

## 问题

正常 CE workflow 刻意 staged：plan、work、simplify、review、ship。当你想检查每一步时这很有用；但任务边界清晰、希望 agent 一路 carry 时，handoff 太多。

没有 explicit pipeline 时，autonomous runs 往往会跳过 planning，把 review 当 optional，忘记持久化 residual findings，或在 “PR opened” 时停止，即使 CI 仍然 red。

## 方案

`lfg` 将 sequence 做成 explicit and gated：

- Step 1 从 conversation 组合一份 transient settled-decisions brief：每个 decision 都带 class、rejected alternative 和 reason，并按 feature topic 限定 scope；它会把 brief 交给 `/ce-plan`，确保用户已作出的 decisions 被携带而不是重问。没有 settled decision 时完全跳过 brief
- `/ce-plan` 必须在 work 开始前产出 implementation-ready code plan
- `/ce-work` 以 return-to-caller mode 运行，使 pipeline 在 implementation 后重新获得控制
- Behavior-changing implementation 必须从 `/ce-work` 返回 verification evidence；若缺失，`lfg` 会重试 `/ce-work` 一次以补齐 evidence，然后 blocked stop，而不是盲目 ship
- `/ce-simplify-code` 在 review 前运行，除非 change 是 docs-only 或 trivial
- `/ce-code-review` 报告 findings，然后 `lfg` 应用 eligible fixes 并 commit
- Residual review findings 会在 PR body 或 fallback tracked file 中持久化
- `/ce-test-browser` 以 pipeline mode 运行
- 有 remote 时，`/ce-commit-push-pr mode:pipeline branding:on` ship remaining changes，并显式标记 CE provenance
- Open PR 上最多 watch CI 并 repair 三轮
- Planning 或 review 暴露 invalidating settlement conflict 时，pipeline 会在 shipping 前停止，而不是静默覆盖已经达成的约定；不会阻断的 flagged conflicts 会成为 durable residuals，并进入 PR body

Pipeline 也有 local-only path：如果 repo 没有 git remote，就只在本地 commit，并跳过 push、PR creation 和 CI watch，而不是重试不可能的 network steps。

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

---

## Reference

| Argument | Effect |
|----------|--------|
| _(empty)_ | 从当前 context plan，然后在 plan eligible 时运行 pipeline |
| `<feature description>` | 将 description 传给 `/ce-plan`，然后运行 pipeline |

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
