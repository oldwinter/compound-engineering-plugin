---
date: 2026-04-18
topic: ce-doc-review-autofix-and-interaction
---

# ce-doc-review Autofix 与交互机制重构

## 问题框架

`ce-doc-review` 持续产生痛苦的 reviews。它将太多 findings 标为 "requires judgment"，即使存在一个合理 fix；它会对 low-confidence items nitpick；并把一堵 prose 丢给用户，只有两个 terminal options："refine and re-review" 或 "review complete"。interaction model 落后于 `ce-code-review` 现在提供的能力（见 PR #590）：per-finding walk-through、LFG、bulk preview、tracker defer，以及 recommendation-stable routing question。

一次真实 plan document review 产生了 **14 个 findings，全部 route 到 "needs judgment"**，其中包括五个 confidence 0.55-0.68 的 P3 findings、三个 competent implementer 会独立得出的 concrete mechanical fixes，以及一个不需要 decision 的 subjective filename-symmetry observation。用户必须解析 14 个 prose blocks、选择答案，然后无论 edits 实际变化多小，都被迫进入 re-review。

gap 是结构性的，并对应四个 observable failure modes：

1. **Classification binary 且 coarse。** `autofix_class` 只有 `auto` 或 `present`。没有 `gated_auto` tier（concrete fix，minor sign-off），也没有 `advisory` tier（report-only FYI）。任何不是“一个 clear correct fix 且 zero judgment”的内容都会变成 `present`，把 high-stakes strategic decisions 与 small mechanical follow-ups 混在一起。
2. **Confidence gate flat 且过低。** 所有 severities 共用 0.50 threshold，会让 borderline P3s 通过。`ce-code-review` 已改为 0.60，并且只有 P0 可在 0.50+ 存活。
3. **"Reasonable alternative" test 过于宽松。** Persona reviewers 会列出 `(a) / (b) / (c)` fix options，其中 (b) 和 (c) 是 strawmen（"accept the regression," "document in release notes," "do nothing"）。classification rule 将这些读作多个 reasonable fixes，并 route 到 `present`，但实际上只有 (a) 是真实 option。
4. **Subagent framing 和 interaction model 仍停留在 pre-PR-590。** 没有 observable-behavior-first framing guidance，没有 walk-through，没有 bulk preview，没有 per-severity confidence calibration，没有 post-fix "apply and proceed" exit；每条处理 findings 的路径都强制 re-review，即使用户已经完成。

## 需求

**Classification tiers（分类层级）**

- R1. `autofix_class` 从两个 values 扩展为四个：`auto`、`gated_auto`、`advisory`、`present`。Values 保留现有 "is there one correct fix" axis，但新增：(a) concrete fixes 触及 document scope / meaning、应由用户 confirm 的 tier（`gated_auto`），以及 (b) 无需 decision 的 report-only observations tier（`advisory`）。
- R2. `auto` findings 像今天一样 silent apply。synthesis pipeline 中的 promotion rules（当前 steps 3.6 和 3.7）按下面 R4 sharpen，并将新 strictness 向前传递。
- R3. `gated_auto` findings 携带 concrete `suggested_fix` 和 user-confirmation requirement。它们进入 per-finding walk-through（R13），并将 `Apply the proposed fix` 标记为 `(recommended)`。这是 “存在 concrete fix，但它改变 document 所说内容，需要 author sign off” 的 default tier，例如添加 backward-compatibility read-fallback、要求两个 units 在一个 commit 中落地、用 framework-native API 替换 hand-rolled one。
- R4. `advisory` findings 是 report-only。它们在 final output 的 compact FYI block 中 surface，不进入 walk-through 或任何 bulk action。subjective observations（"filename asymmetry — could go either way"）、没有 actionable fixes 的 drift notes、low-stakes calibration gaps 都属于这里。
- R5. `present` findings 保留给真正 strategic / scope / prioritization decisions，其中存在多个 reasonable approaches，且正确选择依赖 reviewer 不具备的 context。

**Classification rule sharpening（分类规则收紧）**

