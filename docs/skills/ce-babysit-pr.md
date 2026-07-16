# `ce-babysit-pr`

> Watch open PR 并持续推动它走向 merge。Review comments 和 CI failures 到达时立即响应，comments-first；需要 human decision 的事项会明确上报，而不是强行处理。

`ce-babysit-pr` 是 **PR 打开后的 watch loop**。`/ce-commit-push-pr` 打开 PR 后，该 skill 会同时 watch 两条独立 event stream：新到达的 review comments 和 CI status；哪条先发生就先响应，直到 PR 看起来 merge-ready、需要 human decision，或进入 terminal state。它是一个轻量 conductor，不自行 resolve feedback 或 fix CI，而是把 review comments 委派给 `/ce-resolve-pr-feedback`，把 CI failures 委派给 `/ce-debug`。它只负责其他 skill 未覆盖的部分：loop、ordering、跨 tick dedup、settle window 和 stop decision。

**它无法保证 merge-readiness，也不会假装能保证。** Reviewer 随时可能新增 feedback，required checks 也可能变化。Skill 会推动 PR 前进，并在它*看起来* ready 时告诉你；merge 仍由你决定。“这个 fix 会不会改变我原本想要的 behavior？”这一 safety judgment 属于 `/ce-resolve-pr-feedback`，后者会把此类 fix 升级为 `needs-human`，因此 babysit loop 可以自主运行，而不会静默改变 intended behavior。

Compound-engineering 的 shipping chain 是 `/ce-work -> /ce-commit-push-pr -> (reviewers comment) -> /ce-resolve-pr-feedback`。`ce-babysit-pr` 位于最后一步之上，按 schedule 调用它，并穿插处理 CI fixes。

---

## 摘要（TL;DR）

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | Watch open PR，并在 review comments 和 CI 到达时响应，持续推动 PR 走向 merge |
| 何时使用 | PR 已打开，希望 hands-off 推动它走向 merge 时（`/ce-commit-push-pr` 结束时会自动提供 handoff） |
| 产出什么 | 委派完成的 feedback/CI fixes、需要 human decision 的 escalations，以及 PR 如何走到当前状态的 high-level summary |
| 如何工作 | 委派：comments -> `/ce-resolve-pr-feedback`，CI -> `/ce-debug`；自身只负责 loop |
| 模式 | Self-sustaining in-session watch（default），或 Checkpoint（harness 不支持 background-and-wake 时执行一个 tick 并给出 resume command） |

---

## 问题

手动 babysit PR，或使用 naive loop，通常会以这些方式失败：

- **Serialized timelines**：常见错误是“等整轮 CI 完成，*再*读 comments”。Comment fix 本来就会 push 新 commit 并重新触发 CI，这样每轮都会浪费一个完整 CI cycle。应当在 CI 运行时处理 comments。
- **过早宣告 ready to merge**：CI green 后 loop 立即宣布成功，随后 review feedback 才到达；真正 merge 时才看到 surprise。
- **重复实现 engines**：Monolithic babysitter 重新实现已有专用 skill 的 feedback resolution 和 CI debugging，最终与它们 drift。
- **Loop 无法适配 harness**：In-session `sleep` loop 无法在会 sandbox turn 的 GUI app harness 中运行，Claude Code 也会阻止 foreground `sleep`。
- **Opaque endings**：Run 停止后不知道它做了什么，或得到一整面逐 thread receipts。

## 方案

`ce-babysit-pr` 使用 **stateless、可恢复 tick**，由当前 harness 实际具备的 background-and-wake capability 驱动：

- **Comments-first ordering + stale-SHA cancellation**：每个 tick 先处理新 review threads，再处理 CI；comment pass 后重新 snapshot。如果它 push 了 commit，就丢弃针对旧 SHA 的 CI failure，不会修复 dead SHA。
- **Delegation，不重复实现**：Comments 交给 `/ce-resolve-pr-feedback`，真实 CI failures 交给 `/ce-debug`；每个新 failure signature 只 dispatch 一次，不会每次 poll 都 dispatch。Inline CI logic 只做低成本 flaky-vs-real classification，以决定调用哪个 skill。
- **Settle window**：只有 GitHub 报告 PR mergeable（`mergeStateStatus == CLEAN`）、没有 open threads，并且 PR 在最短 quiet time 内未变化，才报告 “looks ready”。Late reviewer 会重置 clock。它是 cooling-off signal，不是 merge guarantee。
- **Self-sustaining in-session watch（default）**：Token-free background change detector（`pr-snapshot watch`）仅在发生 actionable change 时唤醒 agent，并保留 conversation 中的所有 decisions。不支持 background-and-wake 的 harness fallback 到 checkpoint：执行一个 tick 并输出精确 resume command。
- **单一 authoritative watcher**：较新的 invocation 会取消仍在 preflight 的旧 invocation，但只有自己的首次 snapshot 成功后才接管 active ownership，并立即停止 prior watcher。Wake 会携带 persisted generation，因此被 supersede process 延迟发出的 notifications 会基于 fresh snapshot 合并，不会重置 session 或 settle clocks。
- **完整分页的 source of truth**：`pr-snapshot` 会把 review-thread connection 翻到最后一页。`reviewThreads(first:50)` 之类的 one-shot diagnostic query 永远不能覆盖 canonical snapshot。
- **High-level final summary**：Outcome-first，按组计数，不输出 receipts。

