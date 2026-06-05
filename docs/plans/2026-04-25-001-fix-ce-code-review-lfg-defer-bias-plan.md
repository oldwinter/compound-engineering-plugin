---
title: "fix: 移除 ce-code-review 中的 LFG defer-bias 和 bulk-preview gate"
type: fix
status: active
date: 2026-04-25
---

# fix: 移除 ce-code-review 中的 LFG defer-bias 和 bulk-preview gate

## 概览

修复 `plugins/compound-engineering/skills/ce-code-review/` 中 LFG path 的 defer-bias，使选择 LFG 时真的会应用 agent 能 defensibly propose 的 fixes，而不是把它们 route to ticket-filing。将 bulk-preview approval gate 替换为 "just go" execution model：选择 LFG 后立即 dispatch fixer，总结哪些被 applied、哪些无法 resolved，然后针对 leftovers 问一个 targeted question。

该 fix 由两个协同部分组成：

1. **Push personas to commit to a `suggested_fix` more aggressively**，只要 fix 可从 diff 和 surrounding code 中 reach，就应提出；这样 findings 进入 synthesis 时已经 correctly classified。只有 persona 诚实无法 propose fix 的 `manual` findings 保持 un-fixed。
2. **Drop both gates on the LFG path** -- Stage 5b validator pre-pass 和 bulk-preview approval prompt。fixer 的 success/failure 就是 validation；diff 是 audit surface；用户事后通过 diff review，而不是事前通过 preview review。

这对 option B（top-level LFG）和 walk-through 的 `LFG the rest` 是一致的。Walk-through option A 会自动继承 persona-side improvement：`manual + suggested_fix` recommends Apply，因此 per-finding recommendations 不再 punt to Defer。

---

## 问题框架

一次真实的 `/ce-code-review` run 在 13-finding branch 上选择 LFG 时，把 8 个 findings route 到 "file tickets"。用户反问（"can we not decide how to fix them all?"），随后 agent 在一轮内为所有 8 个生成了 concrete、defensible design decisions -- 没有使用 agent 已不具备的 external context。rescue prompt 暴露出：skill 应默认做这项工作，而不是等待用户 override。

两个 structural causes：

1. **`autofix_class: manual` overloaded。** Personas 将 `manual` 用于两个语义不同的情况 -- "needs design judgment but I can propose one" 和 "genuinely needs cross-team alignment." 当前 subagent template 告诉 personas `suggested_fix` optional（"a bad suggestion is worse than none"），personas 在不想 commit to a fix shape 时默认用 `manual`。Synthesis 继承了这种 punt -- Stage 5 step 6b 的 tie-break order（`Skip > Defer > Apply > Acknowledge`）把两种含义都 route to Defer。
2. **LFG path performs research before approval, then asks for approval。** Stage 5b 为每个 surviving finding dispatch validator subagent，bulk-preview render plan，然后等待 `Proceed`/`Cancel`。在 uncommitted local edits 上 -- 这正是 LFG 运行的位置 -- 这倒置了 cost calculus。reverting an applied edit 比关闭 8 个本不该 filed 的 GitHub issues 更便宜。

当前 `references/bulk-preview.md`、walk-through `LFG the rest` 和 Stage 5b validation gate 都是为了缓解 "agent might apply a wrong fix in bulk" 而构建的。它们通过增加 research 和 approval overhead 来缓解。用户的 framing 反转了 bias：在 uncommitted edits 上 trust the agent，audit via diff，只为 agent 诚实无法 resolve 的 items file tickets。

---

## 需求追踪