- R6. subagent-template classification rule 添加力度："a 'do nothing / accept the defect' option is not a real alternative — it's the failure state the finding describes." 如果 primary fix 之外列出的 alternatives 只是 strawmen，则 finding 是 `auto`（或在需要 confirmation 时是 `gated_auto`），而不是 `present`。这同样适用于 "document in release notes"、"accept drift" 以及其他 sidestep actual problem 的 deferral framings。
- R7. 将 prose 中分散的 auto-promotion patterns（steps 3.6 和 3.7）整合为 explicit promotion rule set，覆盖：
  - factually incorrect behavior，且 correct behavior 可从 context 或 codebase 推导
  - 缺少已建立 implementations 的 standard security / reliability controls（HTTPS、fallback-with-deprecation-warning、input sanitization、checksum verification、private IP rejection 等）
  - cite concrete existing pattern 的 codebase-pattern-resolved fixes
  - hand-rolled implementation 重复 first-class framework behavior 时的 framework-native-API substitutions（例如 cobra 的 `Deprecated` field）
  - 由 document 自身 explicit decisions mechanically implied 的 completeness additions
- R8. subagent template 包含 framing-guidance block（从 `ce-code-review` shared template port）：observable-behavior-first phrasing、why-the-fix-works grounding、2-4 sentence budget、required-field reminder、positive/negative example pair。一个 file change，universally applied to all seven personas。

**Per-severity confidence gates（按 severity 设置 confidence gates）**

- R9. 单一 0.50 confidence gate 替换为 per-severity gates：
- P0：0.50+ 可保留
- P1：0.60+ 可保留
- P2：0.65+ 可保留
- P3：0.75+ 可保留
- R10. residual-concern promotion step（当前 step 3.4）被移除。Cross-persona agreement 改为 boost 已经 survived gate 的 findings confidence（+0.10，上限 1.0），mirror `ce-code-review` stage 5 step 4。Residual concerns 只在 Coverage 中 surface。
- R11. `advisory` findings 豁免 confidence gate；它们是 report-only，即使 confidence 较低也不会产生 false-positive work。这是 reviewer 想记录 observation 但不想 escalate 时的 safety valve。

**Interaction model（交互模型，post-fix routing）**

- R12. 在 `auto` fixes 被应用之后、任何 user interaction 之前，Interactive mode 呈现 four-option routing question，mirror `ce-code-review` post-PR-590 design：
  - (A) `Review each finding one by one — accept the recommendation or choose another action`（逐条 review finding，接受 recommendation 或选择其他 action）
  - (B) `LFG. Apply the agent's best-judgment action per finding`（LFG：按 agent 对每条 finding 的最佳判断执行 action）
  - (C) `Append findings to the doc's Open Questions section and proceed`（ce-doc-review 对 ce-code-review "file a tracker ticket" 的 analogue；对 docs 而言，"defer" 表示将 findings append 到 document 自身的 `## Deferred / Open Questions` section，而不是外部系统）
  - (D) `Report only — take no further action`（仅报告，不采取进一步 action）
  中文含义：A 逐条 review findings；B 按 agent 最佳判断处理每条 finding；C 将 findings 追加到 doc 的 Open Questions section 后继续；D 仅报告，不采取进一步 action。
  如果 `auto` pass 后没有剩余 `gated_auto` / `present` findings，则 skip routing question，并直接进入 terminal question（R19）。
- R13. Routing option A 进入 per-finding walk-through，按 severity order（P0 first）一次一个 finding 呈现。每个 per-finding question 携带：position indicator（`Finding N of M`）、severity、confidence、problem 的 plain-English statement、proposed edit，以及 grounded in document own content 或 codebase 的 short reasoning。Options：`Apply the proposed fix` / `Defer — append to the doc's Open Questions section` / `Skip — don't apply, don't append` / `LFG the rest — apply the agent's best judgment to this and remaining findings`。中文含义：应用 proposed fix / 延后并追加到 doc 的 Open Questions section / 跳过且不追加 / 对当前和剩余 findings 使用 agent 最佳判断。Advisory-only findings 将 Apply 替换为 `Acknowledge — mark as reviewed`。
- R14. Routing option B 和 walk-through `LFG the rest` 会在 selected scope 中执行 agent 的 per-finding recommended action（B 覆盖 all pending findings，walk-through 覆盖 remaining-undecided）。每个 finding 的 recommendation 由 R16 deterministic 决定。
- R15. 执行任何 bulk action 前（routing B、routing C、walk-through `LFG the rest`），compact plan preview 会按 intended action 分组 render findings（`Applying (N):`、`Appending to Open Questions (N):`、`Skipping (N):`、`Acknowledging (N):`），并给每个 finding 一行 summary。只有两个 responses：`Proceed` 或 `Cancel`。walk-through `LFG the rest` 中的 Cancel 会返回当前 finding，而不是 routing question。

