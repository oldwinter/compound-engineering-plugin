# Bulk Action Preview（批量 Action 预览）

本 reference 定义 Interactive mode 在每次 bulk action 前展示的 compact plan preview：best-judgment（routing option B）、Append-to-Open-Questions（routing option C），以及 walk-through 的 `Auto-resolve with best judgment on the rest`（per-finding question 的 option D）。Preview 给用户一个 single-screen view，展示 agent 即将做什么，并且只提供 Proceed 或 Cancel 两个 options。

仅 Interactive mode。

---

## Preview 何时触发

三个 call sites：

1. **Routing option B（top-level best-judgment）**：用户在 routing question 中选择 `Auto-resolve with best judgment — apply per-finding edits the agent can defend, surface the rest` 之后、任何 action 执行之前。Scope：所有 pending、confidence anchor 为 `75` 或 `100` 的 `gated_auto` 或 `manual` finding。
2. **Routing option C（top-level Append-to-Open-Questions）**：用户选择 `Append findings to the doc's Open Questions section and proceed` 后、任何 append 运行前。Scope：所有 pending、confidence anchor 为 `75` 或 `100` 的 `gated_auto` 或 `manual` finding。由于 option C 是 batch-defer，每个 finding 都出现在 `Appending to Open Questions (N):` 下，无论 agent 的 natural recommendation 如何。
3. **Walk-through `Auto-resolve with best judgment on the rest`**：用户在 per-finding question 中选择 `Auto-resolve with best judgment on the rest` 后、remaining findings 被 resolved 前。Scope：current finding 和所有尚未 decided 的内容。Walk-through 中 already-decided findings 不包含在 preview 中。

三种情况中，用户都用 `Proceed` 确认，或用 `Cancel` 退出。Preview 内没有 per-item decisions；per-item decisioning 是 walk-through 的职责。

---

## Withdrawal revalidation (before composing the plan)

The walk-through's withdrawal rule (`references/walkthrough.md`, "Withdrawing findings the user's earlier answers resolved") is not confined to the one-by-one loop — it applies to every finding this preview is about to act on. Before sorting findings into Applying / Appending / Skipping buckets, judge each in-scope finding against the decisions already settled: for the `Auto-resolve with best judgment on the rest` path (option D), the earlier walk-through answers the user already gave; for any path, a finding resolved by another finding's Apply in the same plan. A finding those decisions already resolve or contradict does not belong in an action bucket — it is withdrawn, not applied, deferred, or skipped.

Route each such finding to the `Withdrawing (N):` bucket instead. A staged-Apply-triggered withdrawal remains provisional here too: if that Apply is in this same plan and later fails at execution, revert the withdrawal per the walk-through's provisional rule. Do not silently drop a withdrawn finding — the bucket shows the user what earlier answers retired, so they can Cancel if the agent misread them.

---

## Preview structure

Preview 按 agent 打算执行的 action 分组。Bucket headers 只在对应 bucket 非空时出现。

```
<Path label> — <scope summary>:

Applying (N):
  [P0] <section> — <one-line plain-English summary>
  [P1] <section> — <one-line plain-English summary>

Appending to Open Questions (N):
  [P2] <section> — <one-line plain-English summary>

Skipping (N):
  [P2] <section> — <one-line plain-English summary>

Withdrawing (N):
  [P2] <section> — resolved by <earlier decision>
```

Routing option B（top-level best-judgment）的 worked example：

```
Auto-resolve plan — 8 findings:

Applying (4):
  [P0] Requirements Trace — Renumber R4 (the auth-token requirement) to match unit reference
  [P1] Unit 3 Files — Add read-fallback for renamed report file
  [P2] Key Technical Decisions — Use framework's Deprecated field rather than hand-rolling
  [P3] Overview — Correct wrong count (says 6, list has 5)

Appending to Open Questions (2):
  [P2] Scope Boundaries — Unit 2/3 merge judgment call
  [P2] Risks — Alias compatibility-theater concern

Skipping (2):
  [P2] Miscellaneous Notes — Low-confidence style preference
  [P3] Abstraction Commentary — Speculative, subjective
```

