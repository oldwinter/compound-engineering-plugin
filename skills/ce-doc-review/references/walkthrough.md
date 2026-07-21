# Per-finding Walk-through（逐条 Finding 走查）

本 reference 定义 Interactive mode 的逐条 finding walk-through：用户在路由问题中选择选项 A（`Review each finding one by one — accept the recommendation or choose another action`）后进入的路径，以及所有终止路径（walk-through、best-judgment、Append-to-Open-Questions、zero findings）都会输出的统一 completion report。

仅适用于 Interactive mode。

---

## Routing Question（入口点）

在应用 `safe_auto` fixes、synthesis 产出剩余 finding 集合之后，orchestrator 会先询问一个四选项路由问题，然后才运行任何 walk-through 或 bulk action。

使用平台的阻塞式问题工具（Claude Code 中为 `AskUserQuestion`，Codex 中为 `request_user_input`，Antigravity 中为 `ask_question`，Pi 中为 `ask_user`，需 `pi-ask-user` extension）。在 Claude Code 中，该工具应已通过 `SKILL.md` 的 Interactive-mode pre-load step 加载；如果没有，立即用 query `select:AskUserQuestion` 调用 `ToolSearch`。只有当 harness 确实没有阻塞式工具时，才退回到编号列表展示选项：例如 `ToolSearch` 没有返回匹配、工具调用明确失败，或 runtime mode 不暴露该工具（例如没有 `request_user_input` 的 Codex edit modes）。等待 schema 加载不是 fallback 触发条件。绝不能静默跳过问题。把 routing question 渲染成叙述文本且没有 numbered-list fallback 是 bug。

**Stem:** `Agent 应该如何处理剩余 N 条 findings？`

**Options（固定顺序；没有选项标记为 `(recommended)`，routing choice 表示用户意图）：**

```
A. Review each finding one by one — accept the recommendation or choose another action
B. Auto-resolve with best judgment — apply per-finding edits the agent can defend, surface the rest
C. Append findings to the doc's Open Questions section and proceed
D. Report only — take no further action
```

逐条 finding 的 `(recommended)` 标签存在于 walk-through（选项 A）和 bulk preview（选项 B/C）内部，并根据 synthesis step 3.5b 的 `recommended_action` 逐条应用。routing question 本身不推荐 A/B/C/D 中的任何一个，因为正确路线取决于用户意图（engage / trust / triage / skim），而不是 finding-set 的形状。如果用 finding-set 形状映射 routing recommendation（例如“多数 findings 是 Apply-shaped → 推荐 best-judgment”），会把用户推向自动化路径，违背用户意图框架。

如果所有剩余 findings 都只是 FYI-subsection-only（confidence anchor `75` 或 `100` 上没有 `gated_auto` 或 `manual` findings），完全跳过 routing question，直接进入 Phase 5 terminal question。

**Append-availability adaptation.** 当 Phase 4 开始时 `references/open-questions-defer.md` 已缓存 `append_available: false`（例如只读文档、不可写 filesystem），routing question 中会压制选项 C，因为每个 per-finding Defer 都会失败进入 open-questions failure path。菜单展示三个选项（A / B / D），并在 stem 追加一行解释原因（例如 `Append to Open Questions unavailable — document is read-only in this environment.`）。这与下文 “Adaptations” 中描述的 per-finding option B suppression 相对应：routing-level 与 per-finding Defer 路径共享同一个 availability signal，因此用户不会在一个层级看到 Defer、另一个层级又看不到它。

**按选择 dispatch：**

- **A** — 加载此 walk-through（per-finding loop）。Apply decisions 累积在内存中；Open-Questions defers 通过 `references/open-questions-defer.md` inline 执行；Skip decisions 记录为 no-action；`Auto-resolve with best judgment on the rest` 通过 `references/bulk-preview.md` 路由。
- **B** — 加载 `references/bulk-preview.md`，范围为所有 pending `gated_auto` / `manual` findings。Proceed 时执行计划：Apply → end-of-batch document edit；Open-Questions defers → `references/open-questions-defer.md`；Skip → no-op。Cancel 时返回 routing question。
- **C** — 加载 `references/bulk-preview.md`，把每个 pending finding 都放入 Open-Questions bucket（不管 agent 的自然 recommendation 是什么）。Proceed 时将每个 finding 通过 `references/open-questions-defer.md` 路由；不应用 document edits。Cancel 时返回 routing question。
- **D** — 不进入任何 dispatch phase。输出 completion report，并进入 Phase 5 terminal question。