**Recommendation tie-breaking（推荐冲突裁决）**

- R16. 当 merged findings 携带来自 contributing personas 的 conflicting recommendations（一个说 Apply，另一个说 Defer）时，synthesis 使用 `Skip > Defer > Apply > Acknowledge` 选择最 conservative action，使 walk-through recommendations 和 LFG behavior 跨 re-runs deterministic。

**Terminal "next step" question（终端 next-step 问题，re-review fix）**

- R17. 当前 Phase 5 binary question（`Refine — re-review` / `Review complete`）将 "apply fixes" 与 "re-review" 混进一个 option。替换为分离两个 axis 的 three-option terminal question：
  - (A) `Apply decisions and proceed to <next stage>` — 对 requirements docs，hand off 到 `ce-plan`；对 plan docs，hand off 到 `ce-work`。当 fixes 被 applied 或 decisions 已作出时，这是 default / recommended。
  - (B) `Apply decisions and re-review` — 当用户认为 edits 值得再过一遍时 opt-in re-review。
  - (C) `Exit without further action` — 用户想暂时停止。
  当 zero actionable findings remain（全部是 `auto` 或 `advisory`）时，omit option B；没有内容可 re-examine 时 re-review 无用。
- R18. terminal question 与 mid-flow routing question（R12）不同。routing question 选择*如何*参与 findings；terminal question 在 engagement 完成后选择*下一步做什么*。二者分别询问，不合并。
- R19. zero-findings degenerate case（`auto` pass 后无 `gated_auto` / `present` findings）完全 skip routing question，并直接进入 terminal question，option B suppressed。

**In-doc deferral（文档内 defer，Defer analogue）**

- R20. Document-review 的 `Defer` action 将 deferred finding append 到被 review document 末尾的 `## Deferred / Open Questions` section。如果 heading 不存在，review 中第一次 defer 时创建。单次 review 的多个 deferred findings 累积在同一个 timestamped subsection 下（例如 `### From 2026-04-18 review`），以便区分 sequential reviews。这用 document-native analogue 替代 `ce-code-review` 的 tracker-ticket mechanic：deferred findings 留在它们来源的 document 上。
- R21. 每个 deferred finding 的 appended entry 包含：title、severity、reviewer attribution、confidence 和 `why_it_matters` framing；足够让 later reader 无需 re-running review 就理解 concern。entry 不包含 `suggested_fix` 或 `evidence`，这些存在 review run artifact 中，可按需查找。
- R22. append 失败时（document read-only、path issue、write failure），agent inline surface failure，并提供 retry、fall back 到只在 completion report 中记录 deferral，或将 finding 转为 Skip。Silent failure 不可接受。

**Reviewer output 中的 framing quality**

- R23. 每个描述 finding 的 user-facing surface，包括 walk-through questions、LFG completion reports、Open Questions entries，都用 plain English 解释 problem 和 fix。framing 以 issue 的 *observable consequence* 开头（implementer、reader 或 downstream caller 会看到什么），而不是 document structural phrasing。
- R24. framing 解释 *why the fix works*，而不只是它改变什么。当 document 或 codebase 中存在 pattern 时，reference 它以 grounded recommendation。
- R25. framing tight，大约两到四句。更长 framing 是 regression。

**Cross-cutting（横切事项）**

- R26. Tool-loading pre-flight mirror `ce-code-review`：在 Claude Code 上，Interactive mode 开始时通过 `ToolSearch`（`select:AskUserQuestion`）pre-load 一次 `AskUserQuestion`，而不是每个 question lazy load。numbered-list text fallback 只在 `ToolSearch` 显式返回 no match 或 tool call errors 时适用。
- R27. Headless mode behavior 保留。`mode:headless` 继续 silent apply `auto` fixes，并将所有其他 findings 作为 structured text 返回 caller。caller owns routing。新 tiers（`gated_auto`、`advisory`）必须在 headless output 中 distinct 出现，让 callers 可适当 route。

**Multi-round decision memory（多轮 decision memory）**