---

## 独特之处

### 1. Comments-before-CI，然后取消 stale SHA

Ordering invariant 是该 skill 的核心。一个 tick 内按以下顺序执行：terminal check -> resolve new comments -> **重新 snapshot** -> 处理 CI。只有 comment pass 没有 push 时才处理当前 CI failure，因此 CI fix 永远不会应用到 pre-comment SHA。这样 comment 和 CI timelines 会被折叠，而不是串行化。

### 2. Stateless、可恢复 tick：一个 loop，任意 driver

所有 state 都写入磁盘（`/tmp/compound-engineering/ce-babysit-pr/<owner>-<repo>-<pr>/state.json`），因此 tick 是 idempotent 的，任何 reinvocation 都能继续驱动它：in-session background-and-wake wait、`/loop`、durable scheduler，或用户一小时后重新运行 skill。Single authored-once skill 因而能跨 CLI 和 app harnesses 使用，loop mechanics 不依赖某个可能不存在的 driver。

### 3. Self-sustaining in-session watch，不依赖特定 harness scheduler

Skill return 后 turn 就结束，所以它必须自己建立 loop，没有机制会凭空 re-invoke 它。可靠且经过 cross-harness 验证的方法，不是调用某个特定 scheduler，而是后台运行低成本 deterministic change detector `pr-snapshot watch`。它执行相同的 fetch -> diff，**不消耗 agent tokens**，只在 actionable change 或 stop condition 出现时打印一个 `BABYSIT_WAKE` sentinel，并让 agent 保持在当前 session 内等待唤醒。

所需 capability 是通用的：“运行 background process，并在它输出一行时唤醒当前 turn，而不是结束 turn”。Skill 会描述 capability，再使用 harness 提供的对应 tool。保持 in-session 能保留 conversation decisions，例如 declined nits、被判定错误的 reviewer suggestion 和 mid-run steering；只有发生变化时才消耗 reasoning。没有该 capability 时 fallback 到 **checkpoint**：执行一个 tick、persist state、打印 resume command，并明确说明 monitoring 已暂停。无人值守的 multi-day watch 可升级到 durable scheduler，但 fresh headless run 需要从磁盘重建，且不了解原 conversation context。

### 4. Settle window 优于 bot-signal parsing

Skill 不维护脆弱的 per-bot “reviewer 是否仍在 review” matrix，而是等待 elapsed quiet time。任何活动，例如 check、thread edit、new head、review-decision change 或 mergeability change，都会重置 `quiet_seconds`。Bot 正在 review 通常会产生 recent activity，因此无需专门适配。观察到 in-progress emoji 时只会延长等待，它不是必要条件。

该 window 是 **cooling-off signal，而不是 guarantee**：它证明 PR 暂时停止变化，不证明之后不会再有 review。因此 skill 报告 “looks ready, your call”，不会说 “safe to merge”。Merge-readiness 使用 GitHub 自身的 `mergeStateStatus == CLEAN`，不会重新推导 required checks。

### 5. Claim -> act -> confirm（crash-safe dedup）

Snapshot 不会因为“观察到 item”就将它标记为 handled。只有 agent 确认已 action（resolve/debug pass 后执行 `mark`），或 remote truth 让该 item 消失时，item 才会离开 actionable set。因此 resolve pass 若 crash、error 或提前返回，该 item 在下一 tick 仍 actionable，不会静默丢失。Failing check 在 current head 上持续 actionable，直到被标记 dispatched；新 head SHA 会清除该状态，并重新评估所有 checks。Escalated thread 出现 edited/added comment 时也会自动重新激活。

### 6. 可信任的 ending

每个 stop 和 checkpoint tick 都输出 outcome-first summary：looks-ready / blocked / paused，然后按组计数已完成工作，例如 N rounds 中 resolved threads 数、fixed CI failures 数，最后给出 specific blocker 或 resume command。不会输出 per-thread receipts。

关键是它会显示 **judgment calls**：loop 没有照字面 ask 行动的地方、采用不同方式完成 fix、declined/rebutted feedback、escalation，或 human steering，都会带一行原因；常规 “reviewer asked, we fixed it” 只计入 aggregate。你看到的是代表你做出的 decisions，不是每次 edit 的 transcript。

---

## 何时使用

以下情况适合 `ce-babysit-pr`：

- PR 已打开，希望无需逐轮 hand-holding 也能推动它走向 merge
- 准备 context-switch，但希望 CI failures 和 review comments 到达时得到处理
- `/ce-commit-push-pr` 刚打开 PR，并提供 babysit handoff

以下情况跳过：

