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

## Preview structure（预览结构）

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
```

Routing option B（top-level best-judgment）的 worked example：

```
Auto-resolve plan — 8 findings:

Applying (4):
  [P0] Requirements Trace — Renumber R4 to match unit reference
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

- **Shape（形状）:** `[<severity>] <section> — <one-line summary>`
- **Width target（宽度目标）:** 将 lines 保持在约 80 columns，让 preview 在 narrow terminals 中 clean render。必要时用 ellipsis truncate。
- **No section numbering**，除非 reader 需要它定位 issue（多个 findings 命中同名 section 时）。

当某个 finding 没有可用的 `why_it_matters`（罕见，只在 persona output malformed 时），直接 fallback 到 finding title。如果这影响同一 run 中不止少数 findings，在 completion report 的 Coverage section 中注明 gap。

---

## Question and options（问题与选项）

Preview body render 后，使用 platform 的 blocking question tool 询问用户（Claude Code 中 `AskUserQuestion`，Codex 中 `request_user_input`，Antigravity 中 `ask_user`，Pi 中 `ask_user`（需要 `pi-ask-user` extension））。在 Claude Code 中，该 tool 应已由 Interactive-mode pre-load step 加载；如果没有，现在用 query `select:AskUserQuestion` 调用 `ToolSearch`。下方 text fallback 仅在 harness 真正缺少 blocking tool 时适用：`ToolSearch` 没有 match、tool call 明确失败，或 runtime mode 不暴露它（例如没有 `request_user_input` 的 Codex edit modes）。Pending schema load 不是 fallback trigger。永远不要 silently skip question。

Stem（按 path 调整）：

- For routing B（routing B，固定文案）：`The agent is about to apply the plan above. Proceed?`
- For routing C（routing C，固定文案）：`The agent is about to append the findings above to the doc's Open Questions section. Proceed?`
- For walk-through（walk-through，固定文案）`Auto-resolve with best judgment on the rest`: `The agent is about to resolve the remaining findings above. Proceed?`

Options（三种情况都精确为两个）：

- `Proceed` — 按展示执行 plan
- `Cancel` — 不做任何事，返回 originating question

只有当 `ToolSearch` 明确返回 no match、tool call error，或 platform 没有 blocking question tool 时，才 fallback 到展示 numbered options 并等待用户下一次回复。

---

## Cancel semantics（Cancel 语义）

- **From routing option B Cancel:** 将用户返回 routing question（four-option menu）。不要编辑 document，不要 append 任何 Open Questions entries，不要记录任何 state。
- **From routing option C Cancel:** 相同：返回 routing question，无 side effects。
- **From walk-through `Auto-resolve with best judgment on the rest` Cancel:** 将用户返回 current finding 的 per-finding question（不是 routing question）。Walk-through 从原处继续，prior decisions 保持 intact。

任何情况下，`Cancel` 都不改变 on-disk 或 in-memory state。

---

## Proceed semantics（Proceed 语义）

当用户选择 `Proceed`：

- **Routing option B（top-level best-judgment）：** 对 plan 中每个 finding 执行 recommended action。Apply findings 进入 Apply set，供单次 end-of-batch document-edit pass 使用（Apply batching rules 见 `walkthrough.md`）。Defer findings 通过 `references/open-questions-defer.md` 路由。Skip findings 记录为 no-action。所有 actions 完成后，emit unified completion report（见 `walkthrough.md`）。
- **Routing option C（top-level Append-to-Open-Questions）：** 每个 finding 都通过 `references/open-questions-defer.md` 路由，做 Open Questions append。不应用 document edits（除了 Open Questions section additions 本身）。所有 appends 完成（或失败）后，emit unified completion report。
- **Walk-through `Auto-resolve with best judgment on the rest`：** 与 routing option B 相同，但 scope 限于用户尚未 decide 的 findings。Apply findings 与用户在 walk-through 中已选择的 findings 一起加入 in-memory Apply set；全部在单次 end-of-walk-through Apply pass 中一起 dispatch。

`Proceed` 期间的 failure（例如 batch Defer 中某个 finding 的 Open Questions append 失败）遵循 `references/open-questions-defer.md` 定义的 failure path：inline 展示 failure，并提供 Retry / Fall back / Convert to Skip；继续处理 plan 剩余部分，并在 completion report 的 failure section 中捕获该 failure。

---

## Edge cases（边缘情况）

- **Bucket 中 zero findings:** 省略 bucket header。只有 Apply 和 Skip 的 preview 不显示空的 `Appending to Open Questions (0):` line。
- **所有 findings 在同一 bucket:** Preview 仍显示 bucket header；仍提供 Proceed / Cancel。这是 routing option C 的常见情况（每个 finding 都在 `Appending to Open Questions` 下）。
- **N=1 preview（scope 中只有一个 finding）：** Preview 仍使用 grouped format，只是 bucket 只有一行。`Proceed` / `Cancel` 仍适用。
- **Open Questions append unavailable**（document read-only，append flow reports no-go）：upstream 不提供 routing option C（见 `references/open-questions-defer.md` unavailability handling）。Best-judgment（option B）和 walk-through `Auto-resolve with best judgment on the rest` 仍可运行；它们可能包含 synthesis 给出的 per-finding Defer recommendations。在 render 任何 best-judgment-shaped preview 前，如果 session cached append-availability 为 false，将每个 Defer recommendation downgrade 为 Skip，并在 preview 本身 surface downgrade（例如 `Skipping — append unavailable (N):` bucket，或 header note：`N Defer recommendations downgraded to Skip — document is read-only.`）。
- **Walk-through `Auto-resolve with best judgment on the rest` with zero remaining findings:** Walk-through 自身逻辑会在 N=1 和其他情况下 suppress `Auto-resolve with best judgment on the rest` option，因此 preview 不应以 zero remaining findings 被调用。如果发生，render `Auto-resolve plan — 0 remaining findings`，并 fall through 到 no-op 的 Proceed。