---

## Entry（walk-through mode 入口）

walk-through 从 orchestrator 接收：

- 按 severity 排序（P0 → P1 → P2 → P3）且已合并的 findings list，并过滤为 actionable findings（confidence anchor `75` 或 `100`，且 `autofix_class` 为 `gated_auto` 或 `manual`）。FYI-subsection findings（anchor `50`）不包含在内，只在最终 report 中展示，且没有 walk-through entry。
- 用于 artifact lookup 的 run id（如适用）。
- 来自 synthesis step 3.5c 的 premise-dependency chain annotations：每个 finding 可能携带 `depends_on: <root_id>` 或 `dependents: [<ids>]`。

每个 finding 的 recommended action 已由 synthesis step 3.5b（Deterministic Recommended-Action Tie-Break，`Skip > Defer > Apply`）标准化；walk-through 通过 merged finding 的 `recommended_action` 字段展示该 recommendation，不重新计算。

**Root-first iteration order.** 当 finding 有 `dependents` 时，不管 chain 内 severity 顺序如何，都先迭代 root，再迭代它的 dependents。root 必须先出现，这样用户对 root 的决定才能 cascade。

**Cascading root decisions.** 当用户在带有 `dependents` 的 finding 上选择 Skip 或 Defer：

1. 在触发下一个问题之前，在 terminal 中宣布 cascade："Skipping/Deferring this root will auto-resolve N dependent finding(s): {titles}. Continue?"
2. 使用平台阻塞式问题工具，提供两个选项：`Cascade — apply same action to all dependents`（recommended）和 `Decide each dependent individually`。根据 blocking-question tool 的设计规则，label 必须自包含。
3. 选择 Cascade 时：把 root 的 action 应用于每个 dependent，并跳过这些 findings 的 walk-through entries。持久化遵循下文 “Per-finding routing” 中的 per-action routing 规则：每个 cascaded decision 的 canonical home 都是 in-memory decision list（标注 `cascaded from {root_title}` 和 cascaded action），再加上任何 action-specific side effect：
   - Cascaded `Apply` — 将 dependent id 加入 Apply set，并记录在 decision list 中。
   - Cascaded `Defer` — 为 dependent 调用 open-questions append flow，并在 decision list 中记录 append outcome。如果 append 失败，在推进 cascade 之前，对该 dependent 回退到 per-finding failure path（Retry / Record only / Convert to Skip）。
   - Cascaded `Skip` — 只记录到 decision list；没有 Apply-set entry，也没有 open-questions append。

   选择 Individual 时：正常继续，每个 root 的 dependent 都会获得自己的 walk-through entry。

当用户在 root 上选择 Apply 时，不要 cascade：premise 成立，因此每个 dependent 仍需要自己的 decision。正常继续 walk-through。

**Orphaned dependents.** 如果 dependent 的 root 在前一轮已被 rejected，而本轮 root 被压制（按 R29），则把 dependent 视为没有 chain context 的 standalone finding。不要引用缺失的 root。

---

## Per-finding Presentation（逐条呈现）

每个 finding 分为两部分展示：一个承载解释的 terminal output block，以及一个通过平台阻塞式问题工具发出的决策问题。绝不要合并两者：terminal block 使用 markdown；question 使用 plain text。

### Terminal Output Block（触发问题前打印）

渲染为 markdown。label 独占一行，section 之间留空行：

```
## Finding {N} of {M} — {severity} {plain-English title}

Section: {section}

**What's wrong**

{plain-English problem statement from why_it_matters}

**Proposed fix**

{suggested_fix — rendered per the substitution rules below: prose-first, intent-language}

**If this is left as-is**

{one sentence naming the concrete downstream cost}

{Conflict-context line, when applicable — see below}
```

Substitutions（替换规则）：