---

## 各 path 的 scope summary wording

- **Routing option B（top-level best-judgment）：** header 为 `Auto-resolve plan — N findings:`。
- **Routing option C（top-level Append-to-Open-Questions）：** header 为 `Append plan — N findings as Open Questions entries:`。每个 finding 都落在 `Appending to Open Questions (N):` bucket。
- **Walk-through `Auto-resolve with best judgment on the rest`：** header 为 `Auto-resolve plan — N remaining findings (K already decided):`。Walk-through 中 already-decided findings 不包含在 preview 或 bucket counts 中。`K already decided` counter 表明 walk-through 已部分完成。

---

## Per-finding line format（逐条 finding 行格式）

每行使用 subagent template 中 framing-quality guidance 的 compressed form（observable-consequence-first，除非定位需要，否则不使用 internal section numbering）。One-line summary 从 persona 产出的 `why_it_matters` 中取第一句；当第一句对 preview width 来说太长时，紧凑 paraphrase 以适配。

- **Shape:** `[<severity>] <section> — <one-line summary>`
- **Width target:** keep lines near 80 columns so the preview renders cleanly in narrow terminals. Truncate with ellipsis when necessary.
- **No section numbering** unless the reader needs it to locate the issue (when multiple findings hit the same named section).
- **Self-contained identifiers** — when the one-line summary references a document-defined identifier (a requirement or unit ID such as `R4`, `U3`), pair it at first mention with a short plain-language handle drawn from the document (e.g., `R4 (the auth-token requirement)`) — never a bare identifier as the summary's only description of what it names. Keep the ID itself. Per the self-contained-rendered-lines rule in `references/synthesis-and-presentation.md`.

当某个 finding 没有可用的 `why_it_matters`（罕见，只在 persona output malformed 时），直接 fallback 到 finding title。如果这影响同一 run 中不止少数 findings，在 completion report 的 Coverage section 中注明 gap。

---

## Question and options（问题与选项）

把 preview 与 confirmation 当成两个有序的 user-facing events：

1. **Preview event**：先在 conversation 中以 user-visible assistant text 输出完整 preview body。Hidden thinking or reasoning does not count（只存在于隐藏思考或推理中的内容不算）；也不能只把 preview 放进 question interface 的 input。
2. **Decision event**：preview 可见后，再调用 harness 的 agent-callable blocking-question capability（agent 可调用的阻塞式提问能力），并等待答案。成功意味着用户在选择 `Proceed` 或 `Cancel` 时仍能看到 preview，且 workflow 会停下等待回答。

如果 preview event 尚未发生，do not invoke the blocking-question capability（不要调用阻塞式提问能力）。如果 harness 没有暴露该 capability 或调用报错，就在 visible chat 中保持同样的 interaction：紧接 preview 展示 numbered `Proceed` / `Cancel` options，并等待用户回复。绝不能省略 preview 或静默继续。

**Non-exhaustive adapters（非穷举适配器）：** Claude Code 使用 `AskUserQuestion`，Codex 使用 `request_user_input`，Antigravity CLI（`agy`）使用 `ask_question`，Pi 使用带 `pi-ask-user` extension 的 `ask_user`。Claude Code 中的 `AskUserQuestion` 应已由 Interactive-mode pre-load step 加载；如果没有，现在用 query `select:AskUserQuestion` 调用 `ToolSearch`。Pending schema load 不是 fallback trigger。

Stem（按 path 调整）：

- For routing B（routing B，固定文案）：`The agent is about to apply the plan above. Proceed?`
- For routing C（routing C，固定文案）：`The agent is about to append the findings above to the doc's Open Questions section. Proceed?`
- For walk-through（walk-through，固定文案）`Auto-resolve with best judgment on the rest`: `The agent is about to resolve the remaining findings above. Proceed?`

