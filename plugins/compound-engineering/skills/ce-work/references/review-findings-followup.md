# Apply Code Review Findings（应用 code review findings；after `ce-code-review`）

当 Tier 2 `ce-code-review` 已完成，且 **ce-work**（或其他 caller）应在 Residual Work Gate 前 apply fixes 时，加载本 reference。

这里以 `mode:agent` 调用 `ce-code-review`，因此在此 context 中它是 **review-only**：它报告 findings 并写 artifacts，不会 mutate checkout、commit、push 或 file tickets。**Caller 拥有 apply/fix policy。**（在它自己的 default/interactive mode 中，review 会自行应用 safe fixes；该路径不适用于这里。）

## 消费已完成的 review（不要重新运行）

本 reference 在 review 已运行**之后**加载。在 ce-work Tier 2 path 中，step 2a 已经调用了 `ce-code-review`；此 apply step **消费该 output**，不要启动第二次 review，否则会浪费 reviewer dispatches，并有覆盖 Residual Work Gate 要 reconcile 的 artifact 的风险。

复用已经拿到的 review output：

- Parsed JSON（已解析 JSON：`status`, `actionable_findings`, `findings`, `artifact_path`, `run_id`）**or** caller 捕获的 markdown Actionable Findings summary
- Run artifact dir（运行 artifact 目录）：`/tmp/compound-engineering/ce-code-review/<run-id>/`（`review.json`, per-reviewer JSON for `why_it_matters`）

如果 `status` 是 `failed`，停止 shipping 并展示 `reason`。如果是 `degraded`，在 apply 任何内容前说明 partial reviewer coverage。

### Fallback：仅为 cold callers 调用 review

只有当 caller 到达本文件时**尚未**运行 review（手头没有 review output）时，才调用一次 `ce-code-review`，然后继续 apply。当 caller 已经运行过 review（例如 ce-work Tier 2 step 2a）时，不要调用。

显式调用该 skill；不要把随意的 "review my changes" prompt 当作替代，除非 harness 已将其路由到 `ce-code-review`。

```
ce-code-review mode:agent plan:<plan-path> base:<merge-base-or-ref>
```

- `mode:agent`：用于 programmatic parsing 的 JSON output（`review.json` + primary JSON response）；与 default 使用相同 review pipeline。
- `plan:`：当 Phase 1 使用了 plan file 时传入（requirements completeness）。
- `base:`：当 diff base 已在当前 checkout 上 resolved 时传入；review PR number/URL 或 standalone current branch 时省略。
- **不要**传 deprecated `mode:autofix`。

对 human / interactive shipping，如果偏好 markdown tables，可不带 `mode:agent` 调用 `ce-code-review`。Apply 前捕获上面列出的相同 JSON / Actionable Findings 和 artifact dir。

## Apply inputs（Apply 输入）

- 来自 JSON 的 `actionable_findings`，或来自 markdown 的 Actionable Findings section
- 需要时使用 full finding detail：`review.json` / artifact `findings`，或用于 `why_it_matters` 和 `evidence` 的 `{reviewer}.json`
- Stable finding `#`：在 commits、residual sinks 和 subagent prompts 中复用

## 应用什么

默认应用每个 actionable finding。Applying 是对 tracked tree 的 reversible edit；diffs 会在 commit 前 review（见下文），tests 会在之后运行。因此，以 "to be safe" 为由不应用 clear、reversible fix 才是 failure mode，不是 safe choice。Bias to act：

- **Apply** 任何带具体 `suggested_fix` 且明显改进的 finding；这是常见情况。`confidence` 和 `autofix_class` 告诉你优先处理什么、标记什么，而不是是否可以 apply：`autofix_class` 是 signal，**绝不是 permission**。
- **Push back**：当 reviewer 错了时，保留 finding 但不 apply，并说明原因。
- **Flag, don't block, green-but-unverifiable edits**：当已应用 fix 触及 auth/authz、public 或 cross-service contract/schema，或 concurrency 时，passing test 不证明安全；当有清晰 `suggested_fix` 和 confidence 时 apply，并在 diff review 中醒目标出。

没有 precondition safety checklist，也没有 deny-list：code-review fix 是 reversible edit，因此 downside 通过事后控制（diff review + tests + commit checkpoint），而不是通过 gating apply 控制。