- **`{plain-English title}`** — a 3–8 word summary suitable as a heading. Derived from the merged finding's `title` field but rephrased so it reads as observable consequence (e.g., "Implementers will pick different tiers" rather than "Section X-Y lists four tiers"). For document-review findings, observable consequence is the *effect on a reader, implementer, or downstream decision*, not runtime behavior.
- **`{section}`** — from the finding's `section` field.
- **Opaque identifiers** — any token the user would have to open the document or the code to understand carries a short plain-language handle on its first mention. This covers both document-defined IDs (`R6`, `U3`, `KTD2`) and implementation identifiers the document happens to name — functions, files, variables, and line references such as `run_codex_cmd`, `$PEERLOG`, or `peer-job-runner.py`. Gloss each on first mention (e.g., `R6 (suppress peer panels on low-stakes calls)`); never leave a bare identifier as the block's only description of what it names. Keep the ID itself: it anchors the finding for anyone editing the document, and later mentions within the same block stay bare so the block scans. Look the handle up in the document already in context; the finding's fields carry the bare ID and do not supply it. This applies to `{section}` and to the body fields below — it is the one exception to rendering those fields as-is, and it is narrow: gloss the identifier at first mention and leave the surrounding prose untouched. Per the self-contained-rendered-lines rule in `references/synthesis-and-presentation.md`. Respect the code-span budget below.
- **`why_it_matters`** — from the merged finding's `why_it_matters` field, held to the same altitude cap as `suggested_fix` below. Rules:
  - **First sentence states the consequence, and contains no identifier at all.** What goes wrong, for whom. A reader who skimmed the document once must be able to judge it without looking anything up.
  - **At most two further sentences of mechanism**, glossed per the identifier rule above. Mechanism explains *how* the problem arises; it is supporting detail, not the finding.
  - **Everything past that is detail the user can ask for.** When the merged field carries more — file-level tracing, multi-hop interactions, competing call paths — compress it out and add one closing line offering it (e.g. `Ask for the trace if you want the call-path detail.`). Do not print it by default. A block that traces internals across several paragraphs is not more rigorous; it moves the reading cost onto a user who has less document context than the review does, which is the condition this walk-through exists to serve.
- **`suggested_fix`** — from the merged finding's `suggested_fix` field. Render as prose describing intent, not as raw markup. The user's job is to trust or reject the action — they don't need to review exact text. Rules:
  - **Default — one sentence describing the effect.** What does the fix achieve, and where does it live? Prefer intent language over quoted text.
    - Good: `Drop the Advisory tier from the enum; advisory-style findings surface in an FYI subsection at the presentation layer.`
    - Good: `Add a deployment-ordering constraint requiring Units 3 and 4 in a single commit.`
    - Bad: `Change "autofix_class: [auto, gated_auto, advisory, present]" to "autofix_class: [safe_auto, gated_auto, manual]" in findings-schema.json on line 48.` — too syntax-focused for a decision loop
  - **Code-span budget** — at most 2 inline backtick spans per sentence, each a single identifier, flag, or short phrase (e.g., `` `safe_auto` ``, `` `<work-context>` ``). Always leave a space before and after each backtick span.
  - **Raw code blocks** — only for short (≤5-line) genuinely additive content where no before-state exists. Above 5 lines, switch to a summary.
  - **No diff blocks.** Document mutations render as prose.
- **`If this is left as-is`** — one sentence naming the concrete downstream cost of not acting: what breaks, for whom, at what point. This is the line the user's decision turns on when they have not read the document as closely as the review did, so it must be evaluable on its own — no identifier the user would have to look up, no appeal to a claim only the reviewer can verify. When the honest answer is that the cost is small or speculative, say so plainly rather than inflating it.
- **Conflict-context line (when applicable)** — when contributing personas implied different actions for this finding and synthesis step 3.6 broke the tie, surface that briefly. Example: `Coherence recommends Apply; scope-guardian recommends Skip. Agent's recommendation: Skip.` The orchestrator's recommendation — the post-tie-break value — is what the menu labels "recommended."

### Question Stem（简短、聚焦决策）

terminal block 渲染后，用平台阻塞式问题工具触发一个紧凑的两行 stem：

```
Finding {N} of {M} — {severity} {short handle}.
{Action framing in a phrase}?
```

其中：

- **Short handle** 与 terminal block heading 中的 `{plain-English title}` 匹配。
- **Action framing** — 用一个短语描述单个 recommended action 具体做什么，并写成 yes/no question。示例：`Apply the rename?`、`Defer to Open Questions since the tradeoff is genuine?`、`Skip since the document already resolves this elsewhere?`。