- R28. 第一轮后的每个 review round 都向每个 persona 传递 cumulative decision primer，携带当前 interactive session 中所有 prior rounds 的 decisions：rejected findings（任何 prior round 中的 Skipped / Deferred），带 title、evidence quote 和 rejection reason；以及任何 prior round 中的 Applied findings，带 title 和 section reference。Personas 仍接收完整 current document 作为 primary input。不传 diff；fixed findings 会因 evidence 不再存在而 self-suppress，regressions 会作为 current doc 上的 normal findings surface，rejected findings 按 R29 suppression rule 处理。
- R29. Personas 不得重新提出任何与 prior round rejected finding title 和 evidence pattern-match 的 finding，除非 current document state 使 concern materially different。orchestrator drop 任何违反该 rule 的 finding，并在 Coverage 中记录 drop。
- R30. 对每个 prior-round Applied finding，synthesis 通过检查该 finding 描述的 specific issue 是否不再出现在 referenced section，确认 fix landed。如果 persona 在同一位置重新 surface 同一 finding，synthesis 在 final report 中将其 flag 为 "fix did not land"，而不是当作新 finding。

**Institutional memory（组织记忆，learnings-researcher integration）**

- R31. `ce-doc-review` 始终 dispatch `research:ce-learnings-researcher`，与 coherence-reviewer 和 feasibility-reviewer 并行。agent 自己负责 `docs/solutions/` empty 或 absent 时的 fast-exit；orchestrator 不做 activation-gating。
- R32. orchestrator 在 Phase 1 classify-and-select step 中生成 compressed search seed：document type、从 doc 提取的 3-5 topic keywords、named entities（tools、frameworks、patterns explicitly named），以及 doc top-level decision points。Learnings-researcher 接收 search seed 加 document path，而不是 full document content。它先按 frontmatter metadata 搜索 `docs/solutions/`，再 selective read matching solution bodies。
- R33. Learnings-researcher 对每个 match 返回：solution doc path、one-line relevance reason，以及 doc under review 中与 past solution 相关的 specific claim。只有当 match 被 promoted into finding 时，其他 personas 或 orchestrator 才按需加载 full solution content。Results capped at small N（默认 5）most relevant matches；past-solution volume 不是目标，directly applicable grounding 才是。
- R34. Learnings-researcher output 在 review output 的 dedicated "Past Solutions" section 中 surface。Entries 默认是 `advisory` tier（report-only grounding），除非 past solution 直接 contradicts document under review 中的 specific claim，此时它们 promote 到 `gated_auto` 或 `present`，并以 past solution path 作为 evidence。
- R35. Learnings-researcher content 不参与 confidence-gating（R9）或 cross-persona dedup（existing step 3.3）。它的角色是添加 institutional memory，而不是与 persona findings 竞争 user attention。

**learnings-researcher agent rewrite（bundled，随本次打包）**

- R36. 重写 `research:ce-learnings-researcher`，将 `docs/solutions/` corpus 视为 domain-agnostic institutional knowledge。Code bugs 只是其中一种 genre，旁边还有 skill-design patterns、workflow learnings、developer-experience discoveries、integration gotchas，以及 `ce-compound` 和 refresh counterpart 捕获的其他内容。agent 的 primary function 是 "find applicable past learnings given a work context"，不是 "find past bugs given a feature description."
- R37. agent 从 callers 接收 structured `<work-context>` input：caller 正在处理或考虑内容的短描述；从 caller work 提取的 key concepts / decisions / domains / components list；以及当 cleanly applies 时的 optional domain hint（例如 `skill-design`、`workflow`、`code-implementation`）。不需要 mode flag；context shape 适配 calling skill，而不让 agent 基于 caller identity branching。
- R38. hardcoded category-to-directory table 替换为 runtime dynamic probe `docs/solutions/`，发现 available subdirectories。Category narrowing 使用 discovered set。agent 不再假设某 repo 存在哪些 subdirectories。
- R39. Keyword extraction 处理 decision-and-approach-shape content，也处理 symptom-and-component-shape content。extraction taxonomy 从当前四个 dimensions（Module names、Technical terms、Problem indicators、Component types）扩展到 Concepts、Decisions、Approaches 和 Domains。不 privileged 任何 input shape；caller context 决定哪些 dimensions 权重更高。
- R40. Output framing 去掉 code-bug-biased phrasing（"gotchas to avoid during implementation," 以及围绕 bugs 狭义 framing 的 "prevent repeated mistakes"），改用 neutral institutional-memory framing（"applicable past learnings," "related decisions and their outcomes"）。pointer + one-line-relevance + key-insight summary format 跨所有 input genres 保留。
- R41. 仅当 `docs/solutions/patterns/critical-patterns.md` 存在时读取它。不存在时 agent 继续；该文件是 per-repo convention，不是 protocol requirement。
- R42. agent 的 Integration Points section 记录由 `/ce-plan`、`/ce-code-review`、`ce-doc-review` 以及其他受益于 institutional memory 的 skills 调用。移除暗示 planning-time 是 agent primary home 的 framing。

