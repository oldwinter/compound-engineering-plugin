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

**如果保持原样**

{一句话说明具体的 downstream cost}

{Conflict-context line, when applicable — see below}
```

Substitutions（替换规则）：

- **`{plain-English title}`** — 适合作为 heading 的 3-8 个词摘要。它从 merged finding 的 `title` 字段派生，但要重述为可观察后果（例如 "Implementers will pick different tiers"，而不是 "Section X-Y lists four tiers"）。对 document-review findings 来说，可观察后果是对 *reader、implementer 或 downstream decision* 的影响，而不是 runtime behavior。
- **`{section}`** — 来自 finding 的 `section` 字段。
- **不透明 identifiers** — 任何需要用户打开文档或代码才能理解的 token，首次出现时都要附上简短的 plain-language handle。这既包括文档定义的 IDs（`R6`、`U3`、`KTD2`），也包括文档碰巧提到的 implementation identifiers，例如 functions、files、variables，以及 `run_codex_cmd`、`$PEERLOG`、`peer-job-runner.py` 这类行引用。首次出现时解释每个 identifier（例如 `R6 (suppress peer panels on low-stakes calls)`）；绝不能让 bare identifier 成为 block 中对其含义的唯一说明。保留 ID 本身：它为编辑文档的人定位 finding；同一 block 后续提及可保持 bare，以便扫描。从已经在 context 中的文档查找 handle；finding 字段只携带 bare ID，不提供 handle。此规则适用于 `{section}` 和下方 body fields；它是“字段按原样渲染”唯一且狭窄的例外：首次出现时解释 identifier，周边 prose 保持不变。遵循 `references/synthesis-and-presentation.md` 的 self-contained-rendered-lines rule，并遵守下方 code-span budget。
- **`why_it_matters`** — 来自 merged finding 的 `why_it_matters` 字段，使用与下方 `suggested_fix` 相同的 altitude 上限。规则：
  - **第一句说明后果，且完全不含 identifier。** 说明什么会出错、影响谁。只粗读过文档一次的读者也必须无需查找就能判断。
  - **最多再用两句说明 mechanism**，并按上述 identifier 规则加以解释。Mechanism 说明问题如何产生；它是支撑细节，不是 finding 本身。
  - **其余内容都是用户可以另行询问的细节。** 如果 merged field 还包含 file-level tracing、multi-hop interactions、competing call paths 等内容，把它们压缩掉，并加一句结尾提示可进一步提供（例如 `如果需要 call-path 细节，可以索取 trace。`）。默认不要输出。跨数段追踪内部机制不会让 block 更严谨，只会把阅读成本转嫁给比 review 更缺少文档 context 的用户，而这正是此 walk-through 要解决的问题。
- **`suggested_fix`** — 来自 merged finding 的 `suggested_fix` 字段。渲染为描述 intent 的 prose，不要使用 raw markup。用户的任务是信任或拒绝 action，不需要审查 exact text。规则：
  - **默认用一句话描述效果。** fix 达成什么，位于哪里？优先使用 intent language，而不是 quoted text。
    - Good：`从 enum 中删除 Advisory tier；advisory-style findings 在 presentation layer 的 FYI subsection 中展示。`
    - Good：`添加 deployment-ordering constraint，要求 Units 3 和 4 位于单个 commit。`
    - Bad：`Change "autofix_class: [auto, gated_auto, advisory, present]" to "autofix_class: [safe_auto, gated_auto, manual]" in findings-schema.json on line 48.` — 对 decision loop 而言过于关注 syntax
  - **Code-span budget** — 每句最多 2 个 inline backtick spans，每个 span 只能是单个 identifier、flag 或短语（例如 `` `safe_auto` ``、`` `<work-context>` ``）。每个 backtick span 前后始终保留空格。
  - **Raw code blocks** — 仅用于短小（≤5 行）、真正 additive 且没有 before-state 的内容。超过 5 行时改用 summary。
  - **禁止 diff blocks。** Document mutations 渲染为 prose。
- **`如果保持原样`** — 用一句话指出不采取 action 的具体 downstream cost：什么会在何时为谁出错。这是用户没有像 review 一样深入阅读文档时作出决策的依据，因此必须能够独立判断：不能含有需要查找的 identifier，也不能诉诸只有 reviewer 能验证的 claim。如果实际成本很小或只是推测，就直说，不要夸大。
- **Conflict-context line（如适用）** — 当 contributing personas 对此 finding 暗示不同 actions，且 synthesis step 3.6 已打破平局时，简要展示。例如：`Coherence recommends Apply; scope-guardian recommends Skip. Agent's recommendation: Skip.` orchestrator 的 recommendation，也就是 post-tie-break value，才是菜单中标为 "recommended" 的内容。

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