- R1. Personas 只要 defensible fix 可从 diff 和 surrounding code reach，就尝试 propose `suggested_fix`。没有 `suggested_fix` 的 `manual` 只保留给真正需要 cross-team input、business context 或 reviewer 在本 review 中无法完成的 research 的 findings。
- R2. Stage 5 action-derivation rule 将 `manual + suggested_fix` map 到 recommended-action Apply。没有 `suggested_fix` 的 `manual` 继续 map 到 Defer。Step 6b 的 cross-reviewer tie-break order unchanged。
- R3. LFG path -- both interactive routing option B（top-level）and walk-through 的 `LFG the rest` sub-decision within option A -- 不运行 Stage 5b validation。其他 paths（autofix、headless、walk-through option A 的 individual Defer choices 的 tracker-defer handoff、file-tickets option C）仍运行 Stage 5b。
- R4. LFG path 不 render bulk-preview approval prompt。选择 LFG 后，立即在 full pending action set（`gated_auto` + `manual` + `advisory`）上 dispatch fixer。
- R5. fixer subagent 处理 heterogeneous queue：带 concrete `suggested_fix` 的 items 被 applied；advisory items 是 no-op（recorded as acknowledged）；fix 无法 cleanly apply、cited evidence 不再 match cited location code，或完全缺少 `suggested_fix` 的 items route 到 `failed` bucket，并带 one-line reason。False-positive recognition 也通过同一个 `failed` bucket -- 不 silently filtered。用户通过 post-run question 保留是否 file/walk/ignore 的 agency。
- R6. fixer returns 后，emit unified completion report as today。当 `failed` bucket 非空时，使用 platform blocking question tool 发一个 post-run question，三个 options：为 leftovers file tickets（有 tracker sink 时）、逐个 walk through，或 ignore。
- R7. Walk-through option A 自动继承 R2 的 action-derivation change -- `manual + suggested_fix` findings recommend Apply，并在 terminal block 中显示 proposed fix。不在 `references/walkthrough.md` 中添加 separate logic。
- R8. `references/bulk-preview.md` narrowed to option C（file-tickets）only。移除 walk-through `LFG the rest` Cancel-from-preview semantics（没有 preview 可 cancel）。Option C 的 preview behavior unchanged。
- R9. `tests/review-skill-contract.test.ts` 和 `tests/pipeline-review-contract.test.ts` 更新为匹配 new flow contract，而不是保留针对 removed gates 的 assertions。

---

## 范围边界

- routing question 前的 `safe_auto -> review-fixer` automatic-fix pass unchanged。LFG 只 governing 该 pass 后 remaining 的 `gated_auto` / `manual` / `advisory` items。
- File-tickets routing（option C）unchanged -- bulk-preview 仍是其 approval surface，Stage 5b 仍在每个 pending finding 上运行后再 fire tickets。
- Autofix 和 headless modes unchanged。它们本来不运行 bulk-preview gate，并保留 Stage 5b。
- Report-only mode unchanged（report-only mode 不变）。
- 5-anchor confidence rubric、`>= 75` filter threshold（with P0 escape at 50+）、cross-reviewer promotion 和 mode-aware demotion（step 6c）unchanged。本 plan 只触及 recommended-action derivation 和 LFG dispatch path。
- 无 P0-special-case carve-out。P0 findings 与其他 severities 走同一 LFG path。uncommitted edits 上无论 severity 如何，reverts 都便宜；P0 carve-out 会破坏 "just go" promise。
- `autofix_class` 中的 `manual` vs `gated_auto` distinction 在 finding output 中保留。本 plan 不 collapse 它们 -- synthesis 仍记录 persona 当时的判断。变化发生在 recommended action 如何 derived，而不是 underlying classification。

---

## 上下文与研究

### 相关代码与模式

- `plugins/compound-engineering/skills/ce-code-review/SKILL.md` -- Stage 5 step 6b（action-derivation tie-break）、Stage 5b conditional table、Step 2 Interactive mode option B（LFG dispatch）、Step 3（fixer subagent）、Step 4（artifacts）。
- `plugins/compound-engineering/skills/ce-code-review/references/walkthrough.md` -- per-finding presentation、action options、`LFG the rest` exit path、end-of-walk-through dispatch、unified completion report。
- `plugins/compound-engineering/skills/ce-code-review/references/bulk-preview.md` -- today 的三个 call sites（B / C / walk-through `LFG the rest`）；narrowing to one（C only）。
- `plugins/compound-engineering/skills/ce-code-review/references/subagent-template.md` -- persona output contract；`suggested_fix` guidance 当前 permissive（"a bad suggestion is worse than none"）；lines 137-142 中的 `autofix_class` decision guide 将 `manual` document 为 "actionable work that requires design decisions or cross-cutting changes."
- `plugins/compound-engineering/skills/ce-code-review/references/tracker-defer.md` -- Interactive and Non-interactive execution modes；post-run failure-handling question 会在 leftover set 上复用 existing Interactive flow。
- `plugins/compound-engineering/skills/ce-code-review/references/findings-schema.json` -- `suggested_fix: ["string", "null"]`，description 为 "Concrete minimal fix. Omit or null if no good fix is obvious — a bad suggestion is worse than none."

### 组织内经验

- `docs/plans/2026-04-21-002-refactor-ce-code-review-precision-and-validation-plan.md` -- 添加 Stage 5b 作为 externalization 前的 per-finding validation gate。该 plan 的 R3 将 Stage 5b scope 到 externalizing modes；本 plan 进一步 specifically 从 LFG path 移除它。Stage 5b 的 intent（externalizing to a tracker 前 validate）对 option C 仍成立。
- `docs/plans/2026-04-17-002-feat-ce-review-interactive-judgment-plan.md` -- 引入 Interactive mode routing question、walk-through 和 bulk-preview design。
- `docs/solutions/skill-design/confidence-anchored-scoring.md` -- anchored 0/25/50/75/100 rubric；本 plan 不修改 rubric。