不要在 stem 中枚举 alternatives。stem 只给出一个 recommendation 作为 yes/no；option list 承载 alternatives。当 recommendation 接近临界时，在 conflict-context line 中展示分歧，而不是写成 multi-option stem。

### Findings 之间的 Confirmation

用户回答后、打印下一个 finding 的 terminal block 前，输出一行 action confirmation。示例：`→ Applied. Edit staged at "Scope Boundaries" section.`、`→ Deferred. Entry appended to "## Deferred / Open Questions".`、`→ Skipped.`

### Options（四个；按说明适配）

下面四个选项是常规 per-finding question 的**完整且互斥集合**。顺序固定，绝不重排、添加或替换。特别是，**`Acknowledge` 不是这些选项之一**；它只出现在下文 “Per-finding routing” 中的 no-fix sub-question，且只在用户对缺少 `suggested_fix` 的 finding 选择 Apply 时触发。把 `Acknowledge` 导入常规菜单（替代 D，或作为第五个选项）是 bug：它会静默丢失 `Auto-resolve with best judgment on the rest` workflow shortcut，并且在 no-fix path 之外展示 `Acknowledge` 会错误标注 completion report 的 bucket counts。

```
A. Apply the proposed fix
B. Defer — append to the doc's Open Questions section
C. Skip — don't apply, don't append
D. Auto-resolve with best judgment on the rest
```

**用 `(recommended)` 标记 post-tie-break recommendation 对应的 option label。** 这是必需项，不是可选项。只有 A、B 或 C 可以携带它：synthesis 输出的 `recommended_action` 是 Apply/Defer/Skip，映射到 A/B/C。D（`Auto-resolve with best judgment on the rest`）是跨剩余 findings 的 bulk execution workflow shortcut，不是 finding-level resolution action，因此永不标记为 `(recommended)`。

```
A. Apply the proposed fix  (recommended)
B. Defer — append to the doc's Open Questions section
C. Skip — don't apply, don't append
D. Auto-resolve with best judgment on the rest
```

当 reviewers 存在分歧或证据反对 default 时，仍然只标记一个选项：即 synthesis 产出的那个。在 conflict-context line 中展示分歧。

### Adaptations（适配）

- **N=1（恰好一个 pending finding）：** terminal block 的 heading 省略 `Finding N of M`，渲染为 `## {severity} {plain-English title}`。stem 第一行去掉位置计数，变为 `{severity} {short handle}.`。选项 D（`Auto-resolve with best judgment on the rest`）被压制，因为没有后续 findings；菜单只显示三个选项：Apply / Defer / Skip。

- **Open-Questions append unavailable**（只读文档、写入失败）：当 `references/open-questions-defer.md` 报告 in-doc append mechanic 无法运行时，省略选项 B。stem 追加一行解释原因（例如 `Defer unavailable — document is read-only in this environment.`）。菜单显示三个选项：Apply / Skip / Auto-resolve with best judgment on the rest。在渲染选项前，把 synthesis 中任何 per-finding `Defer` recommendation 重映射为 `Skip`，这样 `(recommended)` marker 会落在实际存在的选项上。在 conflict-context line 中展示 remap（例如 `Synthesis recommended Defer; downgraded to Skip — document is read-only.`）。

- **Combined N=1 + no-append：** 菜单显示两个选项：Apply / Skip。

只有当 `ToolSearch` 明确没有返回匹配、工具调用报错，或平台没有阻塞式问题工具时，才退回到编号列表展示选项并等待用户下一条回复。

---

## Per-finding Routing（逐条路由）

对每个 finding 的回答：

- **Apply the proposed fix** — 将 finding id 加入 in-memory Apply set。推进到下一个 finding。不要 inline 编辑文档：Apply 会累积，在 end-of-walk-through batch execution 中统一执行。**No-fix guard:** 如果 merged finding 没有 `suggested_fix`（可能出现在 `manual` findings 中，persona 只把问题标为 observation 而没有具体 resolution），Apply 不可执行。不要把该 finding 加入 Apply set。相反，先展示下文 no-fix sub-question，再推进。
- **Defer — append to Open Questions section** — 调用 `references/open-questions-defer.md` 中的 append flow。在任何 failure-path sub-question（Retry / Fall back / Convert to Skip）期间，walk-through 的 position indicator 保持在当前 finding。成功后，在 in-memory decision list 中记录 append location 和 reference，并推进。若从 failure path 转换为 Skip，则推进并在 completion report 中说明失败。
- **Skip — don't apply, don't append** — 在 in-memory decision list 中记录 Skip。推进。无 side effects。
- **Auto-resolve with best judgment on the rest** — 退出 walk-through loop。dispatch `references/bulk-preview.md` 中的 bulk preview，范围是当前 finding 和所有尚未决定的 findings。preview header 报告已经决定的 findings 数量（"K already decided"）。如果用户在 preview 中选择 Cancel，返回当前 finding 的 per-finding question（不是 routing question）。如果用户选择 Proceed，则按 `references/bulk-preview.md` 执行计划：Apply findings 与用户已选择的 Apply 一起加入 in-memory Apply set，Defer findings 路由到 `references/open-questions-defer.md`，Skip 为 no-op；然后进入 end-of-walk-through execution。