- Repo **不在 GitHub**。该 skill 当前仅支持 GitHub；它和 delegates 使用 `gh`、review threads 和 Actions。检测到 GitLab/Bitbucket remote 时会在开始前停止，不会只运行一半。
- PR 尚不存在，或已 merged/closed
- 希望每次 fix push 前亲自 review/approve；改为逐次运行 `/ce-resolve-pr-feedback`
- 唯一问题是一个已知 bug；改用 `/ce-debug`

**Platform support：** 当前仅支持 GitHub。GitLab 原理上可映射到 `glab`、merge requests、MR discussions、pipelines 和 `detailed_merge_status`，但需要同时为 `pr-snapshot` fetch layer 和 `ce-resolve-pr-feedback` resolve scripts 提供 `glab` variants，目前尚未实现或测试。Platform-specific seam 是 `pr-snapshot` 的 `fetch` / `fetch_threads`。

---

## 作为 Workflow 的一部分使用

```text
/ce-work -> /ce-commit-push-pr -> /ce-babysit-pr
                                     |-- new review comments -> /ce-resolve-pr-feedback
                                     `-- real CI failure      -> /ce-debug
```

它与以下 skills 配合：

- **`/ce-resolve-pr-feedback`**：`ce-babysit-pr` 每轮处理 comments 时调用的 engine；需要单次 manual pass 时直接运行
- **`/ce-debug`**：处理 genuine CI failures 的 engine
- **`/ce-commit-push-pr`**：打开 PR 并提供 babysit handoff

---

## 单独使用

- **Current branch 的 PR**：`/ce-babysit-pr`
- **指定 PR**：`/ce-babysit-pr 1234` 或 `/ce-babysit-pr <PR-url>`
- **强制 mode**：`/ce-babysit-pr 1234 checkpoint`（或 `watch`）

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | Current branch 的 PR；根据 harness capability 推断 mode |
| `<PR number or URL>` | 指定 PR |
| `watch` / `checkpoint` | 强制 execution mode |

`scripts/pr-snapshot` 是 deterministic snapshot + state helper：它完整分页 review threads、fetch 两条 event stream，在 lock 下 atomic read/write state，并输出每个 tick 的 actionable set 和 settle window 所需的 `quiet_seconds`。其 `watch` subcommand 是支持 in-session loop 的 token-free change detector。Watch ownership 采用 latest-valid-wins：成功 prefetch 的 replacement 会记录新的 `watch_generation`、终止 predecessor，并成为唯一可 persist polls 或发出 `BABYSIT_WAKE` 的 process。旧 generation 的 queued wakes 只是触发 refresh 的 stale hints，不是独立工作；handoff 会保留原来的 session 和 settle clocks。`references/watch-loop.md` 记录 watch 如何维持自身、state schema、dedup identities、settle window 和 edge cases。

---

## 常见问题

**它会替我 merge PR 吗？**
不会。它会持续推动 PR，并在 GitHub 报告 mergeable 且 PR 在 settle window 内保持 quiet 时告诉你它*看起来* ready；merge 仍由你决定。它无法保证后续不会再有 feedback。

**为什么不先等 CI，再处理 comments？**
因为 comment fix 会 push commit，并重新触发 CI。在 CI 运行时处理 comments 可以折叠两条 timeline；等待会把它们串行化，每轮浪费一个完整 CI cycle。

**它如何避免 “green 后突然出现 feedback”？**
它不会根据一次 green snapshot 就宣告 ready。PR 必须在 settle window（default 为至少 5 分钟 elapsed quiet time）内保持不变，并由 GitHub 报告 mergeable。Late activity 会重置 clock。即使这样，它也只说 “looks ready, your call”；window 是 cooling-off signal，不保证之后没有 review。

**它会永远在后台运行吗？**
Default 是 **self-sustaining in-session watch**：token-free background change detector（`pr-snapshot watch`）只在 actionable change 发生时唤醒 agent，因此 quiet polls 不消耗 reasoning，但它受 session 生命周期约束，重新调用后可从 disk state 干净恢复。Harness 不支持 background-and-wake 时 fallback 到 **checkpoint**：执行一个 tick 并给出 resume command。无人值守 multi-day watch 可升级到 durable scheduler。它不会用 blocked/foreground sleep 或会被 reaped 的 `nohup` 假装 loop。

**它会自己修复 CI failures 吗？**
它只做低成本 classification：flaky 时 rerun 一次，真实 failure 交给 `/ce-debug`；comment fixes 交给 `/ce-resolve-pr-feedback`。它不会重复实现这两个 skill。

**遇到 merge conflicts 怎么办？**
它会停止并报告 conflicted files，不会 auto-rebase 或 force-push PR head branch；这些操作具有破坏性，不属于 watcher scope。

---

## 另见

- [`ce-resolve-pr-feedback`](./ce-resolve-pr-feedback.md) - 该 skill 每轮调用的 feedback engine
- [`ce-debug`](./ce-debug.md) - CI-failure engine
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) - 打开 PR 并提供 babysit handoff