### 外部参考

无 -- 这是 internal skill behavior change。

---

## 关键技术决策

- **Push personas instead of bolting on a synthesis-time proposal pass。** Architecturally simpler。persona 已加载 diff 和 evidence；再次派 sub-agent 去重新推导 persona 本可 commit 的内容是 wasted work。Synthesis 保持 routing function，而不是 reasoning function。
- **`suggested_fix` becomes the authoritative signal for "agent can fix this," not `autofix_class`。** 当前 logic 仅从 `autofix_class` 推断 recommended action（它是 persona 对 handling 的 recommendation，不是 fix-availability）。之后，`manual` finding 中存在 `suggested_fix` 会升级 recommended action 到 Apply；缺失则保持 Defer。`autofix_class` 本身不 collapse -- report 仍 surface persona 的判断。
- **Drop Stage 5b on LFG, not "fold it into the fixer"。** fixer 在 applying fix（或为 `manual` propose one）时自然会 re-check each finding。fixer dispatch 前为每个 finding 运行 separate validator subagent 是 duplicate research。无法 apply 或 false-positive recognition 会在 fix attempt 中 surface。
- **No P0 carve-out for "preview-before-apply"。** LFG 是 opt-in to "agent's best judgment." 在 uncommitted edits 上 revert wrong P0 fix 的成本低于把一些 severities 重新 route through preview 而另一些不 preview 的 cognitive overhead。consistency 比 marginal safety floor 更 valuable。
- **Single fixer pass。** 当前 `max_rounds: 2` re-review loop 用于 `safe_auto` queue。LFG 运行一次，总结，退出。Re-review heavy；如果想要 follow-up pass，用户可以 re-invoke `/ce-code-review`。
- **Post-run failure-handling question scoped to the failed set only。** 当 `failed` bucket 为空（全部 applied 或 acknowledged），不触发 question -- unified completion report 是 terminal output。当非空时，options 是：file tickets for leftovers（when sink available）、walk through them、or ignore。Mirrors `tracker-defer.md` 的 sink-availability rules。

---

## 开放问题

### 规划期间已解决

- **walk-through option A 是否也应让 `manual + suggested_fix` flip to Apply？** 是 -- 用户确认 option A 也一致 flip。R2 的 action-derivation change 是 single source of truth；option A 从 synthesis 读取 recommended action，因此无需 separate walkthrough.md logic 即可发生 flip。
- **fixer 是否应扩展为对 `manual`-without-`suggested_fix` items "propose then apply"？** 否。将 proposal upstream 到 persona。如果 persona 无法 commit to a fix，finding 保持 Defer。用户明确选择该 architecture，而不是 synthesis-time second pass。
- **P0 findings 是否总是 preview，即便在 LFG 下？** 否。用户同意移除 carve-out。consistency over marginal safety；revert 是 audit surface。
- **Stage 5b 是否保留在 LFG path？** 否。用户 specifically 选择在 LFG 上 drop。Stage 5b 仍保留在 autofix、headless、file-tickets（option C）和 walk-through tracker-defer handoff。

### 延后到实现阶段

- **subagent template 中 stronger `suggested_fix` expectation 的 exact prompt wording。** implementer 应写出推动 fix 但不 inflate false-positive risk 的语言 -- existing false-positive catalog（`subagent-template.md` lines 115-126）仍作为 suppression backstop。testing 期间需要 iteration。
- **fixer's failure-reason taxonomy。** R5 要求 fixer 为每个 failed item report one-line reason。exact phrasing（如 "fix did not apply cleanly", "needs cross-team input", "finding looks false on closer review"）会影响 post-run question framing。implementation 时选择；用户已经指出这些 reasons 应足够 specific，让 post-run prompt meaningful。
- **是否在没有 bulk-preview 的情况下保留旧 `LFG the rest` Cancel-to-current-finding semantic。** walk-through `LFG the rest` 以前从 bulk-preview cancel 回 current finding。没有 preview 后，"LFG the rest" 就直接 dispatch。implementer 应与用户确认 `LFG the rest` 本身是否应有 soft "are you sure?" gate，还是完全匹配 option B 的 no-gate model。除非 review 发现 real concern，否则 default to latter（full match）。
- **U4 intent re-check 中 "evidence no longer matches code" 的 operational definition。** Options：(a) `evidence` strings 中引用的所有 identifiers 仍出现在 cited file:line；(b) line-content hash comparison within edit-distance threshold；(c) light AST-level comparison；(d) leave-it-to-the-fixer's-judgment with a clear prompt。implementation 时选择。这里的 vagueness 可以接受，因为 fixer 是 LLM agent 做 judgment call -- over-specifying risks brittleness -- 但 implementer 应在写 prompt 前 commit to clear operational definition（and reason phrase taxonomy）。