### No-fix Sub-question（对没有 `suggested_fix` 的 finding 选择 Apply）

这个 sub-question，尤其是 `Acknowledge without applying` 选项，**只属于 no-fix path**。它只在用户对 merged record 没有 `suggested_fix` 的 finding 选择 Apply 后触发。不要在常规 per-finding menu 中展示这个 sub-question 或它的 `Acknowledge` option。常规菜单的第四个选项始终是 `Auto-resolve with best judgment on the rest`（见上文 “Options”），绝不是 `Acknowledge`。

Synthesis step 3.5b 会把任何没有 `suggested_fix` 的 merged finding 的默认 recommendation 从 Apply 降级为 Defer，因此 `(recommended)` 永远不会落在这些 findings 的 Apply 上。但菜单仍允许用户手动选择 Apply。发生这种情况时，不要把 finding 加入 Apply set：execution pass 没有 edit payload 可应用，否则要么 batch 失败，要么记录误导性的 “applied” outcome。

使用平台 question tool 触发一个阻塞式 sub-question。stem 用一行解释为什么 Apply 不可执行，然后提供三个自包含选项。sub-question 打开时，position indicator 保持在当前 finding。

**Stem（固定文案）:** `Apply isn't executable for this finding — the review surfaced the issue without a concrete fix. How should the agent proceed?`

**Options（固定顺序）：**

```
A. Defer to Open Questions  (recommended)
B. Skip — don't apply, don't append
C. Acknowledge without applying — record the decision, no document edit
```

**Routing（路由）：**

- **A. Defer to Open Questions** — 调用 `references/open-questions-defer.md` 中的 append flow，就像用户一开始选择了 Defer。failure-path handling 完全相同（Retry / Fall back / Convert to Skip）。成功后，在 decision list 中记录 append location（标注 `redirected from Apply — no suggested_fix`），并推进。
- **B. Skip** — 在 decision list 中记录 Skip（标注 `redirected from Apply — no suggested_fix`）。推进。无 side effects。
- **C. Acknowledge without applying** — 在 decision list 中把 finding 记录为 `acknowledged`（标注 `Apply picked but no suggested_fix — no edit dispatched`）。不要加入 Apply set。推进。completion report 将 Acknowledged 作为独立 bucket 展示，带自己的 count、per-finding action label，以及 report ordering 中自己的位置（`Applied / Deferred / Skipped / Acknowledged`）——完整 contract 见统一 completion report 的 “Minimum required fields” 和 “Report ordering”。acknowledgement reason 会在每条 per-finding line 上展示。对于 round-to-round suppression（不同于 report display），Acknowledged decisions 会在 multi-round decision primer 中作为 rejected-class decision 和 Skip、Defer 一起传递，这样 round-N+1 synthesis 会通过 R29 压制重复提出：语义上，用户看过该 finding，选择不行动，并希望被记录；这在 suppression 语义上等同于 Skip，但在 report 中保持独立 bucket。

**Availability adaptation.** 当 `references/open-questions-defer.md` 已为 session 缓存 `append_available: false` 时，省略选项 A，并在 stem 中展示一行原因（例如 `Defer unavailable — document is read-only in this environment.`）。菜单变成 Skip / Acknowledge without applying，并把 Skip 标记为 `(recommended)`。

**Cascading roots.** 当 finding 是有 dependents 的 root，且用户在此 sub-question 中选择 A（Defer）或 B（Skip）时，运行上文 “Cascading root decisions” 中的 cascade announcement：把 sub-question 的选择视为 root 的 effective action。选项 C（Acknowledge）不 cascade；root 被记录为 acknowledged，而 dependents 各自获得自己的 walk-through entry。

