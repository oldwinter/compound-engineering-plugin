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
| Distinguishing | Hard ordering gates、implementation-only cross-model routing、return-to-caller execution、review-fix persistence、browser test pass、bounded CI autofix loop |

---

## 调用示例

```text
# 最常见：先确定有挑战性功能的 requirements，再基于该 context 交付
/ce-brainstorm design account-level notification controls for enterprise teams
/lfg

# 同一 handoff，但用指定 model author plan（implementation 仍保持 native）
/ce-brainstorm design account-level notification controls for enterprise teams
/lfg plan with fable

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

- Step 1 从 conversation 组合 transient settled-decisions brief：每个 decision 都带 class、rejected alternative 和 reason，并按 feature topic 限定 scope；将 brief 交给 `/ce-plan`，确保用户已作出的 decisions 被携带而不是重问。没有 settled decision 时完全跳过 brief
- `/ce-plan` 必须在 work 开始前产出 implementation-ready code plan
- `/ce-work` 以 return-to-caller mode 运行，使 pipeline 在 implementation 后重新获得控制；requested implementation target 只跨这一 seam 携带
- Behavior-changing implementation 必须从 `/ce-work` 返回 verification evidence；缺失时，`lfg` 会重试 `/ce-work` 一次补齐 evidence，然后 blocked stop，而不是盲目 ship
- `/ce-simplify-code` 在 review 前运行，除非 change 是 docs-only 或 trivial
- `/ce-code-review` 报告 findings，然后 `lfg` 应用 eligible fixes 并 commit
- Residual review findings 在 PR body 或 fallback tracked file 中持久化
- `/ce-test-browser` 以 pipeline mode 运行
- 有 remote 时，`/ce-commit-push-pr mode:pipeline branding:on` ship remaining changes，并显式标记 CE provenance
- Open PR 上最多 watch CI 并 repair 三轮
- Planning/review 暴露 invalidating settlement conflict 时，pipeline 在 shipping 前停止，而不是静默覆盖已达成的约定；non-halting flagged conflicts 成为 durable residuals 并进入 PR body
- Closeout 时，eligible multi-area plan 可以产出对下一个单独规划 area 的 justified recommendation；`lfg` 拥有该选择，并提供 opt-in `/ce-handoff`，而不是自动继续

Pipeline 也有 local-only path：如果 repo 没有 git remote，就只在本地 commit，并跳过 push、PR creation 和 CI watch，而不是重试不可能的 network steps。

Next-work offer 受 gate 控制：completed plan 必须明确描述一组更大的 separately planned work，且至少一个受支持 future area 尚未规划。Gate 通过后，`lfg` 根据 current evidence 选择并解释最佳 next area。只有你明确接受 offer 后才调用 `/ce-handoff`；该 handoff 用于 fresh session 将一个 coherent area brainstorm 成单独 requirements-only plan，不扩展或编辑刚 ship 的 plan。没有 eligible area 时，`lfg` 结束且不 offer。

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

## 路由 Planning 与 Implementation Stage

你可以让 `lfg` 使用特定 model 或 harness author 某个 pipeline stage，同时 `lfg` 保留 run 其余部分的 ownership。两个 stage 可独立路由：

```text
# implementation only
/lfg add account-level notification mute settings, use Codex for implementation
/lfg implement the settled plan, but only use Composer for implementation

# planning only
/lfg plan with fable add account-level notification mute settings