---

## 实现单元

- U1. **强化 subagent template 中 persona 对 `suggested_fix` 的预期**

**目标：** Push reviewer personas to attempt a `suggested_fix` whenever defensible from the diff and surrounding code, while preserving the existing false-positive backstop. Reserve `manual` without `suggested_fix` for findings that genuinely require cross-team input, business context, or research outside the review.

**需求：** R1.

**依赖：** 无。

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-code-review/references/subagent-template.md`
- 修改: `plugins/compound-engineering/skills/ce-code-review/references/findings-schema.json`（tighten `suggested_fix` description；field 仍是 `["string", "null"]`）

**做法：**
- 将当前 "suggested_fix is optional. Only include it when the fix is obvious and correct. A bad suggestion is worse than none." 替换为 stronger guidance：当 fix reachable from the diff and surrounding code 时，propose one。只有 finding genuinely needs cross-team alignment、business context 或 research outside this review 时 omit。
- 更新 `autofix_class` decision guide，说明 persona 能基于 context defend a fix 时，`manual` 应 paired with `suggested_fix`；omitting `suggested_fix` on `manual` 是该 finding genuinely needs handoff 的 signal。
- tighten schema 的 `suggested_fix` description：强调 omission 意味着 "I genuinely cannot propose a fix from review context"，而不是 "I'd rather not commit."
- Preserve existing false-positive catalog（`subagent-template.md` lines 115-126）unchanged。catalog 是 suppression backstop；此 change 只影响 non-suppressed `manual` findings 如何 present。

**遵循的模式：** Existing decision guide format in `subagent-template.md` lines 137-142。保持 imperative voice 和 concrete-example style。

**测试场景：**
- *Happy path:* persona review 一个 clear ownership-check gap 的 diff，会生成 `autofix_class: manual`，并带 concrete `suggested_fix`，引用 sibling controller 中 existing pattern。
- *Edge case:* persona review 一个添加 unbounded query 的 diff，生成 `autofix_class: manual`，但没有 `suggested_fix`，因为 pagination strategy depends on call-site knowledge the reviewer does not have。
- *Edge case:* false-positive catalog 仍 suppress lint-comment-suppressed findings，即使 fix reachable。
- *Integration:* Updated subagent template is loaded by Stage 4 spawning logic，并且 change reaches persona prompts（template variable substitution 不 break）。

**验证：** Spot-check updated template against existing persona files in `plugins/compound-engineering/agents/`，确认没有 persona 依赖旧 `suggested_fix is optional` wording 而与 strengthened guidance 冲突。schema validation tests 应在 description-only change 后仍 pass。

---

- U2. **更新 `manual + suggested_fix` 的 Stage 5 action-derivation rule**

**目标：** 让 recommended-action mapping 把 `suggested_fix` 视为 "agent can apply this" 的 authoritative signal。`manual + suggested_fix` recommends Apply；没有 `suggested_fix` 的 `manual` recommends Defer。Walk-through option A 和 LFG path 都通过 existing recommended-action surface 继承这一点。

**需求：** R2, R7.

**依赖：** 无（可与 U1 并行；U1 让 Apply path 更常 fire）。

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-code-review/SKILL.md`（Stage 5 step 6b，以及任何记录 recommended-action mapping 的位置）

**做法：**
- 更新 step 6b，明确 recommended-action mapping：
  - `safe_auto` -> Apply（routing question 前已经 auto-applied；不 surface to LFG）
  - `gated_auto` with `suggested_fix` -> Apply
  - `manual` with `suggested_fix` -> **Apply**（was Defer）
  - `manual` without `suggested_fix` -> Defer
  - `advisory` -> Acknowledge
- Cross-reviewer tie-break order（`Skip > Defer > Apply > Acknowledge`）unchanged。它只在 reviewers disagree on action 时 fire；上面的 per-finding mapping 是 single-reviewer default。
- 更新 `SKILL.md` 其他任何断言 "manual implies Defer" 但未 qualified by `suggested_fix` presence 的 prose。

**遵循的模式：** Existing step 6b structure。保持 same mapping-table/prose hybrid format。

**测试场景：**
- *Happy path:* populated `suggested_fix` 的 `manual` finding 在 synthesized findings table 中 maps to recommended Apply。
- *Happy path:* `suggested_fix: null` 的 `manual` finding maps to recommended Defer。
- *Edge case:* `suggested_fix: ""`（empty string）的 `manual` finding treated as "no suggestion" and maps to Defer。
- *Integration:* Walk-through option A 的 terminal block 在 upgraded recommendation fire 时正确 render proposed fix。