---

## Withdrawing findings the user's earlier answers resolved

Earlier decisions carry information forward. Apply stages a fix that does not execute until end-of-walk-through, so later findings are still being presented against the pre-edit document. Skip and Defer settle a premise. Freeform text, an `Other` answer, or per-option notes may assert a fact the document does not state — the no-freeform-authoring rule below forbids the user hand-writing a *fix*, not supplying information.

Synthesis's premise chains (step 3.5c) do not cover this: they are built on the rejection test, which is why Apply does not cascade under "Cascading root decisions" above.

**When a finding's turn arrives, judge it against everything the user has said so far.** If earlier answers already resolve or contradict it, do not render its terminal block or fire its question. Say succinctly, in plain user-facing language, what the finding was and which earlier answer settled it — enough that the user can tell it was handled rather than lost, and can object if the agent read them wrong. Follow the one-line shape of "Confirmation between findings" above. Then advance to the next finding, or to the completion report if none remain.

Evaluate lazily, at the point the finding would have been presented — do not scan ahead after every answer.

**The cascade opt-out wins.** When the user answered a root's cascade prompt (see "Cascading root decisions" above) with `Decide each dependent individually`, do not auto-withdraw that root's dependents on the strength of the root decision — they explicitly asked to see each one, and a dependent's premise dissolving under the root's rejection is exactly the cascade the opt-out declined. Give those dependents their own walk-through entries. A *different* earlier answer may still withdraw one of them; only the root whose cascade they opted out of is excluded as a trigger.

Record each as `withdrawn` in the decision list, noting which decision retired it. Withdrawn is its own completion-report bucket. It carries forward in the decision primer as a rejected-class decision — alongside Skip, Defer, and Acknowledge — **only when a user decision durably settled it**: a settled premise (Skip/Defer) or a user-asserted fact. Those are user judgments that the finding needn't be actioned, so R29 should suppress a round N+1 re-raise since the document itself never changed.

**An Apply-triggered withdrawal never carries forward as rejected-class.** It is a *prediction* that a staged fix will resolve the finding, not a user judgment that it needn't be. The Apply runs only at end-of-walk-through, and its landing is neither certain nor proof of semantic resolution — it can fail outright, or land in the wrong place and leave the withdrawn finding's evidence untouched (R30 verifies the applied fix's own fingerprint, not the withdrawn finding's). So round N+1 re-synthesis, not R29, is the check: if the fix genuinely resolved the finding, fresh personas won't regenerate it against the edited document; if it didn't — whether the Apply failed or landed ineffectively — the finding resurfaces for the user instead of being silently suppressed. When such an Apply fails outright during execution (write error, or the defensive no-fix fallback), also list its reverted withdrawals in the completion report's failure section as returned to scope, so the user sees them in-run rather than only next round.

---

## Override rule

“Override” 指用户选择了不同的 preset action（用 Defer 或 Skip 替代 Apply，或用 Apply 替代 agent 的 recommendation）。没有 inline freeform custom-fix authoring：walk-through 是 decision loop，不是 pair-editing surface。想要 proposed fix 变体的用户应选择 Skip，并在 flow 外手动编辑；如果他们还想跟踪该 finding，可以先 Defer，再编辑。

---

## State（状态）

Walk-through state **仅存在于内存中**。orchestrator 维护：

- Apply set（用户选择 Apply 的 finding ids）
- decision list（每个已回答 finding 的 action 和 metadata，例如 Deferred 的 `append_location` 或 Skipped 的 `reason`）
- findings list 中的当前位置

除 in-doc Open Questions appends（外部 side effects，无法 rollback）外，每个 decision 不会向磁盘写入任何内容。被中断的 walk-through（用户取消 prompt、session compacts、network dies）会丢弃所有 in-memory state。Apply decisions 尚未 dispatch（它们在 end-of-walk-through 统一 batch），因此会干净地丢失，不产生 document changes。

Cross-session persistence 不在 scope 内。与 `ce-code-review` 的 walk-through state rules 保持一致。

---

## End-of-walk-through execution（walk-through 结束执行）

loop 结束后——无论是每个 finding 都已回答，还是用户选择了 `Auto-resolve with best judgment on the rest → Proceed`——walk-through 都会交给 execution phase：