# both at once
/lfg plan with fable, codex for implementation; add account-level notification mute settings
```

`lfg` 从整条 instruction 识别 intent，而不是匹配单一 keyword，并按 **scope** 解析每条 directive：

- **Scoped** — instruction 点名 stage（"plan with fable"、"codex for implementation"）。路由到该 stage：向 `ce-plan` 传 `plan_model:<alias>` carrier（model elevation），向 `ce-work` 传 `implementation_engine` object。两者可同时解析。
- **Unscoped** — 未点名 stage 的 bare assignment（"use fable"、"with codex"）。只绑定到 **implementation**，并在 `lfg` 的 opening line 中披露；绝不会静默扩散到 planning 或每个 stage。
- **Unscoped 但确实 ambiguous，且你在场** — `lfg` 在 pipeline 开始前只问一个 upfront question，然后 hands-off 运行。Headless run（scheduler、loop、nested orchestrator）从不提问——应用 implementation default 并披露，因为无人可答。

Implementation carrier 是 transient object，恰好包含 `mode`、`target`、`model` 与 `source`，只在 `lfg` 调用 `ce-work` 时与 `mode:return-to-caller` 一并传递。在 string-only host 上，该 seam 为 `mode:return-to-caller implementation_engine:<compact-json> <plan-path>`；例如 `implementation_engine:{"mode":"prefer","target":"codex","model":null,"source":"lfg-current-turn"}`。`plan_model:<alias>` carrier 与 `ce-plan` 的 request 并排传递——从不放进 request 内。两种 carrier 都不会成为 plan content、settled product decision 或 review input。Feature text、quoted material、comparison 或 filename 中普通 model mention 不激活 routing。

Four-field carrier 刻意保持 scalar。若当前 LFG instruction 指定 ordered fallback list，LFG 将完整 list 保留为 stage-scoped current-task context，不传 truncated carrier；CE Work 按顺序解析并 preflight retained list。Host 无法跨 skill invocation 保留 current-task context 时，LFG 会 block，而不是静默丢失 later candidates。Standing ordered config 不需要 carrier，仍是建立 reusable matrix 最 portable 的方式。

第一个示例是 preference-strength。若 work 开始前 Codex route unavailable，`ce-work` native implement，并返回 requested route、actual route/model、fallback reason；`lfg` 披露 fallback，继续唯一 shipping tail。第二个是 requirement-strength。由于 `lfg` 是 headless，required route unavailable 时直接 block，不询问或静默切到 native work。

Target `cursor` 表示使用 configured default model 的 Cursor harness。Target `composer` 表示经 Cursor 请求 Composer-family model。Model pin 可选。Route substitution 保持在 requested target/model family 内并披露；fixed-recipient、unattended write adapter qualified 且 locally available 前不使用 route。Cross-model engine 的 launch floor 是至少一个真实 non-native route 通过 qualification matrix；failing candidates 保持 unavailable，不会变成 guessed production commands。

Prompt 没有 stage instruction 时，`lfg` 不为该 stage 传 empty binding。Planning 方面，`ce-plan` 随后从其 `plan_model` config key 解析 elevation（或无 elevation）。Implementation 方面，`ce-work` 先考虑 context 中 applicable session/project instructions，再考虑 gitignored per-checkout `work_engine_mode` 与 ordered `work_engine_preferences` list。每个 config candidate 指定 `harness` 与可选 `model`；省略则使用 harness configured default。Config `prefer` 在 automatic flow 中生效，只在 ordered candidates 用尽后 native fallback；config `require` 在没有 qualified candidate 时 block。Current-task implementation instruction 优先于这些 defaults。

共享 config shape 及其与 harness-loaded instructions 的关系，参见 [Compound Engineering 配置](./configuration.md#implementation-routing)。

Long external run 通过 `ce-work` return contract 保持 observable：run id、requested/actual identity、unit/job state、activity/elapsed time、checkpoint、verification/commit state、blockers、recovery path。若 `lfg` 为 reconcile missing verification evidence 重试一次，会使用同一 binding/run id；不会 dispatch implementation 或运行 shipping tail 两次。Egress disclosure、private run state、detached-worktree containment、transactional fold-in、timeouts、resume/reap/cleanup、fallback 与 parallel-wave behavior 参见 [`ce-work`](./ce-work.md#choose-the-implementation-author)。

---

## Reference

| Argument | Effect |
|----------|--------|
| _(empty)_ | 从当前 context plan，然后在 plan eligible 时运行 pipeline |
| `<feature description>` | 将 description 传给 `/ce-plan`，然后运行 pipeline |
| `<feature description + stage assignment>` | 从 product request 移除 routing directives；将 scoped planning directive 路由到 `ce-plan`（`plan_model`），和/或将 scoped implementation directive 路由到 `ce-work`（`implementation_engine`）；unscoped assignment 只绑定到 implementation |

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