**验证：** 在纸面上 trace sample synthesized finding set through Stage 5/6 flow -- `manual + suggested_fix` items 应出现在 Stage 6 findings table 的 Apply-recommended bucket 中，walk-through stem 应 phrased as "Apply the …?" 而不是 "Defer …?"。

---

- U3. **移除 LFG path 上的 Stage 5b 和 bulk-preview gates**

**目标：** 从 interactive option B 和 walk-through `LFG the rest` 中移除 validator-pre-pass 和 approval-prompt gates。其他 paths（autofix、headless、option C、walk-through tracker-defer handoff）保留 Stage 5b。

**需求：** R3, R4, R8.

**依赖：** U1, U2（只有当 `manual` findings 已由 `suggested_fix` 正确分类时，gate removal 才 safe）。

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-code-review/SKILL.md`（Stage 5b conditional table；Step 2 Interactive mode option B handler）
- 修改: `plugins/compound-engineering/skills/ce-code-review/references/bulk-preview.md`（将 scope 收窄到 option C only）
- 修改: `plugins/compound-engineering/skills/ce-code-review/references/walkthrough.md`（移除 `LFG the rest` -> bulk-preview path；更新 Cancel semantics）

**做法：**
- Stage 5b conditional table：将 `interactive, LFG routing (option B)` 和 `interactive, walk-through routing (option A) — LFG-the-rest handoff` rows 从 "Yes" 改为 "No"。Keep all other rows unchanged。
- Step 2 Interactive option B handler：改写为立即在 full pending action set（`gated_auto` + `manual` + `advisory`）上 dispatch fixer。移除 "first run Stage 5b validation" preamble 和 "load `references/bulk-preview.md`" instruction。
- `bulk-preview.md`：将 "When the preview fires" section narrow to option C only。移除 call sites 1 and 3（routing option B and walk-through `LFG the rest`）。调整 Scope summary wording、Cancel semantics 和 edge cases sections 以匹配唯一 remaining caller。
- `walkthrough.md` `LFG the rest` flow：用对（current finding + remaining undecided）set 的 direct fixer dispatch 替换 bulk-preview dispatch。移除 "Cancel returns to current finding" semantic -- 没有 preview 可 cancel。若 unified completion report description 引用 bulk-preview-specific behavior，也一并更新。

**遵循的模式：** Existing autofix and headless dispatch patterns in Step 2 -- 它们已经直接 dispatch fixer without preview。option B mirror that shape。

**测试场景：**
- *Happy path:* 用户选择 option B with 8 pending findings；fixer immediately dispatched，无 `Proceed`/`Cancel` prompt。
- *Edge case:* 用户在 walk-through option A 中已经回答 3 个 findings，对 remaining 5 个选择 `LFG the rest`；fixer dispatches on those 5 plus current finding，无 preview。
- *Edge case:* 用户选择 option C with 8 pending findings；Stage 5b runs as before，bulk-preview renders，`Proceed`/`Cancel` fires（option C unchanged）。
- *Integration:* Stage 5b conditional table parsing in tests 仍正确解析 non-LFG paths。

**验证：** 像实际运行一样读 updated SKILL.md 和 walkthrough.md 中的 Step 2 option B 与 `LFG the rest` -- 从 "user picks LFG" 到 "fixer dispatches" 应有 zero blocking prompts。Option C should still show a preview。

---

- U4. **扩展 LFG heterogeneous queue 的 fixer subagent contract**

**目标：** fixer 接受包含 `gated_auto`（with `suggested_fix`）、`manual`（with `suggested_fix`）和 `advisory` items 的 queue。它应用 concrete fixes、对 advisory no-op，并把 fix 不能 cleanly apply 的 items route 到 `failed` bucket，附 one-line reason。向 orchestrator 返回 partition `{applied, failed, advisory}`。

**需求：** R5, R6.

**依赖：** U3（fixer 只在 LFG path 通过 expanded contract invoke；option C 仍 files tickets，不 invoke fixer）。

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-code-review/SKILL.md`（Step 3 fixer subagent description，包括 queue contract 和 return shape）

**做法：**
- 在 Step 3 中 document heterogeneous queue contract：每个 item carries `autofix_class`、`suggested_fix`、`severity`、`file:line`、`title`、`why_it_matters` 和 `evidence`。fixer 逐个处理：
  - For items with `suggested_fix`：attempt to apply the fix。clean application 后 add to `applied`。failure（line moved、conflicting edit、syntax issue 或任何其他 apply-time failure）则 add to `failed` with reason。
  - For `advisory`（对于 `advisory`）：no-op；add to `advisory`（recorded as acknowledged）。
  - For items without `suggested_fix` that somehow reach the queue：route to `failed`，reason "no fix proposed by reviewer." 在 new flow 下应罕见，但这是 safety net。