## 撤回已被用户先前回答解决的 findings

先前 decisions 会把信息向后传递。Apply 只暂存 fix，直到 walk-through 结束才执行，因此后续 findings 仍以编辑前文档为依据展示。Skip 和 Defer 会确定一个 premise。Freeform text、`Other` 回答或逐选项 notes 可能陈述文档未写明的事实；下方 no-freeform-authoring rule 禁止用户手写 *fix*，并不禁止提供信息。

Synthesis 的 premise chains（step 3.5c）不覆盖此情况：它们基于 rejection test 构建，所以 Apply 不会按上方 "Cascading root decisions" 级联。

**轮到某个 finding 时，以用户截至当时说过的全部内容判断它。** 如果先前回答已经解决或否定了它，不要渲染 terminal block，也不要提出它的问题。用简洁、面向用户的直白语言说明该 finding 是什么，以及哪个先前回答已经确定它；信息要足以让用户判断它已被处理而非丢失，并能在 agent 理解有误时提出异议。遵循上方 "Confirmation between findings" 的单行形式。然后进入下一个 finding；如果没有剩余 finding，则进入 completion report。

采用惰性评估：只在原本要展示 finding 时判断，不要在每次回答后向前扫描全部 findings。

**Cascade opt-out 优先。** 如果用户在 root 的 cascade prompt（见上方 "Cascading root decisions"）中选择 `Decide each dependent individually`，不要仅依据 root decision 自动撤回该 root 的 dependents；用户已经明确要求逐个查看，而 dependent 的 premise 因 root 被拒绝而消失，正是其 opt-out 拒绝的 cascade。为这些 dependents 分别提供 walk-through entries。另一个先前回答仍可能撤回其中某项；只有用户选择退出 cascade 的那个 root 不能作为触发器。

在 decision list 中把每项记录为 `withdrawn`，并注明由哪个 decision 使其退出。Withdrawn 是独立的 completion-report bucket。**只有当用户 decision 持久确定了它时**，它才作为 rejected-class decision 与 Skip、Defer、Acknowledge 一起传入 decision primer：即已经确定的 premise（Skip/Defer）或用户陈述的事实。这些都代表用户判断该 finding 无需 action；由于文档本身没有变化，R29 应阻止在 round N+1 再次提出。

**由 Apply 触发的 withdrawal 绝不作为 rejected-class 向后传递。** 它只是对暂存 fix 将解决 finding 的*预测*，并非用户判断该 finding 无需处理。Apply 只在 walk-through 结束时运行；它是否落地不确定，落地也不能证明语义问题已解决。它可能直接失败，也可能落在错误位置，使 withdrawn finding 的 evidence 完全未变（R30 验证的是 applied fix 自身的 fingerprint，不是 withdrawn finding）。因此检查应由 round N+1 re-synthesis 而非 R29 完成：如果 fix 真正解决了 finding，fresh personas 不会针对编辑后的文档重新生成它；如果没有解决，无论 Apply 失败还是落地无效，finding 都会重新展示给用户，而不是被静默抑制。如果这种 Apply 在执行中直接失败（write error 或 defensive no-fix fallback），还要在 completion report 的 failure section 中列出其已撤销的 withdrawals，标明它们重新进入 scope，让用户在当前 run 就能看到，而不必等到下一 round。

---

## Override rule（覆盖规则）

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

- **Per-finding entries：** flow 触达的每个 finding 至少有一行，包含 title、severity、采取的 action（Applied / Deferred / Skipped / Acknowledged / Withdrawn）、Deferred entries 的 append location、Skipped entries 的单行 reason（基于 finding 的 confidence anchor 或单行 `why_it_matters` snippet）、Acknowledged entries 的 acknowledgement reason（例如 `Apply picked but no suggested_fix available`），以及 Withdrawn entries 被哪个 decision 撤回（例如 `Resolved by the applied fix on "Scope Boundaries"`）。
- **按 action 汇总数量：** 每个 bucket 的 totals（例如 `4 applied, 2 deferred, 2 skipped`）。有 entries 进入 `acknowledged` bucket 时包含该数量；为零时省略 label。
- **明确列出 failures：** 任何失败的 Apply（例如 document write error，或 defensive no-fix fallback 跳过 Apply-set entry）、任何 Open-Questions append 失败。Failures 放在 per-finding list 上方，以免遗漏。
- **End-of-review verdict：** 沿用 Phase 4 Coverage section 的 verdict。

### Report ordering（报告排序）

Failures 最先展示（在 per-finding list 上方），随后 per-finding entries 按 action bucket 分组，顺序为 `Applied / Deferred / Skipped / Acknowledged / Withdrawn`，然后是 summary counts、Coverage（FYI observations、residual concerns）和 verdict。省略 count 为零的 bucket。

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