1. **Apply set:** orchestrator 单次遍历，把所有累积在 Apply-set 中的 finding 的 `suggested_fix` 应用于文档。Document edits 通过平台 edit tool inline 发生；ce-doc-review 没有 batch-fixer subagent（按 scope boundary），由 orchestrator 直接执行 edits，因为文档的 `gated_auto` 和 `manual` fixes 都是单文件 markdown changes，没有跨文件 dependencies。**Defensive no-fix check:** dispatch 每个 Apply-set entry 的 edit 前，验证 merged finding 带有 `suggested_fix`。如果没有（decision-time no-fix guard 理应阻止这种情况，但这里作为 defensive fallback），跳过 edit，在 completion report 的 failure section 中记录该 finding，reason 为 `Apply skipped — no suggested_fix available`，然后继续 batch。不要因为一个 Apply-set entry 缺少 fix 就让整个 pass 失败。
2. **Defer set:** 已在 walk-through 期间通过 `references/open-questions-defer.md` inline 执行。这里不需要 dispatch。
3. **Skip（跳过）：** no-op。

execution 完成后（或 `Auto-resolve with best judgment on the rest → Cancel` 后用户逐条处理完剩余 findings，或 loop 运行完成后），输出下文定义的统一 completion report。

---

## Unified completion report（统一 completion report）

Interactive mode 的每条 terminal path 都输出相同的 completion report 结构。覆盖：

- Walk-through completed（所有 findings 已回答）
- Walk-through 通过 `Auto-resolve with best judgment on the rest → Proceed` 跳出
- Top-level best-judgment（routing option B）完成
- Top-level Append-to-Open-Questions（routing option C）完成
- `safe_auto` 后 zero findings（routing question 被跳过；completion summary 是此结构的一行退化形式）

### Minimum required fields（最低必需字段）

- **Per-finding entries:** for every finding the flow touched, a line with — at minimum — title, severity, the action taken (Applied / Deferred / Skipped / Acknowledged / Withdrawn), the append location for Deferred entries, a one-line reason for Skipped entries (grounded in the finding's confidence anchor or the one-line `why_it_matters` snippet), the acknowledgement reason for Acknowledged entries (e.g., `Apply picked but no suggested_fix available`), and for Withdrawn entries the decision that retired them (e.g., `Resolved by the applied fix on "Scope Boundaries"`).
- **Summary counts by action:** totals per bucket (e.g., `4 applied, 2 deferred, 2 skipped`). Include an `acknowledged` count when any entries land in that bucket; omit the label when the count is zero.
- **Failures called out explicitly:** any Apply that failed (e.g., document write error, or the defensive no-fix fallback skipping an Apply-set entry), any Open-Questions append that failed. Failures surface above the per-finding list so they are not missed.
- **End-of-review verdict:** carried over from Phase 4's Coverage section.

### Report ordering（报告排序）

Failures first (above the per-finding list), then per-finding entries grouped by action bucket in the order `Applied / Deferred / Skipped / Acknowledged / Withdrawn`, then summary counts, then Coverage (FYI observations, residual concerns), then the verdict. Omit any bucket whose count is zero.

### Zero-findings degenerate case（零 finding 退化情况）

当 routing question 因为 `safe_auto` 后没有 confidence anchor `75` 或 `100` 的 `gated_auto` / `manual` findings 而被跳过时，completion report 收缩为 summary-counts + verdict 形式，并增加一行：应用的 `safe_auto` fixes 数量。summary wording：

没有 FYI 或 residual concerns：

```
All findings resolved — 3 fixes applied.

Verdict: Ready.
```

仍有 FYI 或 residual concerns：

```
All actionable findings resolved — 3 fixes applied. (2 FYI observations, 1 residual concern remain in the report.)

Verdict: Ready.
```

---

## Execution posture（执行姿态）

walk-through 对 project 来说在操作姿态上是 read-only，只有三类允许写入：in-memory Apply set / decision list（由 orchestrator 管理）、in-doc Open Questions appends（由 `references/open-questions-defer.md` 管理的外部 side effects），以及 end-of-walk-through batch document edits（orchestrator 的最终 Apply pass）。Persona agents 始终 strictly read-only。不同于 `ce-code-review`，这里没有 fixer subagent；orchestrator 直接拥有 document edit。
