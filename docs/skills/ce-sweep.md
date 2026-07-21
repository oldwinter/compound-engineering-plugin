# `/ce-sweep` - Recurring Feedback Sweep

| | |
|---|---|
| **Purpose** | Sweep configured feedback sources 中的新 items，跟踪每个 item 到 verified resolution，并产出 `/lfg`-ready plan |
| **Inputs** | `feedback_sources` config（首次运行时 setup）；可选 `setup`/`reconfigure` 和 `mode:headless` tokens |
| **Outputs** | Rolling requirements-only unified plan（`docs/plans/feedback-sweep-plan.md`）、durable state file、source-side acknowledgments、run summary |
| **Invocation** | 手动（`/ce-sweep`）或定时（`/ce-sweep mode:headless`）；绝不 model-invoked |
| **Position** | Around the loop，从 customer feedback 供给 `/lfg` 和 `ce-plan` |

## 调用示例

```text
# 首次运行：配置 sources、approvals、state location 和 scheduling
/ce-sweep

# 后续运行：fetch、acknowledge、analyze、verify 并 reconcile plan
/ce-sweep

# Scheduled 或 unattended run：把 ambiguous decisions 延后到 plan
/ce-sweep mode:headless

# 重新进入 setup，增加或编辑 feedback sources
/ce-sweep reconfigure

# 通过 autonomous pipeline 交付已经 reconcile 的 open items
/lfg docs/plans/feedback-sweep-plan.md
```

## 问题

Feedback triage 往往变成每个 repo 自己的 ritual：扫描上次之后的 Slack channel，react 表示已看到，下载并观看 screen recordings，判断某件事是否已经修复，再维护一份私有 open list。每个 project 都手工重建这套流程，state 活在某个人脑中或一次性文件里，而 “fixed” claims 常常没有证据就被相信。

## 方案

`ce-sweep` 把 sweep 做成 repeatable skill。Sources 在共享 `feedback_sources` config 中声明一次。每次运行会 fetch 每个 source cursor 之后的新 items，在 source 侧 acknowledge（Slack emoji reaction、GitHub Issues label），并行 subagents 分析 attached recordings，在关闭任何 item 前验证 claimed fixes 是否真的 merge 到 main branch，然后 reconcile 一个 `/lfg` 可直接执行的 rolling plan。

The [configuration reference](./configuration.md) lists the feedback-source and sweep coordination keys written by first-run setup.

Every item's lifecycle lives in a durable YAML state file with a versioned schema, so runs resume cleanly, peer agents can share the state, and a crashed run never double-acknowledges a customer's message.

## 新颖之处

1. **Connectors are persona files over a code-pinned core.** 每种 source type 是一个 markdown persona，描述该 source 如何映射到 lifecycle；correctness-critical steps（cursor advance、no-double-ack guard、merge-evidence check）固定在 deterministic bundled script 中。新增 source type 只需要一个新 persona 和一个 config entry。
2. **Per-item durability ordering.** Source acknowledge -> 确认可读 -> 写 state -> 最后推进 cursor。任意点崩溃都能恢复，且不会重复 customer-visible actions。
3. **Fix verification trusts only merge evidence.** Thread claims 永不关闭 item；只有 verified merge 到 default branch 才能关闭，并记录 merge SHA。
4. **The plan is a view, not a log.** 一个稳定路径上的 rolling plan 每次 run reconcile：新 items append，verified-fixed items drain，human-owned notes region 保持 untouched。如果 `/lfg` 已经就地 enrich plan，sweep 会 archive 它并开始 fresh view，而不是 clobber execution state。
5. **Headless-safe by contract.** `mode:headless` 永不 prompt：ambiguous product calls deferred 到 plan 的 outstanding questions；当 cursor 看起来错误导致 ack volume 过大时，circuit-breaker 会 defer，而不是 mass-react。

## 何时使用

- 你运营 alpha/beta channel（Slack、GitHub Issues），customer feedback 积累速度超过 ad-hoc triage。
- 你希望 feedback 快速被 acknowledge，但只有 fix 真正 landed 后才 close out。
- 你希望从 “customer said something” 到 “executable plan exists” 有一条 standing、schedulable pipeline。

不适合单个 recording 的一次性分析（用 `/ce-riffrec-feedback-analysis`），也不适合 time-windowed metrics reporting（用 `/ce-product-pulse`）。

## FAQ

**State 放在哪里？** Setup 时选择：commit 到 repo（多 agents 或多 machines 共享 branches 时推荐），或 machine-local under `/tmp`。Schema 记录在 skill 的 `references/state-schema.md` 中，是 peer agents 可读写的 versioned contract。

**它能回复 customers 吗？** 不能，这是刻意设计。它唯一的 source-side writes 是 setup 时 standing-approved 的 acknowledgment 和 close-out actions。

**Feedback content 里的 prompt injection 怎么办？** 所有 source content，包括 messages、issue bodies、transcripts、recording content，都被视为 data，不是 instructions；emitted plan 会结构化标记 customer text 为 untrusted，让 downstream consumers 继承同样 posture。

**Cora 的 `alpha-feedback-pulse` 怎么办？** `ce-sweep` 将其 generalize。Setup 会导入 legacy state file（cursors 和 item statuses），因此 migration 不会 re-ingest，也不会 duplicate acknowledgments。

## See Also

- [`/ce-product-pulse`](./ce-product-pulse.md) — time-windowed metrics reports；结构上的 sibling
- [`/ce-riffrec-feedback-analysis`](./ce-riffrec-feedback-analysis.md) — ce-sweep 内置的 recording analyzer
- [`/lfg`](./lfg.md) — end-to-end 执行 emitted plan