- fixer 在 applying 前也 performs a light intent re-check -- confirm cited code at cited file:line still resembles persona evidence。如果 substantially changed（diff 已经 moved on、line deleted 等），route to `failed`，reason "evidence no longer matches code."
- Return shape：structured object，列出每个 finding 的 outcome and reason。orchestrator 由此 assemble unified completion report，并计算是否触发 post-run question（R6）。
- Single pass -- LFG path 不运行 `max_rounds: 2` re-review loop。fixer returns 后 emit report。
- `requires_verification: true` items 仍在 apply 后 trigger targeted verification，same as today's safe_auto fixer。

**遵循的模式：** Existing Step 3 contract for the safe_auto fixer。Extend rather than rewrite。

**测试场景：**
- *Happy path:* queue 包含 5 个 `gated_auto` 和 3 个 `manual` items，全部带 `suggested_fix`；fixer applies all 8，返回 `applied: 8, failed: 0, advisory: 0`。
- *Edge case:* queue 包含 1 个 advisory item；fixer no-op，并将其返回到 `advisory` 而不是 `failed`。
- *Edge case:* 某个 item 的 `suggested_fix` 无法 cleanly apply，因为 cited line 已在同一 pass 的 earlier fix 中变化；fixer 将该 item route 到 `failed`，reason 为 "evidence no longer matches code" 或 "fix did not apply cleanly."
- *Edge case:* queue 包含没有 `suggested_fix` 的 `manual` finding（defensive case）；fixer route 到 `failed`，reason 为 "no fix proposed by reviewer."
- *Error path:* fixer subagent mid-pass 死掉（timeout, dispatch error）；orchestrator 捕获 partial state -- 标记为 `applied` 的 items 保持 applied，其余全部 route 到 `failed`，reason 为 "fixer dispatch failed."
- *Integration:* `requires_verification: true` items 在 apply 后运行 targeted verification；verification failure 将 item route 到 `failed`，reason 命名 failed verification。

**验证：** Trace a synthetic queue through the new contract on paper。Check that returned partition cleanly drives unified completion report，and post-run question fires only when `failed` is non-empty。

---

- U5. **在 LFG path 添加 post-run failure-handling question**

**目标：** fixer returns 后，当 `failed` bucket 非空时，通过 platform blocking question tool 发一个 question，三个 options：为 leftovers file tickets、逐个 walk through，或 ignore。`tracker-defer.md` 中的 sink-availability rules 决定是否出现 file-tickets option。

**需求：** R6.