**Frontmatter enum expansion（bundled）**

- R43. 扩展 `ce-compound` frontmatter `problem_type` enum，添加 non-bug genre values：`architecture_pattern`、`design_pattern`、`tooling_decision`、`convention`。将 `best_practice` 记录为不被 narrower value 覆盖时的 fallback，而不是 default。迁移 8 个适合 narrower value 的现有 `best_practice` entries（3 architecture patterns、3 design patterns、1 tooling decision、1 remaining as best_practice），并将一个 `correctness-gap` schema violation（`workflow/todo-status-lifecycle.md`）解析为 valid enum value。更新 `ce-compound` 和 `ce-compound-refresh`，使它们在新 categories 适用时 steer authors toward narrower values。

## 范围边界

- 不引入 document-native tracker integration（例如 Linear / Jira / GitHub Issues）。Document-review 的 Defer analogue 是 in-doc `## Deferred / Open Questions` section。如果用户之后想为 doc findings 使用 tracker integration，那是 follow-up proposal。
- 不改变 persona selection logic。七个 personas 和 conditional personas 的 activation signals 保持不变。persona markdown files 自身只改变以吸收 subagent-template framing-guidance block。
- 不改变 headless mode 与 callers（`ce-brainstorm`、`ce-plan`）的 structural contract。Headless 继续 silent apply `auto` fixes，并返回 structured text envelope。Callers 必须更新以处理新的 `gated_auto` 和 `advisory` tiers，但 envelope shape 保持。
- 不添加 `requires_verification` field 或 in-skill fixer subagent。Document edits 在 walk-through 期间 inline 完成；没有 `ce-code-review` Step 3 fixer 的 batch-fixer analogue，因为 document fixes 在 scope 上 trivially confined（single-file markdown edits）。
- 不处理 iteration-limit guidance。现有 "after 2 refinement passes, recommend completion" heuristic 保持。
- 不跨 interactive sessions 持久化 decision primers。cumulative decision list（R28）只在单次 invocation 内跨 rounds 存于 memory。即使 prior-session decisions 已 Applied 到 document，同一 doc 的新 `ce-doc-review` invocation 也从头开始，无 carried memory。mirror `ce-code-review` walk-through state rules。
- 不构建全新 frontmatter schema。R43 添加 non-bug enum values，但不重设计 schema dimensions（不拆成 `learning_category` + `problem_type`，不新增 required fields）。现有 authoring flow 保持，只扩展 valid `problem_type` values。

## 值得点明的设计决策