**Evidence still matches the code**：fix subagent 在编辑前于 `file:line` 确认。Orchestrator **不会**仅为了决定 eligibility 或 dispatch 而打开文件。

## 延后什么（到 Residual Work Gate）

- `autofix_class: advisory` — report-only.
- 没有具体 `suggested_fix` 可执行的 findings。
- 正确 fix 依赖 design 或 product decision 的 findings：architecture direction、contract shape，或需要 sign-off 的 behavior change。这些在 code changes 前需要 human call。

展示延后了什么以及为什么；绝不要 silently drop。

## Execution（执行）：orchestrator 分批，subagents 应用

Orchestrator **不调查 findings**（不预读 cited files 来判断 complexity 或 inline vs subagent）。那会消耗本来要保护的 context window。

**Orchestrator owns（orchestrator 负责）：** parse review output → **eligibility filter on JSON fields only** → build batches → dispatch fix subagents → review diffs → tests → commit → Residual Work Gate.

**Fix subagents own（fix subagents 负责）：** 读取 `file:line`，确认 evidence 仍匹配，apply 或带 reason skip，并返回 summary。

### Default（默认）：batched fix subagents

Eligibility filtering 后，除非下面的 optional inline shortcut 适用，否则为**所有 remaining applicable findings** dispatch subagents。不要在 parent thread 中按 complexity 分类 findings。

**Batching（primary rule：按 file 分组）：**

1. 按 severity 排序 applicable findings（P0 first）。
2. **按 `file` 分组。** 同一 file 上的所有 eligible findings -> **一个 subagent**（它只加载一次文件，并按 severity order 处理其 `#` list）。
3. **Parallel waves：** 具有 **disjoint file sets** 的 batches 可以 parallel run（与 `ce-work` SKILL.md Phase 1 Step 4 的 same worktree / shared-directory rules 相同）。
4. **Same file, many findings：** 每个 file 保持一个 subagent。如果 prompt 会超过舒适大小（约 8 findings），在该 file 上拆成 **serial** subagent passes（先 highest severity batch，然后在 merge 后或 prior agent 返回后处理下一批）。
5. **Cross-file coupling：** 不要仅为了减少 agent count 而把 unrelated files 合进一个 subagent；file grouping 是 default。只有当 findings 明确引用同一个小 edit surface（罕见）时，才 co-batch 多个 files；拿不准时，按 file 分开。

**Subagent prompt（per batch）：** 只包含 assigned findings（`#`、severity、file、line、title、`suggested_fix`、`requires_verification`；有用时从 run artifact 的 `{reviewer}.json` 添加 `why_it_matters`），并附加：
- 按 severity order 处理 assigned `#`；在每个 `file:line`，如果 evidence 不再匹配，用 one-line reason skip
- 应用 § What to apply / What not to apply 的 mechanical bar；skip 任何需要 design judgment 的内容
- 不要重新运行 `ce-code-review`
- Shared-directory fallback：不要 stage 或 commit；返回哪些 `#` 已 applied 或 skipped，以及哪些 files changed

**每个 wave 后：** orchestrator review diffs（scope = 仅 assigned `#`），运行 tests（任一已应用 finding 上有 `requires_verification: true` -> 至少 targeted tests；multi-file -> broader suite），commit（`fix(review): apply findings #…`），除非 worktree-isolated subagents 按 Phase 1 merge。重复直到所有 batches 完成。

### Optional inline shortcut（可选 inline shortcut：跳过 subagent spawn）

**仅当**以下条件**全部**成立时使用：

- JSON filtering 后正好 **一个** eligible finding，**且**
- Orchestrator **已经**在本 session 的 Phase 2 work 中拥有该 file 的 relevant region context（无需新的 Read/Grep expedition）

否则 dispatch subagent，即使只有一个 finding。拿不准时，dispatch。

### Summary (required)（必需 Summary）

报告：已 dispatched 的 batches、`#` applied vs skipped（带 subagents 的 reasons）、artifact path、tests run。

## Handoff to Residual Work Gate（交接到残余工作 gate）

本 pass 未应用的任何 actionable finding 都是 **residual work**；带 updated count 进入 Residual Work Gate。除非 fixes 后 diff 发生 materially changed，否则不要仅为了重新 apply 同一 findings 而重新调用 `ce-code-review`。