**依赖：** U4（question gated on fixer's `failed` return）。

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-code-review/SKILL.md`（Step 2 Interactive mode option B handler，在 fixer return 后）

**做法：**
- fixer returns 且 unified completion report assembled 后，检查 `failed` 是否非空。如果为空，emit report，并按 existing fixes_applied_count gating rule fall through to Step 5。
- 如果非空，通过 platform blocking question tool 发一个 question（Claude Code 中 `AskUserQuestion` with existing pre-load step；Codex 中 `request_user_input`；Gemini 中 `ask_user`；Pi 中 `ask_user` via `pi-ask-user`）。Stem: `N findings could not be auto-resolved. What should the agent do with them?`
- Options（选项）：
  - File tickets for these（当 cached tracker-detection tuple 中 `any_sink_available: true` 时）
  - Walk through these one at a time（逐个 walkthrough）
  - Ignore -- leave them in the report（忽略，保留在 report 中）
- Sink-omission：当 `any_sink_available: false` 时，omit file-tickets option，并在 stem 追加一行解释原因（mirrors routing-question stem behavior at top of Step 2 today）。
- Dispatch on selection（按选择 dispatch）：
  - File tickets：将 failed set route through `tracker-defer.md` Interactive mode（option C 使用的 existing flow）。这里无 bulk-preview -- failures 已经发生，这只是 durable filing。
  - Walk through：re-enter walk-through loop scoped to failed set。每个 finding 的 recommended action 通过 U2 中 standard rule recomputed：
    - 有 `suggested_fix` 的 items（fix existed but did not apply cleanly，or evidence-match check failed）：recommend Apply。如果用户 picks Apply，finding joins in-memory Apply set，并由 standard end-of-walk-through fixer dispatch 处理。这是针对 small Apply set 的 *focused* fixer pass -- 不同于 original single-pass LFG dispatch，且不违反 LFG single-pass guarantee。
    - 没有 `suggested_fix` 的 items（no fix proposed，or filtered as false positive）：recommend Defer。Apply 不提供；menu 是 Defer / Skip / `LFG the rest`。
  这个 re-entry path 使用 `walkthrough.md` 中 existing per-finding question logic -- 没有新的 walk-through behavior，只是 scope set 不同。
  - Ignore：emit unified completion report，并在 "Could not resolve" section 下包含 failed list。
- 当 harness lacks blocking tool 时，使用 numbered-list fallback，following same conventions as rest of skill。

**遵循的模式：** Existing routing-question handler at top of Step 2 Interactive mode。使用相同 option-label discipline（third-person voice, self-contained labels, label-by-letter dispatch when label varies by tracker confidence）。

**测试场景：**
- *Happy path:* failed set 有 3 个 items，tracker available；question fires with 3 options including "File tickets for these"；user picks "File tickets"，tracker-defer fires for each。
- *Edge case（边界情况）:* failed set empty；不触发 question；emit report，Step 5 gating logic 处理剩余部分。
- *Edge case:* failed set 有 5 个 items，no tracker sink available；question 只带 "Walk through" 和 "Ignore"；stem includes "no tracker sink detected."
- *Edge case（边界情况）:* user picks "Walk through" with 5 failed items；walk-through re-enters scoped to those 5，每个都用 standard per-finding flow 呈现。
- *Integration:* User picks "File tickets" 时，Stage 5b does *not* re-run on the failed set -- fixer 已尝试它们，其 state 是 ticket composition input。
- *Cross-platform:* Codex without `request_user_input` available 时，numbered-list fallback fires correctly。

**验证：** Walk the new question's three branches end-to-end on paper。Confirm sink-omission behavior matches `tracker-defer.md` existing Interactive-mode contract。Confirm question never fires when failed set empty。

---

- U6. **更新 tests 和 fixtures 以匹配新的 LFG flow contract**

**目标：** 更新 `tests/review-skill-contract.test.ts` 和 `tests/pipeline-review-contract.test.ts`，assert new LFG behavior -- fixer dispatch on selection、no bulk-preview for option B、no Stage 5b on LFG、post-run question on failed set -- 并移除 pinned removed gates 的 assertions。

**需求：** R9.

**依赖：** U3, U4, U5（tests cover these units define 的 contract）。

**文件：**
- 修改: `tests/review-skill-contract.test.ts`
- 修改: `tests/pipeline-review-contract.test.ts`
- 修改: `tests/fixtures/`（任何 assert old LFG flow output 的 fixture）

**做法：**
- Identify failing assertions：根据 `grep` results，当前 asserts 包括 `(B) `LFG.` label format（line 83）、`references/bulk-preview.md` reference（line 89）、`Stage 5b validation pass dispatches conditionally`（line 278）、`(B) `LFG.*first run Stage 5b validation`（line 304）、walkthrough.md 中 `LFG the rest` shape（pipeline-review-contract line 552）。
- 对每个决定：rewrite to assert new contract，或因 underlying mechanism gone 而 delete。
- Option B label asserts -> 保留；如果 label changes，则更新 label text。
- option B 下的 `bulk-preview.md` reference -> 移除；assert bulk-preview is referenced by option C only。
- Stage 5b conditional table parsing -> 保留，但更新 expected rows。
- `(B) ... first run Stage 5b validation` -> 删除，改为 assert option B does NOT mention Stage 5b。
- Walkthrough `LFG the rest` shape -> 更新为 assert new no-preview path。
- 为 post-run failure-handling question 添加 new assertions（presence of stem and three options in SKILL.md）。
- 添加 assertions：narrowing 后 `references/bulk-preview.md` scoped to option C only。
- 如果 sample finding sets 或 expected reports pinned old flow，更新 fixtures。

**遵循的模式：** Existing assertion style in `review-skill-contract.test.ts` -- file content reads、regex matchers for structural elements、named tests describing the contract。

**测试场景：**
- *Happy path:* Updated tests pass against modified SKILL.md、walkthrough.md 和 bulk-preview.md。
- *Regression check:* Tests for option C、autofix、headless 和 walk-through option A 继续 pass without modification（only LFG-specific tests change）。
- *Integration:* full suite 下 `bun test` passes。

**验证：** Run `bun test tests/review-skill-contract.test.ts tests/pipeline-review-contract.test.ts` and confirm updated suite passes。Run full `bun test` suite to confirm no incidental breakage。

---

## 系统级影响

- **Interaction graph:** LFG path 的 dispatch shape changes。introspect SKILL.md option B handler text 的 callers（`lfg` skill、`slfg` orchestrator）可能需要 assertions update。根据 `tests/review-skill-contract.test.ts` line 562-563，`lfg` 直接 references `tracker-defer.md`，且明确不 reference `ce-code-review/references/bulk-preview.md` -- 因此 bulk-preview narrowing 不应 break `lfg`。U6 中 verify。
- **Error propagation:** fixer 返回的新 `failed` bucket 成为 post-run question trigger。当用户选择 "File tickets" 后，新的 question 的 tracker-defer dispatch 若失败，会遵循 `tracker-defer.md` 中 existing Interactive failure path（Retry / Fall back / Convert to Skip）。
- **State lifecycle risks:** fixer applies edits without preview gating。在 uncommitted local edits 上用户可通过 `git diff` revert；在 PR-mode runs 上（fixes accumulate locally on PR branch），用户 push 前同样可 revert。No new persistent state。
- **API surface parity:** 其他 interactive-mode options（A walk-through, C file-tickets, D report-only）dispatch behavior unchanged。bulk-preview reference remains valid for option C。Tracker-defer remains valid for both option C and new post-run question。
- **Integration coverage:** Tests covering heterogeneous fixer queue、post-run question gating on `failed` non-empty、and sink-availability behavior on post-run question are net-new，需要 U6 中 real coverage。
- **Unchanged invariants:** 5-anchor confidence rubric、Stage 5 dedup/cross-reviewer-promotion/mode-aware demotion、protected-artifact rules、routing question 前的 safe_auto auto-apply pre-pass、autofix and headless mode behavior、report-only mode behavior、and Step 5 push/PR options 全部 unchanged。

---

## 风险与依赖

| 风险 | 缓解 |
|------|------------|
| Persona-side strengthening（U1）overshoots，personas 开始 propose weak fixes that fixer applies。 | Keep false-positive catalog unchanged -- it's the suppression backstop。fixer's intent re-check（U4）是第二 backstop。rollout 后用 real review runs calibrate prompt wording。 |
| Heterogeneous fixer queue（U4）有 subtle ordering issues -- applying one fix invalidates another's cited line。 | fixer's "evidence no longer matches code" check（U4）将 invalidated items route to `failed`，而不是 mis-applying。Single-pass execution avoids re-cascading edits。Order findings by file + line descending（already today's behavior），让同一文件中 earlier fixes 不会 shift 后续 line numbers。 |
| Removing Stage 5b on LFG 导致 test churn，incidental breakage `lfg`/`slfg` callers。 | U6 explicitly verifies `lfg` skill content unchanged，并 alongside update pipeline-review-contract tests。`lfg` skill already uses `tracker-defer.md` directly per existing tests。 |
| Without preview, a wrong fix lands silently and user does not notice during busy review。 | unified completion report 枚举每个 applied fix with file:line。diff 是 audit surface。用户 expected skim report and `git diff` after LFG。这是 explicit trade。 |
| Walk-through `LFG the rest` users lose "I changed my mind" Cancel path that bulk-preview offered。 | Stop-the-loop semantics still exist -- user can interrupt the agent。Cancel path 是 narrow window 中的 soft escape。如果 user feedback 显示 loss matters，future iteration 可在 LFG-the-rest dispatch 前加 one-line confirmation。Open question carried in "Deferred to Implementation." |

---

## 文档 / 运行说明

- 只有当 user-visible feature description 引用 bulk-preview gate 或 LFG 下的 Stage 5b behavior 时，才更新 `plugins/compound-engineering/README.md`。大多数 plugin README 内容停留在 agent/skill-name level，不受影响。
- No release-version bumps in this plan -- release-please owns versioning。根据 `plugins/compound-engineering/AGENTS.md`，不要 hand-edit `.claude-plugin/plugin.json` 或 marketplace files。
- implementation 后运行 `bun run release:validate`，确认 Claude/Cursor/Codex manifests 没有 parity drift。
- 如果该 fix 产出关于 persona-side-vs-synthesis-side responsibility for fix-shape commitment 的 learning，post-merge 捕获一条 `docs/solutions/skill-design/` entry。likely worth documenting，因为它 shaped U1 的 architectural choice。

---

## 来源与参考

- Origin context（来源上下文）：this conversation's exchange between user and agent on 2026-04-25，covering the LFG defer-bias diagnosis and the "just go, summarize, ask about leftovers" redesign.
- Prior plan（先前 plan）：`docs/plans/2026-04-21-002-refactor-ce-code-review-precision-and-validation-plan.md`（introduced Stage 5b）。
- Prior plan（先前 plan）：`docs/plans/2026-04-17-002-feat-ce-review-interactive-judgment-plan.md`（introduced routing question, walk-through, and bulk-preview）。
- Skill files（skill 文件）：`plugins/compound-engineering/skills/ce-code-review/SKILL.md`, `references/walkthrough.md`, `references/bulk-preview.md`, `references/subagent-template.md`, `references/findings-schema.json`, `references/tracker-defer.md`.
- Test files（test 文件）：`tests/review-skill-contract.test.ts`, `tests/pipeline-review-contract.test.ts`.