- **三个新 tiers，而不是两个。** 最小 refactor 可以只添加 `gated_auto`，并把 `advisory` 继续折叠到 `present`。但真实 evidence 显示 FYI-grade findings（subjective observations、low-stakes drift notes）造成大量噪声，把它们放入 `present` 会迫使用户对不值得 decision 的内容做 decisions。将 `advisory` 作为 distinct tier 成本低（一个 enum value + 一个 output block），并显著降低 decision fatigue。
- **Strawman-aware classification rule 放在 subagent template，而不是 synthesis。** 放到 synthesis 意味着 persona reviewers 仍会 emit inflated alternative lists，orchestrator 事后 collapse。放到 subagent template 会从源头改变 reviewers produce 的内容，让 evidence 和 framing 正确同行。
- **Per-severity confidence gates，而不是 flat 0.60。** flat 0.60 仍会让 0.60-0.68 的 P3 nits 通过（附加真实 example 中有三个）。Severity-aware gates 认识到 0.65 的 P3 finding 是 noise，而 0.65 的 P1 不是，因为 P3 impact 足够低，borderline call 的 expected value 不值得用户注意力。
- **Terminal question 与 routing question 分离。** 当前 skill 将 "engage with findings" 和 "exit the review" 混进一个带两个 poorly-aligned options 的 question。拆分后，用户可以显式控制是否 re-review；这是触发本 work 的 bug report 中最常见 frustration。
- **In-doc Open Questions section 作为 Defer analogue，而不是 sibling follow-up note 或 external tracker。** Documents 不具备 code findings 那种 "handoff to a different system" shape。sibling markdown note 会 fragment context；external tracker 会增加 platform complexity，却对 document review 没有收益。把 deferred findings append 到 document 内的 `## Deferred / Open Questions` section，使 concerns 留在来源 artifact 上，自然可被任何读 doc 的人发现，并且不需要新 infrastructure。trade-off 是 deferred findings visibly mutate doc，但这正是重点："I want to remember this but not act now" 正是 planning doc 中 Open Questions section 表达的内容。
- **通过 shared subagent template 一次 port framing-guidance。** 匹配 `ce-code-review` 在 PR #590 中发布同一 fix 的方式。一个 file change，universally applied。per-persona edits 会把 scope 扩到七个 files；synthesis-time rewrite pass 会增加每次 review 的 model cost，并掩盖 persona output 本身的 root cause。
- **Classification-rule sharpening 和 promotion-pattern consolidation 与 tier expansion 一起发布。** 只发布 tiers 而不 sharpen rule，会保留 classifier behavior，只是添加没人 route 到的新 tier labels。只发布 rule 而不加 tiers，则没有 tier 可 promote findings into。
- **基本保持现有 persona markdown files 不变。** framing-guidance block 位于 wrapping 每个 persona dispatch 的 shared subagent template 中；personas 自身保留 confidence calibration、suppress conditions 和 domain focus。这样保留 persona-level failure-mode catalogs，同时升级 shared framing bar。
- **multi-round decision primer 不传 diff。** Fixed findings 会因为 evidence 从 current doc 消失而 self-suppress；regressions 会作为 normal findings surface；rejected findings 由 suppression rule（R29）处理。diff 只是 signal amplification，不是 correctness requirement，会增加 prompt weight 却不改变 agent 能做什么。
- **learnings-researcher rewrite bundled，而不是拆分。** review-time use case 如果没有 ce-doc-review 就没有 consumer，因此拆成 precursor PR 会发布 dormant feature。Bundling 让 change coherent，更容易作为一个单元 review。agent rewrite（R36-R42）和 frontmatter enum expansion（R43）也会让 `/ce-plan` 的现有 usage 受益，因此 scope investment 超出 ce-doc-review。
- **Generalize learnings-researcher，而不是用 mode flag patch。** 原提案是一个 minimal `review-time` mode flag graft 到 agent 上。但真实问题是 agent 的 taxonomy、categories 和 output framing 即使由 non-review callers 调用也呈 code-bug-shaped；plugin 已通过 `ce-compound` / `ce-compound-refresh` 捕获 non-code learnings，agent 应将它们视为 first-class。重写为 domain-agnostic institutional knowledge 是更大 change，但能移除 drift，而不是累积 special cases。
- **Expand `problem_type`，而不是引入新 orthogonal dimension。** 更干净设计可能把当前 `problem_type` 拆成 separate `learning_category`（genre）和 `problem_type`（bug-shape detail）fields。但那需要迁移每个现有 entry，并教 authors 同时选择两者。扩展现有 enum 以包含 non-bug values，可用 minimal schema churn 吸收 `best_practice` overflow，并保持 authoring flow 稳定。

## 与真实案例校准

附加 review output（14 findings，全部 `present`）在 proposed rules 下重新分类为：

- **4 `auto`**（silent applied，无 user interaction）：missing fallback-with-deprecation-warning（industry-standard pattern）、public-repo grep step（single action）、deployment-coupling-commit guarantee（mechanical）、cobra 的 native `Deprecated` field（framework-native substitution）。
- **1 `advisory`**（FYI line）：filename asymmetry，真正 ambiguous，没有 wrong answer。
- **4 `present`**（walk-through）：historical-docs rule、alias-compatibility breaking-change、escape-hatch scope decision、Unit merging decision。
- **5 dropped** by per-severity gates：五个 confidence 0.55-0.68 的 P3-P2 findings。

Net：用户看到 **4 个 decisions**，而不是 14 个。walk-through 的 `LFG the rest` escape 会进一步 bound fatigue：用户在 agent recommendations 上校准后，可以 bail 并 accept rest。