Options（三种情况都精确为两个）：

- `Proceed` — 按展示执行 plan
- `Cancel` — 不做任何事，返回 originating question

---

## Cancel semantics（Cancel 语义）

- **From routing option B Cancel:** 将用户返回 routing question（four-option menu）。不要编辑 document，不要 append 任何 Open Questions entries，不要记录任何 state。
- **From routing option C Cancel:** 相同：返回 routing question，无 side effects。
- **From walk-through `Auto-resolve with best judgment on the rest` Cancel:** 将用户返回 current finding 的 per-finding question（不是 routing question）。Walk-through 从原处继续，prior decisions 保持 intact。

任何情况下，`Cancel` 都不改变 on-disk 或 in-memory state。

---

## Proceed semantics（Proceed 语义）

当用户选择 `Proceed`：

- **Routing option B (top-level best-judgment):** for each finding in the plan, execute the recommended action. Apply findings go into the Apply set for a single end-of-batch document-edit pass (see `walkthrough.md` for the Apply batching rules). Defer findings route through `references/open-questions-defer.md`. Skip findings are recorded as no-action. After all actions complete, emit the unified completion report (see `walkthrough.md`).
- **Routing option C (top-level Append-to-Open-Questions):** every finding routes through `references/open-questions-defer.md` for Open Questions append. No document edits apply (beyond the Open Questions section additions themselves). After all appends complete (or fail), emit the unified completion report.
- **Walk-through `Auto-resolve with best judgment on the rest`:** same as routing option B, but scoped to the findings the user hadn't decided on. Apply findings join the in-memory Apply set with the ones the user already picked during the walk-through; all dispatch together in the single end-of-walk-through Apply pass.
- **Withdrawing bucket (any path):** each finding in this bucket is recorded `withdrawn` in the decision list, annotated with the decision that retired it — no document edit, no Open Questions append. It carries into the completion report's Withdrawn bucket and follows the same durability rule as a walk-through withdrawal (provisional when retired by a staged Apply that has not yet landed).

`Proceed` 期间的 failure（例如 batch Defer 中某个 finding 的 Open Questions append 失败）遵循 `references/open-questions-defer.md` 定义的 failure path：inline 展示 failure，并提供 Retry / Fall back / Convert to Skip；继续处理 plan 剩余部分，并在 completion report 的 failure section 中捕获该 failure。

---

## Edge cases（边缘情况）

- **Zero findings in a bucket:** omit the bucket header. A preview with only Apply and Skip does not show an empty `Appending to Open Questions (0):` line — the same holds for `Withdrawing (0):`, which is the common case when no earlier decision settled a remaining finding.
- **All findings in one bucket:** preview still shows the bucket header; Proceed / Cancel still offered. This is the common case for routing option C (every finding under `Appending to Open Questions`).
- **N=1 preview (only one finding in scope):** the preview still uses the grouped format, just with a single-line bucket. `Proceed` / `Cancel` still apply.
- **Open Questions append unavailable** (document is read-only, append flow reports no-go): routing option C is not offered upstream (see `references/open-questions-defer.md` unavailability handling). Best-judgment (option B) and walk-through `Auto-resolve with best judgment on the rest` can still run — they may contain per-finding Defer recommendations from synthesis. Before rendering any best-judgment-shaped preview, downgrade every Defer recommendation to Skip when the session's cached append-availability is false, and surface the downgrade on the preview itself (e.g., a `Skipping — append unavailable (N):` bucket, or a note in the header: `N Defer recommendations downgraded to Skip — document is read-only.`).
- **Walk-through `Auto-resolve with best judgment on the rest` with zero remaining findings:** the walk-through's own logic suppresses `Auto-resolve with best judgment on the rest` as an option when N=1 and otherwise, so the preview should never be invoked with zero remaining findings. If it is, render `Auto-resolve plan — 0 remaining findings` and fall through to Proceed with no-op.
